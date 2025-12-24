import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { authenticateTenant } from '@/lib/auth/tenant'

interface CreatePaymentRequest {
  order_id: string
  payment_method: 'cash' | 'card' | 'pix'
  amount: number
}

interface CreatePaymentResponse {
  success: boolean
  data?: {
    payment_id: string
    order_id: string
    amount: number
  }
  error?: string
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreatePaymentResponse>> {
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
    const body = await request.json() as CreatePaymentRequest

    // 3. Validar dados
    if (!body.order_id) {
      return NextResponse.json(
        { success: false, error: 'order_id é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.payment_method || !['cash', 'card', 'pix'].includes(body.payment_method)) {
      return NextResponse.json(
        { success: false, error: 'Método de pagamento inválido' },
        { status: 400 }
      )
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor do pagamento inválido' },
        { status: 400 }
      )
    }

    // 4. Buscar pedido
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, status, tenant_id, created_by')
      .eq('id', body.order_id)
      .eq('tenant_id', tenantId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // 5. Verificar se pedido já foi pago
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('order_id', body.order_id)
      .maybeSingle()

    if (existingPayment) {
      return NextResponse.json(
        { success: false, error: 'Pedido já foi pago' },
        { status: 400 }
      )
    }

    // 6. Criar pagamento
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id: body.order_id,
        payment_method: body.payment_method,
        amount: body.amount,
        status: 'completed',
        processed_by: order.created_by
      })
      .select('id, order_id, amount')
      .single()

    if (paymentError || !payment) {
      console.error('❌ Erro ao criar pagamento:', paymentError)
      throw paymentError
    }

    // 7. Atualizar status do pedido para 'paid'
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', body.order_id)

    if (updateError) {
      console.error('⚠️ Erro ao atualizar status do pedido:', updateError)
    }

    // 8. Retornar sucesso
    return NextResponse.json({
      success: true,
      data: {
        payment_id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Erro na API de pagamentos:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao registrar pagamento'
      },
      { status: 500 }
    )
  }
}
