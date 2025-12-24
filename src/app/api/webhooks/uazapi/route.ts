import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// =====================================================
// TYPES
// =====================================================

type WebhookUpdateData = {
  status?: 'connecting' | 'connected' | 'disconnected'
  qr_code?: string | null
  phone_number?: string | null
  profile_name?: string | null
  profile_pic_url?: string | null
  connected_at?: string | null
  disconnected_at?: string | null
  updated_at: string
}

interface UazapiWebhookPayload {
  // Formato enriquecido (n8n)
  event?: string
  instanceToken?: string
  status?: string
  qrcode?: string
  phoneNumber?: string
  profileName?: string
  profilePicUrl?: string
  jid?: string

  // Formato original Uazapi
  BaseUrl?: string
  EventType?: string
  token?: string
  owner?: string
  instance?: {
    name: string
    status: string
    qrcode?: string
    profileName?: string
    profilePicUrl?: string
    jid?: string
  }
}

interface WebhookResponse {
  success: boolean
  message?: string
  data?: Record<string, unknown>
  error?: string
  details?: string
}

// =====================================================
// POST WEBHOOK
// =====================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<WebhookResponse>> {
  try {
    // =====================================================
    // 1. RAW BODY
    // =====================================================
    const rawBody = await request.text()
    console.log('📦 [Webhook] Raw body:', rawBody)

    let payload: UazapiWebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch (err) {
      console.error('❌ JSON inválido:', err)
      return NextResponse.json(
        { success: false, error: 'JSON inválido' },
        { status: 400 }
      )
    }

    console.log(
      '📦 [Webhook] Payload parseado:',
      JSON.stringify(payload, null, 2)
    )

    // =====================================================
    // 2. DETECTAR FORMATO
    // =====================================================
    let instanceToken: string | null = null
    let instanceName: string | null = null
    let status: string | null = null
    let qrCode: string | null = null
    let phoneNumber: string | null = null
    let profileName: string | null = null
    let profilePicUrl: string | null = null

    // Formato n8n
    if (payload.instanceToken) {
      console.log('✅ Formato: n8n enriquecido')

      instanceToken = payload.instanceToken
      status = payload.status ?? null
      qrCode = payload.qrcode ?? null
      phoneNumber = payload.phoneNumber ?? null
      profileName = payload.profileName ?? null
      profilePicUrl = payload.profilePicUrl ?? null
    }

    // Formato Uazapi original
    else if (payload.token && payload.instance) {
      console.log('✅ Formato: Uazapi original')

      instanceToken = payload.token
      instanceName = payload.instance.name
      status = payload.instance.status
      qrCode = payload.instance.qrcode ?? null
      phoneNumber = payload.owner ?? null
      profileName = payload.instance.profileName ?? null
      profilePicUrl = payload.instance.profilePicUrl ?? null

      if (payload.instance.jid) {
        phoneNumber =
          extractPhoneFromJid(payload.instance.jid) ?? phoneNumber
      }
    } else {
      console.error('❌ Payload não reconhecido')
      return NextResponse.json(
        {
          success: false,
          error:
            'Formato inválido. Esperado instanceToken ou token + instance'
        },
        { status: 400 }
      )
    }

    if (!instanceToken) {
      return NextResponse.json(
        { success: false, error: 'instanceToken é obrigatório' },
        { status: 400 }
      )
    }

    // =====================================================
    // 3. BUSCAR INSTÂNCIA
    // =====================================================
    const { data: instanceData, error: instanceError } =
      await supabaseAdmin
        .from('whatsapp_instances')
        .select(
          'id, tenant_id, status, instance_name, instance_token'
        )
        .eq('instance_token', instanceToken)
        .single()

    if (instanceError || !instanceData) {
      console.error('❌ Instância não encontrada:', instanceError)
      return NextResponse.json(
        { success: false, error: 'Instância não encontrada' },
        { status: 404 }
      )
    }

    // =====================================================
    // 4. PREPARAR UPDATE
    // =====================================================
    const updateData: WebhookUpdateData = {
      updated_at: new Date().toISOString()
    }

    let hasChanges = false

    // Status
    if (status) {
      const mapped = mapUazapiStatus(status)
      if (mapped && mapped !== instanceData.status) {
        updateData.status = mapped
        hasChanges = true
      }
    }

    // QR Code
    if (qrCode) {
      updateData.qr_code = qrCode
      hasChanges = true
    }

    // Conectado
    if (phoneNumber && (status === 'connected' || status === 'open')) {
      updateData.phone_number = phoneNumber
      updateData.connected_at = new Date().toISOString()
      updateData.disconnected_at = null
      hasChanges = true

      if (profileName) updateData.profile_name = profileName
      if (profilePicUrl)
        updateData.profile_pic_url = profilePicUrl
    }

    // Desconectado
    if (status === 'disconnected' || status === 'close') {
      updateData.disconnected_at = new Date().toISOString()
      updateData.phone_number = null
      updateData.profile_name = null
      updateData.profile_pic_url = null
      updateData.qr_code = null
      hasChanges = true
    }

    if (!hasChanges) {
      return NextResponse.json(
        {
          success: true,
          message: 'Nenhuma alteração necessária',
          data: instanceData
        },
        { status: 200 }
      )
    }

    // =====================================================
    // 5. UPDATE NO BANCO
    // =====================================================
    const { data: updated, error: updateError } =
      await supabaseAdmin
        .from('whatsapp_instances')
        .update(updateData)
        .eq('id', instanceData.id)
        .select()
        .single()

    if (updateError) {
      console.error('❌ Erro ao atualizar:', updateError)
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao atualizar instância',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Instância atualizada com sucesso',
        data: updated
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Erro geral:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// =====================================================
// HELPERS
// =====================================================

function mapUazapiStatus(
  status: string
): 'connecting' | 'connected' | 'disconnected' | null {
  const map: Record<
    string,
    'connecting' | 'connected' | 'disconnected'
  > = {
    connecting: 'connecting',
    open: 'connecting',
    connected: 'connected',
    disconnected: 'disconnected',
    close: 'disconnected'
  }

  return map[status.toLowerCase()] ?? null
}

function extractPhoneFromJid(jid: string): string | null {
  const match = jid.match(/^(\d+)@/)
  return match ? match[1] : null
}

// =====================================================
// GET (health check)
// =====================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: true,
      message: 'Webhook Uazapi está ativo',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  )
}
