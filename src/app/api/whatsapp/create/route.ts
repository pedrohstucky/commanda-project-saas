import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createInstance,
  configureWebhook,
  connectInstanceWithRetry,
} from "@/lib/uazapi/client";
import { generateApiKey } from "@/lib/utils";
import type { Database } from "@/types/database";

type WhatsAppInstanceInsert =
  Database["public"]["Tables"]["whatsapp_instances"]["Insert"];

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
      .select("subscription_status, name")
      .eq("id", profile.tenant_id)
      .single();

    if (tenant?.subscription_status !== 'active') {
      return NextResponse.json({ 
        error: "Subscription inativa. Ative sua assinatura para criar instância." 
      }, { status: 403 });
    }

    // Deletar instância antiga se existir
    const { data: existingInstance } = await supabase
      .from("whatsapp_instances")
      .select("id, instance_token")
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (existingInstance) {
      console.log("Deletando instância antiga...");
      await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("tenant_id", profile.tenant_id);
    }

    // Verificar ENV vars
    if (!process.env.N8N_WEBHOOK_URL) {
      console.error("❌ N8N_WEBHOOK_URL não configurada");
      return NextResponse.json({ error: "Configuração do servidor incompleta" }, { status: 500 });
    }

    // Criar nome da instância
    const instanceName = `tenant_${profile.tenant_id.substring(0, 8)}`;
    
    console.log("📱 Criando instância Uazapi:", instanceName);

    // Criar instância na Uazapi
    const instance = await createInstance({
      name: instanceName,
      systemName: "commanda",
      adminField01: profile.tenant_id,
      adminField02: user.id,
    });

    console.log("✅ Instância criada:", instance.id);

    // Conectar instância e gerar QR Code
    console.log("🔗 Conectando instância...");
    
    const connection = await connectInstanceWithRetry({
      instanceToken: instance.token,
      maxRetries: 5,
    });

    if (!connection.instance.qrcode) {
      console.error("❌ QR Code não foi gerado");
      throw new Error("QR Code não foi gerado. Tente novamente.");
    }

    console.log("✅ QR Code gerado");

    // Configurar webhook
    console.log("🔔 Configurando webhook...");
    
    await configureWebhook({
      instanceToken: instance.token,
      webhookUrl: process.env.N8N_WEBHOOK_URL,
      events: ["messages", "connection"],
    });

    console.log("✅ Webhook configurado");

    // Gerar API Key
    const apiKey = generateApiKey(profile.tenant_id);

    // Salvar no banco
    const instanceInsert: WhatsAppInstanceInsert = {
      tenant_id: profile.tenant_id,
      instance_id: instance.id,
      instance_token: instance.token,
      instance_name: instanceName,
      api_key: apiKey,
      status: "connecting",
      qr_code: connection.instance.qrcode,
      pair_code: connection.instance.paircode || null,
      profile_name: connection.instance.profileName || null,
      profile_pic_url: connection.instance.profilePicUrl || null,
      is_business: connection.instance.isBusiness || false,
      webhook_url: process.env.N8N_WEBHOOK_URL,
    };

    const { data: newInstance, error: insertError } = await supabase
      .from("whatsapp_instances")
      .insert(instanceInsert)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Erro ao salvar instância:", insertError);
      return NextResponse.json(
        { error: "Erro ao salvar instância no banco", details: insertError },
        { status: 500 }
      );
    }

    console.log("✅ Instância salva no banco");

    return NextResponse.json({
      success: true,
      message: "Instância criada com sucesso",
      instance: newInstance,
      qrcode: connection.instance.qrcode,
      paircode: connection.instance.paircode || null
    });

  } catch (error) {
    console.error("❌ Erro ao criar instância:", error);
    return NextResponse.json(
      { error: "Erro ao criar instância", details: String(error) },
      { status: 500 }
    );
  }
}