import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { authenticateTenant } from '@/lib/auth/tenant'

interface CreateOrderRequest {
  customer: {
    phone: string
    name?: string
  }
  items: Array<{
    product_id: string
    quantity: number
  }>
}

interface CreateOrderResponse {
  success: boolean
  data?: {
    order_id: string
    total: number
    items_count: number
  }
  error?: string
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateOrderResponse>> {
  try {
    // 1. Autenticar tenant
    const auth = await authenticateTenant(request)
    
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      )
    }

    const { tenantId } = auth.tenant

    // 2. Parsear body
    const body = await request.json() as CreateOrderRequest

    // 3. Validar dados
    if (!body.customer?.phone) {
      return NextResponse.json(
        { success: false, error: 'Telefone do cliente é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pedido deve ter pelo menos 1 item' },
        { status: 400 }
      )
    }

    // 4. Buscar produtos para calcular total
    const productIds = body.items.map(item => item.product_id)
    
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, is_available')
      .eq('tenant_id', tenantId)
      .in('id', productIds)

    if (productsError) {
      throw productsError
    }

    if (!products || products.length !== productIds.length) {
      return NextResponse.json(
        { success: false, error: 'Um ou mais produtos não foram encontrados' },
        { status: 400 }
      )
    }

    // Verificar se todos estão disponíveis
    const unavailable = products.filter(p => !p.is_available)
    if (unavailable.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Produtos indisponíveis: ${unavailable.map(p => p.name).join(', ')}` 
        },
        { status: 400 }
      )
    }

    // 5. Calcular total
    const productsMap = new Map(products.map(p => [p.id, p]))
    
    let totalAmount = 0
    const orderItems: Array<{
      product_id: string
      product_name: string
      product_price: number
      quantity: number
      subtotal: number
    }> = []

    for (const item of body.items) {
      const product = productsMap.get(item.product_id)
      if (!product) continue

      const subtotal = product.price * item.quantity
      totalAmount += subtotal

      orderItems.push({
        product_id: item.product_id,
        product_name: product.name,
        product_price: product.price,
        quantity: item.quantity,
        subtotal: subtotal
      })
    }

    // 6. Buscar owner do tenant para usar como created_by
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('owner_id')
      .eq('id', tenantId)
      .single()

    if (!tenant?.owner_id) {
      throw new Error('Tenant owner não encontrado')
    }

    // 7. Criar pedido
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        tenant_id: tenantId,
        status: 'pending',
        total_amount: totalAmount,
        created_by: tenant.owner_id
      })
      .select('id, total_amount')
      .single()

    if (orderError || !order) {
      console.error('❌ Erro ao criar pedido:', orderError)
      throw orderError
    }

    // 8. Criar itens do pedido
    const itemsToInsert = orderItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_price: item.product_price,
      quantity: item.quantity,
      subtotal: item.subtotal
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('❌ Erro ao criar itens:', itemsError)
      // Tentar deletar pedido criado
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    // 9. Retornar sucesso
    return NextResponse.json({
      success: true,
      data: {
        order_id: order.id,
        total: order.total_amount,
        items_count: orderItems.length
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Erro na API de pedidos:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao criar pedido'
      },
      { status: 500 }
    )
  }
}