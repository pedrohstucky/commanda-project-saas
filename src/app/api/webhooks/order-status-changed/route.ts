import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Payload do webhook Supabase
 */
interface WebhookPayload {
  type: 'UPDATE'
  table: 'orders'
  record: {
    id: string
    tenant_id: string
    status: 'pending' | 'preparing' | 'completed' | 'cancelled'
    customer_name: string | null
    customer_phone: string | null
    delivery_type: 'delivery' | 'pickup'
    delivery_address: string | null
    total_amount: number
    updated_at: string
    cancellation_reason: string | null
  }
  old_record: {
    status: 'pending' | 'preparing' | 'completed' | 'cancelled'
  }
}

/**
 * POST /api/webhooks/order-status-changed
 * Webhook chamado pelo Supabase quando status de pedido muda
 * 
 * Envia notificação para n8n que envia WhatsApp para cliente
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar secret do Supabase
    const authHeader = request.headers.get('authorization')
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET

    if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
      console.error('❌ Webhook não autorizado')
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // 2. Parsear payload
    const payload = await request.json() as WebhookPayload

    // 3. Validar que é update de orders e status mudou
    if (payload.type !== 'UPDATE' || payload.table !== 'orders') {
      return NextResponse.json({ ok: true, skipped: 'not_order_update' })
    }

    if (payload.record.status === payload.old_record.status) {
      return NextResponse.json({ ok: true, skipped: 'status_unchanged' })
    }

    const { record, old_record } = payload
    
    console.log(`📢 Status mudou: ${old_record.status} → ${record.status} (Pedido ${record.id})`)

    // 4. Buscar WhatsApp instance do tenant
    const { data: whatsappInstance } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('instance_id, status')
      .eq('tenant_id', record.tenant_id)
      .single()

    if (!whatsappInstance || whatsappInstance.status !== 'connected') {
      console.warn(`⚠️ WhatsApp não conectado para tenant ${record.tenant_id}`)
      return NextResponse.json({ 
        ok: true, 
        skipped: 'whatsapp_not_connected' 
      })
    }

    // 5. Buscar tenant para pegar nome do restaurante
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('id', record.tenant_id)
      .single()

    // 6. Preparar mensagem baseada no status
    let message = ''
    const restaurantName = tenant?.name || 'Restaurante'
    const orderId = record.id.slice(0, 8)

    switch (record.status) {
      case 'preparing':
        message = `✅ *Pedido Aceito!*\n\n` +
          `Olá${record.customer_name?.split(' ')[0] ? ` ${record.customer_name.split(' ')[0]}` : ''}! ` +
          `Seu pedido *#${orderId}* foi aceito pelo ${restaurantName}.\n\n` +
          `🍽️ Estamos preparando seu pedido agora!\n\n` +
          `📱 Total: R$ ${record.total_amount.toFixed(2)}\n` +
          (record.delivery_type === 'delivery' 
            ? `🚚 Entregaremos em: ${record.delivery_address}\n\n`
            : `📦 Pedido para retirada no local\n\n`) +
          `Você receberá uma nova mensagem quando estiver pronto.`
        break

      case 'completed':
        message = `🎉 *Pedido Concluído!*\n\n` +
          `Olá${record.customer_name?.split(' ')[0] ? ` ${record.customer_name.split(' ')[0]}` : ''}!\n\n` +
          (record.delivery_type === 'delivery'
            ? `🚚 Seu pedido *#${orderId}* está a caminho!\n\nChegará em breve no endereço: ${record.delivery_address}`
            : `📦 Seu pedido *#${orderId}* está pronto para retirada!\n\nVenha buscar no ${restaurantName}.`) +
          `\n\n✨ Obrigado pela preferência!`
        break

      case 'cancelled':
        message = `❌ *Pedido Cancelado*\n\n` +
          `Olá${record.customer_name?.split(' ')[0] ? ` ${record.customer_name.split(' ')[0]}` : ''}!\n\n` +
          `Infelizmente não conseguimos aceitar seu pedido *#${orderId}*.\n\n` +
          `${record.cancellation_reason ? `Motivo: ${record.cancellation_reason}\n\n` : ''}` +
          `😔 Pedimos desculpas pelo inconveniente.\n\n` +
          `Estamos à disposição para um novo pedido!`
        break

      default:
        // Não envia mensagem para pending ou outros status
        return NextResponse.json({ 
          ok: true, 
          skipped: 'no_message_for_status' 
        })
    }

    // 7. Enviar para n8n
    const n8nWebhookUrl = process.env.N8N_ORDER_STATUS_WEBHOOK_URL

    if (!n8nWebhookUrl) {
      console.error('❌ N8N_ORDER_STATUS_WEBHOOK_URL não configurada')
      return NextResponse.json({ 
        ok: true, 
        skipped: 'n8n_not_configured' 
      })
    }

    const n8nPayload = {
      instance_id: whatsappInstance.instance_id,
      phone: record.customer_phone,
      message: message,
      order_id: record.id,
      old_status: old_record.status,
      new_status: record.status,
      tenant_id: record.tenant_id
    }

    console.log(`📤 Enviando para n8n:`, {
      phone: record.customer_phone,
      status: `${old_record.status} → ${record.status}`
    })

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload)
    })

    if (!n8nResponse.ok) {
      console.error(`❌ Erro ao enviar para n8n:`, await n8nResponse.text())
      return NextResponse.json({ 
        ok: false, 
        error: 'n8n_error' 
      }, { status: 500 })
    }

    console.log(`✅ Notificação enviada com sucesso para ${record.customer_phone}`)

    return NextResponse.json({ 
      ok: true,
      notified: true,
      phone: record.customer_phone,
      status_change: `${old_record.status} → ${record.status}`
    })

  } catch (error) {
    console.error('❌ Erro no webhook order-status-changed:', error)
    
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    )
  }
}