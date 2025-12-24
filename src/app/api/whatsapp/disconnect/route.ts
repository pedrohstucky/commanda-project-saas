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

    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("instance_token")
      .eq("tenant_id", profile.tenant_id)
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

    // Atualizar status no banco
    await supabase
      .from("whatsapp_instances")
      .update({
        status: "disconnected",
        phone_number: null,
        qr_code: null,
        updated_at: new Date().toISOString()
      })
      .eq("tenant_id", profile.tenant_id);

    return NextResponse.json({
      success: true,
      message: "WhatsApp desconectado com sucesso",
      uazapi: uazapiData
    });

  } catch (error) {
    console.error("Erro ao desconectar WhatsApp:", error);
    return NextResponse.json(
      { error: "Erro ao desconectar WhatsApp" },
      { status: 500 }
    );
  }
}