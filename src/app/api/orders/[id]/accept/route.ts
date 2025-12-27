import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

import { logger } from "@/lib/logger";
/**
 * POST /api/orders/[id]/accept
 * Aceita um pedido (pending → preparing)
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

    // 3. Verificar se pedido existe e pertence ao tenant
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

    // 4. Validar status atual
    if (order.status !== 'pending') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Não é possível aceitar pedido com status '${order.status}'` 
        },
        { status: 400 }
      )
    }

    // 5. Atualizar pedido
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'preparing',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      throw updateError
    }

    logger.debug(`✅ Pedido ${orderId} aceito por ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Pedido aceito com sucesso',
      data: {
        order_id: orderId,
        status: 'preparing'
      }
    })

  } catch (error) {
    logger.error('❌ Erro ao aceitar pedido:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao aceitar pedido'
      },
      { status: 500 }
    )
  }
}