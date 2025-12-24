import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface UazapiWebhookPayload {
  event?: string
  instanceToken?: string
  status?: string
  qrcode?: string
  phoneNumber?: string
  profileName?: string
  profilePicUrl?: string
  jid?: string
  
  // Payload original da Uazapi (fallback)
  BaseUrl?: string
  EventType?: string
  instance?: {
    name: string
    qrcode?: string
    status: string
    profileName?: string
    profilePicUrl?: string
    jid?: string
  }
  token?: string
  owner?: string
}

interface WebhookResponse {
  success: boolean
  message?: string
  data?: any
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<WebhookResponse>> {
  try {
    // =====================================================
    // 1. LER PAYLOAD RAW
    // =====================================================
    const rawBody = await request.text()
    console.log('📦 [Webhook] Raw body:', rawBody)
    
    let payload: UazapiWebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch (e) {
      console.error('❌ [Webhook] Erro ao parsear JSON:', e)
      return NextResponse.json(
        { success: false, error: 'JSON inválido' },
        { status: 400 }
      )
    }

    console.log('📦 [Webhook] Payload parseado:', JSON.stringify(payload, null, 2))

    // =====================================================
    // 2. IDENTIFICAR FORMATO E EXTRAIR DADOS
    // =====================================================
    
    let instanceToken: string | null = null
    let instanceName: string | null = null
    let status: string | null = null
    let qrCode: string | null = null
    let phoneNumber: string | null = null
    let profileName: string | null = null
    let profilePicUrl: string | null = null

    // Formato do n8n (enriquecido)
    if (payload.instanceToken) {
      console.log('✅ [Webhook] Formato detectado: n8n enriquecido')
      
      instanceToken = payload.instanceToken
      status = payload.status || null
      qrCode = payload.qrcode || null
      phoneNumber = payload.phoneNumber || null
      profileName = payload.profileName || null
      profilePicUrl = payload.profilePicUrl || null

      console.log('🔍 [Webhook] instanceToken:', instanceToken)
      console.log('🔍 [Webhook] status:', status)
      console.log('🔍 [Webhook] qrCode length:', qrCode ? qrCode.length : 'null')
      console.log('🔍 [Webhook] phoneNumber:', phoneNumber)
    }
    // Formato original da Uazapi
    else if (payload.token && payload.instance) {
      console.log('✅ [Webhook] Formato detectado: Uazapi original')
      
      instanceToken = payload.token
      instanceName = payload.instance.name
      status = payload.instance.status
      qrCode = payload.instance.qrcode || null
      phoneNumber = payload.owner || null
      profileName = payload.instance.profileName || null
      profilePicUrl = payload.instance.profilePicUrl || null

      // Extrair telefone do JID se disponível
      if (payload.instance.jid) {
        const extracted = extractPhoneFromJid(payload.instance.jid)
        if (extracted) phoneNumber = extracted
      }

      console.log('🔍 [Webhook] instanceToken:', instanceToken)
      console.log('🔍 [Webhook] instanceName:', instanceName)
      console.log('🔍 [Webhook] status:', status)
      console.log('🔍 [Webhook] qrCode length:', qrCode ? qrCode.length : 'null')
    }
    else {
      console.error('❌ [Webhook] Formato de payload não reconhecido')
      console.error('❌ [Webhook] Payload recebido:', payload)
      
      return NextResponse.json(
        {
          success: false,
          error: 'Formato de payload inválido. Esperado: instanceToken ou token+instance'
        },
        { status: 400 }
      )
    }

    if (!instanceToken) {
      console.error('❌ [Webhook] instanceToken não encontrado no payload')
      return NextResponse.json(
        { success: false, error: 'instanceToken é obrigatório' },
        { status: 400 }
      )
    }

    // =====================================================
    // 3. BUSCAR INSTÂNCIA NO BANCO
    // =====================================================
    
    console.log('🔍 [Webhook] Buscando instância com token:', instanceToken)
    
    const { data: instanceData, error: instanceError } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('id, tenant_id, status, instance_name, instance_token')
      .eq('instance_token', instanceToken)
      .single()

    if (instanceError) {
      console.error('❌ [Webhook] Erro ao buscar instância:', instanceError)
      return NextResponse.json(
        {
          success: false,
          error: 'Instância não encontrada',
          details: instanceError.message
        },
        { status: 404 }
      )
    }

    if (!instanceData) {
      console.error('❌ [Webhook] Nenhuma instância encontrada')
      return NextResponse.json(
        {
          success: false,
          error: 'Instância não encontrada no banco'
        },
        { status: 404 }
      )
    }

    console.log('✅ [Webhook] Instância encontrada:', instanceData.instance_name)
    console.log('🏢 [Webhook] Tenant:', instanceData.tenant_id)
    console.log('📊 [Webhook] Status atual:', instanceData.status)

    // =====================================================
    // 4. PREPARAR UPDATE
    // =====================================================
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    let hasChanges = false

    // Atualizar status
    if (status) {
      const mappedStatus = mapUazapiStatus(status)
      if (mappedStatus && mappedStatus !== instanceData.status) {
        updateData.status = mappedStatus
        hasChanges = true
        console.log('🔄 [Webhook] Atualizando status:', status, '→', mappedStatus)
      }
    }

    // Atualizar QR Code
    if (qrCode) {
      updateData.qr_code = qrCode
      hasChanges = true
      console.log('🔄 [Webhook] Atualizando QR Code (length:', qrCode.length, ')')
    }

    // Atualizar telefone e perfil se conectado
    if (phoneNumber && (status === 'connected' || status === 'open')) {
      updateData.phone_number = phoneNumber
      updateData.connected_at = new Date().toISOString()
      updateData.disconnected_at = null
      hasChanges = true
      console.log('🔄 [Webhook] Atualizando telefone:', phoneNumber)

      if (profileName) {
        updateData.profile_name = profileName
        console.log('🔄 [Webhook] Atualizando profile_name:', profileName)
      }

      if (profilePicUrl) {
        updateData.profile_pic_url = profilePicUrl
        console.log('🔄 [Webhook] Atualizando profile_pic_url')
      }
    }

    // Limpar dados se desconectado
    if (status === 'disconnected' || status === 'close') {
      updateData.disconnected_at = new Date().toISOString()
      updateData.phone_number = null
      updateData.profile_name = null
      updateData.profile_pic_url = null
      updateData.qr_code = null
      hasChanges = true
      console.log('🔄 [Webhook] Limpando dados (desconectado)')
    }

    if (!hasChanges) {
      console.log('⚠️ [Webhook] Nenhuma mudança detectada')
      return NextResponse.json(
        {
          success: true,
          message: 'Nenhuma mudança necessária',
          data: { instanceData }
        },
        { status: 200 }
      )
    }

    console.log('📝 [Webhook] Dados para atualizar:', updateData)

    // =====================================================
    // 5. ATUALIZAR BANCO
    // =====================================================
    
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('whatsapp_instances')
      .update(updateData)
      .eq('id', instanceData.id)
      .select()

    if (updateError) {
      console.error('❌ [Webhook] Erro ao atualizar:', updateError)
      return NextResponse.json(
        {
          success: false,
          error: 'Falha ao atualizar instância',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    console.log('✅ [Webhook] Instância atualizada com sucesso')
    console.log('📊 [Webhook] Dados atualizados:', updated)

    return NextResponse.json(
      {
        success: true,
        message: 'Instância atualizada',
        data: {
          instanceId: instanceData.id,
          instanceName: instanceData.instance_name,
          status: updateData.status,
          phoneNumber: updateData.phone_number,
          qrCodeUpdated: !!qrCode,
          updated
        }
      },
      { status: 200 }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ [Webhook] Erro geral:', errorMessage)
    console.error('❌ [Webhook] Stack:', error instanceof Error ? error.stack : '')
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    )
  }
}

// =====================================================
// HELPERS
// =====================================================

function mapUazapiStatus(uazapiStatus: string): 'connecting' | 'connected' | 'disconnected' | null {
  const statusMap: Record<string, 'connecting' | 'connected' | 'disconnected'> = {
    'connecting': 'connecting',
    'open': 'connecting',
    'connected': 'connected',
    'disconnected': 'disconnected',
    'close': 'disconnected'
  }

  return statusMap[uazapiStatus.toLowerCase()] || null
}

function extractPhoneFromJid(jid: string): string | null {
  if (!jid) return null
  const match = jid.match(/^(\d+)@/)
  return match ? match[1] : null
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: true,
      message: 'Webhook Uazapi está funcionando',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  )
}