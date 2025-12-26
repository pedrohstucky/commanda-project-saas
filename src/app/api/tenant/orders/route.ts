import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { authenticateTenant } from '@/lib/auth/tenant'

/**
 * Request body para criar pedido
 */
interface CreateOrderRequest {
  customer: {
    phone: string
    name?: string
  }
  delivery_type: 'delivery' | 'pickup'
  delivery_address?: string
  notes?: string
  items: Array<{
    product_id: string
    quantity: number
  }>
}

/**
 * Response de sucesso
 */
interface CreateOrderResponse {
  success: boolean
  data?: {
    order_id: string
    total: number
    items_count: number
    status: string
  }
  error?: string
}

/**
 * POST /api/tenant/orders
 * Cria um novo pedido
 * 
 * Usado por: n8n, integrações externas
 * Autenticação: API Key do tenant
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateOrderResponse>> {
  try {
    // 1. Autenticar tenant
    const auth = await authenticateTenant(request)
    
    if (!auth.success) {
      console.error('❌ Autenticação falhou:', auth.error)
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      )
    }

    const { tenantId } = auth.tenant
    console.log('✅ Tenant autenticado:', tenantId)

    // 2. Parsear body
    const body = await request.json() as CreateOrderRequest
    console.log('📥 Payload recebido:', JSON.stringify(body, null, 2))

    // 3. Validar dados obrigatórios
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

    if (!body.delivery_type || !['delivery', 'pickup'].includes(body.delivery_type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de entrega inválido. Use "delivery" ou "pickup"' },
        { status: 400 }
      )
    }

    // Validar endereço se for entrega
    if (body.delivery_type === 'delivery' && !body.delivery_address) {
      return NextResponse.json(
        { success: false, error: 'Endereço de entrega é obrigatório para pedidos delivery' },
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
      console.error('❌ Erro ao buscar produtos:', productsError)
      throw productsError
    }

    if (!products || products.length !== productIds.length) {
      return NextResponse.json(
        { success: false, error: 'Um ou mais produtos não foram encontrados' },
        { status: 400 }
      )
    }

    console.log(`✅ ${products.length} produto(s) encontrado(s)`)

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
      quantity: number
      product_price: number
    }> = []

    for (const item of body.items) {
      const product = productsMap.get(item.product_id)
      if (!product) continue

      const subtotal = product.price * item.quantity
      totalAmount += subtotal

      orderItems.push({
        product_id: item.product_id,
        product_price: product.price,
        quantity: item.quantity,
      })
    }

    console.log(`💰 Total calculado: R$ ${totalAmount.toFixed(2)}`)

    // 6. Buscar owner do tenant para usar como created_by
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('owner_id')
      .eq('id', tenantId)
      .single()

    if (!tenant?.owner_id) {
      console.error('❌ Tenant owner não encontrado')
      throw new Error('Tenant owner não encontrado')
    }

    // 7. Criar pedido
    const orderData = {
      tenant_id: tenantId,
      customer_name: body.customer.name || null,
      customer_phone: body.customer.phone,
      delivery_type: body.delivery_type,
      delivery_address: body.delivery_type === 'delivery' ? body.delivery_address : null,
      notes: body.notes || null,
      status: 'pending' as const,
      total_amount: totalAmount,
      created_by: tenant.owner_id
    }

    console.log('💾 Dados do pedido a serem salvos:', JSON.stringify(orderData, null, 2))

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderData)
      .select('id, customer_name, customer_phone, delivery_type, delivery_address, total_amount, status')
      .single()

    if (orderError || !order) {
      console.error('❌ Erro ao criar pedido:', orderError)
      throw orderError
    }

    console.log('✅ Pedido criado no banco:', JSON.stringify(order, null, 2))

    // 8. Criar itens do pedido (triggers preencherão product_name e subtotal)
    const itemsToInsert = orderItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_price: item.product_price,
      quantity: item.quantity,
    }))

    console.log(`📦 Inserindo ${itemsToInsert.length} item(ns)...`)

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('❌ Erro ao criar itens:', itemsError)
      // Tentar deletar pedido criado
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    console.log(`✅ Pedido ${order.id} criado com sucesso via API`)
    console.log(`📱 Cliente: ${order.customer_name || 'Sem nome'} (${order.customer_phone})`)
    console.log(`📍 ${order.delivery_type === 'delivery' ? `Entrega: ${order.delivery_address}` : 'Retirada no local'}`)

    // 9. Retornar sucesso
    return NextResponse.json({
      success: true,
      data: {
        order_id: order.id,
        total: order.total_amount,
        items_count: orderItems.length,
        status: order.status
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Erro na API de pedidos:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar pedido'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tenant/orders
 * Lista pedidos do tenant
 * 
 * Query params:
 * - status: 'pending' | 'preparing' | 'completed' | 'cancelled'
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
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

    // 2. Parsear query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 3. Montar query
    let query = supabaseAdmin
      .from('orders')
      .select(`
        id,
        customer_name,
        customer_phone,
        delivery_type,
        delivery_address,
        total_amount,
        status,
        notes,
        created_at,
        accepted_at,
        completed_at,
        cancelled_at,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          product_price,
          subtotal
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrar por status se fornecido
    if (status && ['pending', 'preparing', 'completed', 'cancelled'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data: orders, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('❌ Erro ao listar pedidos:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao listar pedidos'
      },
      { status: 500 }
    )
  }
}