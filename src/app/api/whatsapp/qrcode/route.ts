import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
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

    // Verificar se subscription está ativa
    const { data: tenant } = await supabase
      .from("tenants")
      .select("subscription_status")
      .eq("id", profile.tenant_id)
      .single();

    if (tenant?.subscription_status !== 'active') {
      return NextResponse.json({ 
        error: "Subscription inativa. Ative sua assinatura para conectar o WhatsApp." 
      }, { status: 403 });
    }

    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("instance_token, phone_number")
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!instance || !instance.instance_token) {
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
    }

    // Pegar phone do body ou usar o salvo
    const body = await request.json().catch(() => ({}));
    const phone = body.phone || instance.phone_number;

    if (!phone) {
      return NextResponse.json({ error: "Número de telefone não encontrado" }, { status: 400 });
    }

    const apiUrl = process.env.UAZAPI_API_URL;
    if (!apiUrl) {
      return NextResponse.json({ error: "URL da API não configurada" }, { status: 500 });
    }

    // Chamar API Uazapi para gerar QR Code
    const uazapiResponse = await fetch(`${apiUrl}/instance/connect`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "token": instance.instance_token
      },
      body: JSON.stringify({
        phone: phone
      })
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
      await supabase
        .from("whatsapp_instances")
        .update({
          status: "connecting",
          qr_code: uazapiData.qrcode,
          phone_number: phone,
          updated_at: new Date().toISOString()
        })
        .eq("tenant_id", profile.tenant_id);
    }

    return NextResponse.json({
      success: true,
      message: "QR Code gerado com sucesso",
      qrcode: uazapiData.qrcode
    });

  } catch (error) {
    console.error("Erro ao gerar QR Code:", error);
    return NextResponse.json(
      { error: "Erro ao gerar QR Code" },
      { status: 500 }
    );
  }
}