import { NextRequest } from "next/server"
import { supabaseAdmin } from "../supabase/admin"

export interface TenantContext {
    tenantId: string
    instanceId: string
    instanceToken: string
    apiKey: string
}

export async function authenticateTenant(
    request: NextRequest
): Promise<{ success: true; tenant: TenantContext } | { success: false; error: string }> {
    
    const instanceToken = request.headers.get('x-instance-token')

    if (!instanceToken) {
        return {
            success: false,
            error: 'Header x-instance-token é obrigatório'
        }
    }

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