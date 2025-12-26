import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * POST /api/orders/[id]/complete
 * Completa um pedido (preparing → completed)
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
    if (order.status !== 'preparing') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Não é possível completar pedido com status '${order.status}'` 
        },
        { status: 400 }
      )
    }

    // 5. Atualizar pedido
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      throw updateError
    }

    console.log(`✅ Pedido ${orderId} completado por ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Pedido completado com sucesso',
      data: {
        order_id: orderId,
        status: 'completed'
      }
    })

  } catch (error) {
    console.error('❌ Erro ao completar pedido:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao completar pedido'
      },
      { status: 500 }
    )
  }
}