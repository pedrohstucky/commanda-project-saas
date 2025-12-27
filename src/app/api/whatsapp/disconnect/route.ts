import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { logger } from "@/lib/logger";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tenantId } = body;

    let finalTenantId: string;

    // Verificar se é chamada do Inngest
    const inngestSecret = request.headers.get("x-inngest-secret");
    if (inngestSecret === process.env.INNGEST_INTERNAL_SECRET && tenantId) {
      // Chamada do Inngest - usar tenantId do body
      finalTenantId = tenantId;
      logger.debug("🔧 Chamada do Inngest para tenant:", finalTenantId);
    } else {
      // Chamada normal - verificar auth
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
      }

      finalTenantId = profile.tenant_id;
    }

    // Buscar instância usando supabaseAdmin
    const { data: instance } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("instance_token")
      .eq("tenant_id", finalTenantId)
      .single();

    if (!instance || !instance.instance_token) {
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
    }

    const apiUrl = process.env.UAZAPI_API_URL;
    if (!apiUrl) {
      return NextResponse.json({ error: "URL da API não configurada" }, { status: 500 });
    }

    // Chamar API Uazapi para desconectar
    const uazapiResponse = await fetch(`${apiUrl}/instance/disconnect`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "token": instance.instance_token
      }
    });

    const uazapiData = await uazapiResponse.json();

    // Atualizar status no banco usando supabaseAdmin
    await supabaseAdmin
      .from("whatsapp_instances")
      .update({
        status: "disconnected",
        phone_number: null,
        qr_code: null,
        updated_at: new Date().toISOString()
      })
      .eq("tenant_id", finalTenantId);

    return NextResponse.json({
      success: true,
      message: "WhatsApp desconectado com sucesso",
      uazapi: uazapiData
    });

  } catch (error) {
    logger.error("Erro ao desconectar WhatsApp:", error);
    return NextResponse.json(
      { error: "Erro ao desconectar WhatsApp" },
      { status: 500 }
    );
  }
}