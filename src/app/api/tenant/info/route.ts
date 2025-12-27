import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

import { logger } from "@/lib/logger";
/**
 * GET /api/tenant/info
 * Busca informações básicas do tenant via instance_token
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validar instance_token
    const instanceToken = request.headers.get("x-instance-token")

    if (!instanceToken) {
      return NextResponse.json(
        { success: false, error: "instance_token não fornecido" },
        { status: 401 }
      )
    }

    // 2. Buscar instância WhatsApp
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("tenant_id, instance_token")
      .eq("instance_token", instanceToken)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json(
        { success: false, error: "Instância não encontrada" },
        { status: 404 }
      )
    }

    // 3. Buscar dados do tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, whatsapp_number")
      .eq("id", instance.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant não encontrado" },
        { status: 404 }
      )
    }

    // 4. Retornar dados
    return NextResponse.json({
      success: true,
      data: {
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        tenant_slug: tenant.slug,
        whatsapp_number: tenant.whatsapp_number,
      },
    })
  } catch (error) {
    logger.error("Erro ao buscar dados do tenant:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    )
  }
}