import { NextRequest } from "next/server"
import { supabaseAdmin } from "../supabase/admin"

export interface TenantContext {
    tenantId: string
    instanceId?: string
    instanceToken?: string
    apiKey: string
}

/**
 * Autentica tenant via x-instance-token OU x-api-key
 * 
 * x-instance-token: Usado pelo n8n (webhook do WhatsApp)
 * x-api-key: Usado por integrações externas
 */
export async function authenticateTenant(
    request: NextRequest
): Promise<{ success: true; tenant: TenantContext } | { success: false; error: string }> {
    
    // Tentar autenticar via instance-token primeiro
    const instanceToken = request.headers.get('x-instance-token')
    
    if (instanceToken) {
        const { data: instance, error } = await supabaseAdmin
            .from('whatsapp_instances')
            .select('id, tenant_id, instance_id, instance_token, api_key, status')
            .eq('instance_token', instanceToken)
            .single()
        
        if (error || !instance) {
            return {
                success: false,
                error: 'Instância não encontrada ou token inválido'
            }
        }

        return {
            success: true,
            tenant: {
                tenantId: instance.tenant_id,
                instanceId: instance.instance_id,
                instanceToken: instance.instance_token,
                apiKey: instance.api_key
            }
        }
    }

    // Tentar autenticar via api-key
    const apiKey = request.headers.get('x-api-key')
    
    if (apiKey) {
        const { data: instance, error } = await supabaseAdmin
            .from('whatsapp_instances')
            .select('id, tenant_id, instance_id, instance_token, api_key, status')
            .eq('api_key', apiKey)
            .single()
        
        if (error || !instance) {
            return {
                success: false,
                error: 'API Key não encontrada ou inválida'
            }
        }

        return {
            success: true,
            tenant: {
                tenantId: instance.tenant_id,
                instanceId: instance.instance_id,
                instanceToken: instance.instance_token,
                apiKey: instance.api_key
            }
        }
    }

    // Nenhum header de autenticação fornecido
    return {
        success: false,
        error: 'Header x-instance-token ou x-api-key é obrigatório'
    }
}