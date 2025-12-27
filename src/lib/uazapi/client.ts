import { logger } from "@/lib/logger";

/**
 * Cliente Uazapi para gerenciar instâncias WhatsApp
 * Docs: https://docs.uazapi.com
 * 
 * Fluxo completo:
 * 1. createInstance() - cria instância
 * 2. connectInstance() - gera QR Code
 * 3. configureWebhook() - configura webhook
 */

const UAZAPI_API_URL = process.env.UAZAPI_API_URL!
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN!

// =====================================================
// TYPES
// =====================================================

export interface UazapiInstance {
  id: string
  token: string
  name: string
  status: 'disconnected' | 'connecting' | 'connected'
  qrcode?: string
  paircode?: string
  profileName?: string
  profilePicUrl?: string
  isBusiness?: boolean
  owner?: string
  created: string
  updated: string
}

export interface UazapiConnectionResponse {
  connected: boolean
  loggedIn: boolean
  jid: string | null
  instance: UazapiInstance
}

export interface UazapiWebhookConfig {
  id?: string
  enabled: boolean
  url: string
  events: string[]
  excludeMessages?: string[]
  addUrlEvents?: boolean
  addUrlTypesMessages?: boolean
  action?: 'add' | 'update' | 'delete'
}

export interface UazapiCreateInstanceParams {
  name: string
  systemName?: string
  adminField01?: string
  adminField02?: string
}

// =====================================================
// FUNÇÕES PRINCIPAIS
// =====================================================

/**
 * 1. Cria nova instância WhatsApp
 * Rota: POST /instance/init
 * Auth: Admin Token
 */
export async function createInstance(
  params: UazapiCreateInstanceParams
): Promise<UazapiInstance> {
  logger.debug('🏗️ [Uazapi] Criando instância...')
  logger.debug('📝 [Uazapi] Nome:', params.name)
  
  const response = await fetch(`${UAZAPI_API_URL}/instance/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'admintoken': UAZAPI_ADMIN_TOKEN
    },
    body: JSON.stringify({
      name: params.name,
      systemName: params.systemName || 'saas-restaurante',
      ...(params.adminField01 && { adminField01: params.adminField01 }),
      ...(params.adminField02 && { adminField02: params.adminField02 })
    })
  })

  logger.debug('📡 [Uazapi] Response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    logger.error('❌ [Uazapi] Error response:', errorText)
    
    try {
      const error = JSON.parse(errorText)
      throw new Error(`Uazapi createInstance error: ${error.message || response.statusText}`)
    } catch {
      throw new Error(`Uazapi createInstance error: ${response.statusText}`)
    }
  }

  const data = await response.json()
  logger.debug('✅ [Uazapi] Instância criada:', data.instance?.id)
  
  return {
    id: data.instance.id,
    token: data.token,
    name: data.instance.name,
    status: data.instance.status || 'disconnected',
    qrcode: data.instance.qrcode,
    paircode: data.instance.paircode,
    profileName: data.instance.profileName,
    profilePicUrl: data.instance.profilePicUrl,
    isBusiness: data.instance.isBusiness,
    owner: data.instance.owner,
    created: data.instance.created,
    updated: data.instance.updated
  }
}

/**
 * 2. Conecta instância ao WhatsApp (gera QR Code)
 * Rota: POST /instance/connect
 * Auth: Instance Token
 */
export async function connectInstance(params: {
  instanceToken: string
  phone?: string
}): Promise<UazapiConnectionResponse> {
  logger.debug('🔗 [Uazapi] Conectando instância...')
  logger.debug('📝 [Uazapi] Token:', { token: params.instanceToken.slice(0, 20) + '...' })
  
  const response = await fetch(`${UAZAPI_API_URL}/instance/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': params.instanceToken
    },
    body: JSON.stringify({
      ...(params.phone && { phone: params.phone })
    })
  })

  logger.debug('📡 [Uazapi] Response status:', response.status)
  
  if (!response.ok) {
    const errorText = await response.text()
    logger.error('❌ [Uazapi] Error response:', errorText)
    
    try {
      const error = JSON.parse(errorText)
      throw new Error(`Uazapi connectInstance error: ${error.message || response.statusText}`)
    } catch {
      throw new Error(`Uazapi connectInstance error: ${response.statusText}`)
    }
  }

  const data = await response.json()
  logger.debug('📦 [Uazapi] Full response:', { data: JSON.stringify(data, null, 2) })
  
  // ✅ TENTAR MÚLTIPLAS VARIAÇÕES DO QR CODE
  const qrcode = 
    data.instance?.qrcode ||
    data.instance?.qr_code ||
    data.instance?.qrCode ||
    data.qrcode ||
    data.qr_code ||
    data.qrCode ||
    null
  
  const paircode =
    data.instance?.paircode ||
    data.instance?.pair_code ||
    data.instance?.pairCode ||
    data.paircode ||
    data.pair_code ||
    data.pairCode ||
    null
  
  logger.debug('🔍 [Uazapi] QR Code encontrado:', qrcode ? 'SIM ✅' : 'NÃO ❌')
  
  if (qrcode) {
    logger.debug('📏 [Uazapi] QR Code length:', qrcode.length)
    logger.debug('🔤 [Uazapi] QR Code preview:', { qrcode: qrcode.slice(0, 50) + '...' })
  } else {
    logger.warn('⚠️ [Uazapi] QR Code NÃO encontrado na response')
    logger.warn('⚠️ [Uazapi] Campos disponíveis no instance:', Object.keys(data.instance || {}))
  }
  
  if (paircode) {
    logger.debug('🔢 [Uazapi] Pair Code:', paircode)
  }
  
  return {
    connected: data.connected,
    loggedIn: data.loggedIn,
    jid: data.jid,
    instance: {
      id: data.instance.id,
      token: params.instanceToken,
      name: data.instance.name,
      status: data.instance.status,
      qrcode: qrcode,
      paircode: paircode,
      profileName: data.instance.profileName,
      profilePicUrl: data.instance.profilePicUrl,
      isBusiness: data.instance.isBusiness,
      owner: data.instance.owner,
      created: data.instance.created,
      updated: data.instance.updated
    }
  }
}

/**
 * 2B. Conecta instância com retry (aguarda QR Code ser gerado)
 */
export async function connectInstanceWithRetry(params: {
  instanceToken: string
  phone?: string
  maxRetries?: number
}): Promise<UazapiConnectionResponse> {
  const maxRetries = params.maxRetries || 5
  
  logger.debug('🔗 [Uazapi] Iniciando conexão com retry...')
  
  // Primeira tentativa: chamar /connect
  const connection = await connectInstance({
    instanceToken: params.instanceToken,
    phone: params.phone
  })
  
  // Se já tem QR Code, retorna
  if (connection.instance.qrcode) {
    logger.debug('✅ [Uazapi] QR Code gerado imediatamente')
    return connection
  }
  
  // Se não tem, faz polling no status
  logger.debug('⏳ [Uazapi] QR Code não gerado, iniciando polling...')
  
  for (let i = 0; i < maxRetries; i++) {
    logger.debug(`🔄 [Uazapi] Tentativa ${i + 1}/${maxRetries}...`)
    
    // Aguardar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Buscar status atualizado
    try {
      const status = await getInstanceStatus(params.instanceToken)
      
      if (status.instance.qrcode) {
        logger.debug('✅ [Uazapi] QR Code gerado após polling')
        return status
      }
    } catch (error) {
      logger.error('⚠️ [Uazapi] Erro ao buscar status:', error)
    }
  }
  
  logger.warn('⚠️ [Uazapi] QR Code não foi gerado após todas as tentativas')
  
  // Última tentativa: endpoint específico de QR Code
  logger.debug('🔄 [Uazapi] Tentando endpoint específico de QR Code...')
  const qrcode = await fetchQRCode(params.instanceToken)
  
  if (qrcode) {
    logger.debug('✅ [Uazapi] QR Code obtido via endpoint alternativo')
    connection.instance.qrcode = qrcode
  }
  
  return connection
}

/**
 * Busca status da instância
 * Rota: GET /instance/status
 */
export async function getInstanceStatus(
  instanceToken: string
): Promise<UazapiConnectionResponse> {
  const response = await fetch(`${UAZAPI_API_URL}/instance/status`, {
    method: 'GET',
    headers: {
      'token': instanceToken
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to get status: ${response.statusText}`)
  }

  const data = await response.json()
  
  const qrcode = 
    data.instance?.qrcode ||
    data.instance?.qr_code ||
    data.instance?.qrCode ||
    data.qrcode ||
    data.qr_code ||
    null
  
  const paircode =
    data.instance?.paircode ||
    data.instance?.pair_code ||
    data.instance?.pairCode ||
    data.paircode ||
    null
  
  return {
    connected: data.connected,
    loggedIn: data.loggedIn,
    jid: data.jid,
    instance: {
      id: data.instance.id,
      token: instanceToken,
      name: data.instance.name,
      status: data.instance.status,
      qrcode: qrcode,
      paircode: paircode,
      profileName: data.instance.profileName,
      profilePicUrl: data.instance.profilePicUrl,
      isBusiness: data.instance.isBusiness,
      owner: data.instance.owner,
      created: data.instance.created,
      updated: data.instance.updated
    }
  }
}

/**
 * Busca QR Code via endpoint específico
 * Rota: GET /instance/qrcode
 */
export async function fetchQRCode(instanceToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${UAZAPI_API_URL}/instance/qrcode`, {
      method: 'GET',
      headers: {
        'token': instanceToken
      }
    })

    if (!response.ok) {
      logger.warn('⚠️ [Uazapi] /instance/qrcode não disponível')
      return null
    }

    const data = await response.json()
    
    return (
      data.qrcode ||
      data.qr_code ||
      data.qrCode ||
      data.base64 ||
      data.instance?.qrcode ||
      data.instance?.qr_code ||
      null
    )
  } catch (error) {
    logger.error('❌ [Uazapi] Erro ao buscar QR Code:', error)
    return null
  }
}

/**
 * 3. Configura webhook da instância (modo simples)
 * Rota: POST /webhook
 * Auth: Instance Token
 */
export async function configureWebhook(params: {
  instanceToken: string
  webhookUrl: string
  events?: string[]
}): Promise<UazapiWebhookConfig[]> {
  logger.debug('🔔 [Uazapi] Configurando webhook...')
  logger.debug('📝 [Uazapi] URL:', params.webhookUrl)
  
  const response = await fetch(`${UAZAPI_API_URL}/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': params.instanceToken
    },
    body: JSON.stringify({
      url: params.webhookUrl,
      enabled: true,
      events: params.events || [
        'messages',
        'connection',
        'messages_update'
      ],
      excludeMessages: [
        'wasSentByApi'
      ],
      addUrlEvents: false,
      addUrlTypesMessages: false
    })
  })

  logger.debug('📡 [Uazapi] Response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    logger.error('❌ [Uazapi] Error response:', errorText)
    
    try {
      const error = JSON.parse(errorText)
      throw new Error(`Uazapi configureWebhook error: ${error.message || response.statusText}`)
    } catch {
      throw new Error(`Uazapi configureWebhook error: ${response.statusText}`)
    }
  }

  const data = await response.json()
  logger.debug('✅ [Uazapi] Webhook configurado')
  
  return data
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Envia mensagem de texto
 * Rota: POST /message/text
 */
export async function sendMessage(params: {
  instanceToken: string
  to: string
  message: string
}): Promise<void> {
  const response = await fetch(`${UAZAPI_API_URL}/message/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': params.instanceToken
    },
    body: JSON.stringify({
      number: params.to,
      text: params.message
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`)
  }
}

/**
 * Desconecta instância
 * Rota: POST /instance/disconnect
 */
export async function disconnectInstance(instanceToken: string): Promise<void> {
  const response = await fetch(`${UAZAPI_API_URL}/instance/disconnect`, {
    method: 'POST',
    headers: {
      'token': instanceToken
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to disconnect: ${response.statusText}`)
  }
}

/**
 * Deleta instância permanentemente
 * Rota: DELETE /instance
 */
export async function deleteInstance(instanceToken: string): Promise<void> {
  logger.debug('🗑️ [Uazapi] Deletando instância...')
  
  const response = await fetch(`${UAZAPI_API_URL}/instance`, {
    method: 'DELETE',
    headers: {
      'token': instanceToken
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error('❌ [Uazapi] Error ao deletar:', errorText)
    throw new Error(`Failed to delete instance: ${response.statusText}`)
  }
  
  logger.debug('✅ [Uazapi] Instância deletada')
}