import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { logger } from "@/lib/logger";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tenantId, phone } = body;

    let finalTenantId: string;
    let finalPhone: string | null = phone || null;

    // Verificar se é chamada do Inngest
    const inngestSecret = request.headers.get("x-inngest-secret");
    if (inngestSecret === process.env.INNGEST_INTERNAL_SECRET && tenantId) {
      // Chamada do Inngest - usar tenantId do body
      finalTenantId = tenantId;
      logger.debug("🔧 Chamada do Inngest para tenant:", finalTenantId);
    } else {
      // Chamada normal - verificar auth
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        return NextResponse.json(
          { error: "Perfil não encontrado" },
          { status: 404 }
        );
      }

      finalTenantId = profile.tenant_id;
    }

    // Verificar se subscription está ativa
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("subscription_status")
      .eq("id", finalTenantId)
      .single();

    if (!tenant || tenant.subscription_status !== "active") {
      return NextResponse.json(
        {
          error:
            "Subscription inativa. Ative sua assinatura para conectar o WhatsApp.",
        },
        { status: 403 }
      );
    }

    // Buscar instância
    const { data: instance } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("instance_token, phone_number")
      .eq("tenant_id", finalTenantId)
      .single();

    if (!instance || !instance.instance_token) {
      return NextResponse.json(
        { error: "Instância não encontrada" },
        { status: 404 }
      );
    }

    // Usar phone do body ou o salvo ou vazio
    finalPhone = finalPhone || instance.phone_number || "";

    const apiUrl = process.env.UAZAPI_API_URL;
    if (!apiUrl) {
      return NextResponse.json(
        { error: "URL da API não configurada" },
        { status: 500 }
      );
    }

    // Chamar API Uazapi para gerar QR Code
    const uazapiResponse = await fetch(`${apiUrl}/instance/connect`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        token: instance.instance_token,
      },
      body: JSON.stringify({
        phone: finalPhone,
      }),
    });

    if (!uazapiResponse.ok) {
      const errorData = await uazapiResponse.json();
      return NextResponse.json(
        { error: "Erro ao gerar QR Code na Uazapi", details: errorData },
        { status: 500 }
      );
    }

    const uazapiData = await uazapiResponse.json();

    // Atualizar status para "connecting" com QR Code
    if (uazapiData.qrcode) {
      await supabaseAdmin
        .from("whatsapp_instances")
        .update({
          status: "connecting",
          qr_code: uazapiData.qrcode,
          phone_number: finalPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", finalTenantId);
    }

    return NextResponse.json({
      success: true,
      message: "QR Code gerado com sucesso",
      qrcode: uazapiData.qrcode,
    });
  } catch (error) {
    logger.error("Erro ao gerar QR Code:", error);
    return NextResponse.json(
      { error: "Erro ao gerar QR Code" },
      { status: 500 }
    );
  }
}
