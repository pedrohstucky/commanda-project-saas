import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  createInstance,
  configureWebhook,
  connectInstanceWithRetry,
} from "@/lib/uazapi/client";
import { generateApiKey } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

import { logger } from "@/lib/logger";
type WhatsAppInstanceInsert =
  Database["public"]["Tables"]["whatsapp_instances"]["Insert"];

export async function POST(request: NextRequest) {
  try {
    logger.debug("=== CREATE INSTANCE START ===");
    
    const body = await request.json().catch(() => ({}));
    const { tenantId } = body;

    // Verificar se é chamada do Inngest
    const inngestSecret = request.headers.get("x-inngest-secret");
    
    logger.debug("Headers recebidos:", {
      inngestSecret: inngestSecret ? "presente" : "ausente",
      expectedSecret: process.env.INNGEST_INTERNAL_SECRET ? "configurado" : "não configurado"
    });
    
    logger.debug("Body recebido:", { tenantId });

    let finalTenantId: string;

    if (inngestSecret === process.env.INNGEST_INTERNAL_SECRET && tenantId) {
      // Chamada do Inngest - usar tenantId do body
      finalTenantId = tenantId;
      logger.debug("🔧 Chamada do Inngest para tenant:", finalTenantId);
    } else {
      // Chamada normal - verificar auth
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        logger.debug("❌ Erro de autenticação:", authError);
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        logger.debug("❌ Perfil não encontrado");
        return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
      }

      finalTenantId = profile.tenant_id;
    }

    logger.debug("Tenant ID final:", finalTenantId);

    // Verificar se subscription está ativa
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("subscription_status, name")
      .eq("id", finalTenantId)
      .single();

    logger.debug("Tenant data:", tenant);

    if (tenant?.subscription_status !== 'active') {
      return NextResponse.json({ 
        error: "Subscription inativa. Ative sua assinatura para criar instância." 
      }, { status: 403 });
    }

    // Deletar instância antiga se existir
    const { data: existingInstance } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("id, instance_token")
      .eq("tenant_id", finalTenantId)
      .single();

    if (existingInstance) {
      logger.debug("Deletando instância antiga...");
      await supabaseAdmin
        .from("whatsapp_instances")
        .delete()
        .eq("tenant_id", finalTenantId);
    }

    // Verificar ENV vars
    if (!process.env.N8N_WEBHOOK_URL) {
      logger.error("❌ N8N_WEBHOOK_URL não configurada");
      return NextResponse.json({ error: "Configuração do servidor incompleta" }, { status: 500 });
    }

    // Criar nome da instância
    const instanceName = `tenant_${finalTenantId.substring(0, 8)}`;
    
    logger.debug("📱 Criando instância Uazapi:", instanceName);

    // Criar instância na Uazapi
    const instance = await createInstance({
      name: instanceName,
      systemName: "platoo",
      adminField01: finalTenantId,
      adminField02: "system",
    });

    logger.debug("✅ Instância criada:", instance.id);

    // Conectar instância e gerar QR Code
    logger.debug("🔗 Conectando instância...");
    
    const connection = await connectInstanceWithRetry({
      instanceToken: instance.token,
      maxRetries: 5,
    });

    if (!connection.instance.qrcode) {
      logger.error("❌ QR Code não foi gerado");
      throw new Error("QR Code não foi gerado. Tente novamente.");
    }

    logger.debug("✅ QR Code gerado");

    // Configurar webhook
    logger.debug("🔔 Configurando webhook...");
    
    await configureWebhook({
      instanceToken: instance.token,
      webhookUrl: process.env.N8N_WEBHOOK_URL,
      events: ["messages", "connection"],
    });

    logger.debug("✅ Webhook configurado");

    // Gerar API Key
    const apiKey = generateApiKey(finalTenantId);

    // Salvar no banco
    const instanceInsert: WhatsAppInstanceInsert = {
      tenant_id: finalTenantId,
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

    const { data: newInstance, error: insertError } = await supabaseAdmin
      .from("whatsapp_instances")
      .insert(instanceInsert)
      .select()
      .single();

    if (insertError) {
      logger.error("❌ Erro ao salvar instância:", insertError);
      return NextResponse.json(
        { error: "Erro ao salvar instância no banco", details: insertError },
        { status: 500 }
      );
    }

    logger.debug("✅ Instância salva no banco");
    logger.debug("=== CREATE INSTANCE END ===");

    return NextResponse.json({
      success: true,
      message: "Instância criada com sucesso",
      instance: newInstance,
      qrcode: connection.instance.qrcode,
      paircode: connection.instance.paircode || null
    });

  } catch (error) {
    logger.error("❌ Erro ao criar instância:", error);
    return NextResponse.json(
      { error: "Erro ao criar instância", details: String(error) },
      { status: 500 }
    );
  }
}