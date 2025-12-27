import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

import { logger } from "@/lib/logger";
/**
 * Request body para recusar pedido
 */
interface RejectOrderRequest {
  reason?: string
}

/**
 * POST /api/orders/[id]/reject
 * Recusa um pedido (pending → cancelled)
 * 
 * Autenticação: Session cookie (usuário logado)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params

    // 1. Autenticar usuário
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // 2. Buscar tenant do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    // 3. Parsear body (motivo é opcional)
    const body = await request.json().catch(() => ({})) as RejectOrderRequest
    const reason = body.reason || 'Recusado pelo atendente'

    // 4. Verificar se pedido existe e pertence ao tenant
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, tenant_id')
      .eq('id', orderId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // 5. Validar status atual (pode recusar pending ou preparing)
    if (!['pending', 'preparing'].includes(order.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Não é possível recusar pedido com status '${order.status}'` 
        },
        { status: 400 }
      )
    }

    // 6. Atualizar pedido
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      throw updateError
    }

    logger.debug(`✅ Pedido ${orderId} recusado por ${user.email}. Motivo: ${reason}`)

    return NextResponse.json({
      success: true,
      message: 'Pedido recusado com sucesso',
      data: {
        order_id: orderId,
        status: 'cancelled',
        reason
      }
    })

  } catch (error) {
    logger.error('❌ Erro ao recusar pedido:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao recusar pedido'
      },
      { status: 500 }
    )
  }
}