import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  createInstance,
  configureWebhook,
  deleteInstance,
  connectInstanceWithRetry,
} from "@/lib/uazapi/client";
import { generateApiKey } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

// Types auxiliares
type TenantInsert = Database["public"]["Tables"]["tenants"]["Insert"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type WhatsAppInstanceInsert =
  Database["public"]["Tables"]["whatsapp_instances"]["Insert"];

interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  restaurantName: string;
}

interface RegisterResponse {
  success: boolean;
  data?: {
    userId: string;
    tenantId: string;
    qrCode: string;
    pairCode?: string | null;
    credentials: {
      email: string;
      password: string;
    };
  };
  error?: string;
}

// =====================================================
// HELPERS DE VALIDAÇÃO
// =====================================================

function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || email.trim().length === 0) {
    return { valid: false, error: "Email é obrigatório" };
  }

  if (!emailRegex.test(email)) {
    return { valid: false, error: "Email inválido" };
  }

  return { valid: true };
}

function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (!password || password.length < 8) {
    return { valid: false, error: "Senha deve ter no mínimo 8 caracteres" };
  }

  return { valid: true };
}

function validateName(
  name: string,
  fieldName: string
): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: `${fieldName} é obrigatório` };
  }

  if (name.trim().length < 3) {
    return {
      valid: false,
      error: `${fieldName} deve ter no mínimo 3 caracteres`,
    };
  }

  if (name.length > 255) {
    return {
      valid: false,
      error: `${fieldName} muito longo (máximo 255 caracteres)`,
    };
  }

  return { valid: true };
}

function sanitizeInstanceName(tenantId: string): string {
  const sanitized = tenantId
    .slice(0, 8)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `restaurant_${sanitized}`;
}

// =====================================================
// ROLLBACK FUNCTION
// =====================================================

interface RollbackParams {
  userId: string | null;
  tenantId: string | null;
  instanceToken: string | null;
}

async function rollbackOnboarding(params: RollbackParams): Promise<void> {
  console.log("🔄 Iniciando rollback...");

  const { userId, tenantId, instanceToken } = params;

  // 1. Deletar instância Uazapi
  if (instanceToken) {
    try {
      console.log("🗑️ Deletando instância Uazapi...");
      await deleteInstance(instanceToken);
      console.log("✅ Instância Uazapi deletada");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error("⚠️ Erro ao deletar instância Uazapi:", errorMessage);
    }
  }

  // 2. Deletar whatsapp_instance
  if (tenantId) {
    try {
      console.log("🗑️ Deletando whatsapp_instances...");
      await supabaseAdmin
        .from("whatsapp_instances")
        .delete()
        .eq("tenant_id", tenantId);
      console.log("✅ whatsapp_instances deletado");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error("⚠️ Erro ao deletar whatsapp_instances:", errorMessage);
    }
  }

  // 3. Deletar tenant (CASCADE deleta profile)
  if (tenantId) {
    try {
      console.log("🗑️ Deletando tenant...");
      await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
      console.log("✅ Tenant deletado");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error("⚠️ Erro ao deletar tenant:", errorMessage);
    }
  }

  // 4. Deletar auth.user
  if (userId) {
    try {
      console.log("🗑️ Deletando usuário do Auth...");
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log("✅ Usuário deletado");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error("⚠️ Erro ao deletar usuário:", errorMessage);
    }
  }

  console.log("✅ Rollback concluído");
}

// =====================================================
// MAIN HANDLER
// =====================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<RegisterResponse>> {
  let createdUserId: string | null = null;
  let createdTenantId: string | null = null;
  let createdInstanceToken: string | null = null;

  try {
    // =====================================================
    // 0. VERIFICAR ENV VARS
    // =====================================================
    if (!process.env.N8N_WEBHOOK_URL) {
      console.error("❌ N8N_WEBHOOK_URL não configurada");
      throw new Error("Configuração do servidor incompleta");
    }

    // =====================================================
    // 1. VALIDAR INPUT
    // =====================================================
    const body = (await request.json()) as RegisterRequest;

    const { email, password, fullName, restaurantName } = body;

    // Validar email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    // Validar senha
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Validar nome completo
    const nameValidation = validateName(fullName, "Nome completo");
    if (!nameValidation.valid) {
      return NextResponse.json(
        { success: false, error: nameValidation.error },
        { status: 400 }
      );
    }

    // Validar nome do restaurante
    const restaurantValidation = validateName(
      restaurantName,
      "Nome do restaurante"
    );
    if (!restaurantValidation.valid) {
      return NextResponse.json(
        { success: false, error: restaurantValidation.error },
        { status: 400 }
      );
    }

    // =====================================================
    // 2. CRIAR AUTH.USER
    // =====================================================
    if (process.env.NODE_ENV === "development") {
      console.log("📝 Criando usuário...");
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
        },
      });

    if (authError) {
      if (
        authError.message.toLowerCase().includes("already") ||
        authError.message.toLowerCase().includes("duplicate") ||
        authError.message.toLowerCase().includes("exists")
      ) {
        return NextResponse.json(
          { success: false, error: "Este email já está cadastrado" },
          { status: 400 }
        );
      }

      console.error("❌ Erro ao criar usuário:", authError);
      throw new Error("Falha ao criar usuário");
    }

    if (!authData?.user) {
      throw new Error("Usuário não retornado pelo Supabase");
    }

    createdUserId = authData.user.id;

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Usuário criado:", createdUserId);
    }

    // =====================================================
    // 3. CRIAR TENANT
    // =====================================================
    if (process.env.NODE_ENV === "development") {
      console.log("🏢 Criando tenant...");
    }

    const tenantInsert: TenantInsert = {
      name: restaurantName.trim(),
      owner_id: createdUserId,
    };

    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert(tenantInsert)
      .select()
      .single();

    if (tenantError || !tenantData) {
      console.error("❌ Erro ao criar tenant:", tenantError);
      throw new Error("Falha ao criar restaurante");
    }

    createdTenantId = tenantData.id;
    if (process.env.NODE_ENV === "development") {
      console.log("✅ Tenant criado:", createdTenantId);
    }

    // =====================================================
    // 4. CRIAR PROFILE
    // =====================================================
    if (process.env.NODE_ENV === "development") {
      console.log("👤 Criando profile...");
    }

    const profileInsert: ProfileInsert = {
      id: createdUserId,
      tenant_id: createdTenantId,
      full_name: fullName.trim(),
    };

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert(profileInsert);

    if (profileError) {
      console.error("❌ Erro ao criar profile:", profileError);
      throw new Error("Falha ao criar perfil");
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Profile criado");
    }

    // =====================================================
    // 5. CRIAR INSTÂNCIA UAZAPI
    // =====================================================
    const instanceName = sanitizeInstanceName(createdTenantId);

    const instance = await createInstance({
      name: instanceName,
      systemName: "platoo",
      adminField01: createdTenantId,
      adminField02: process.env.NODE_ENV || "production",
    });

    createdInstanceToken = instance.token;

    // =====================================================
    // 6. CONECTAR INSTÂNCIA
    // =====================================================

    const connection = await connectInstanceWithRetry({
      instanceToken: instance.token,
      maxRetries: 5,
    });

    if (!connection.instance.qrcode) {
      console.error("❌ QR Code não foi gerado após todas as tentativas");
      throw new Error(
        "QR Code não foi gerado. Verifique o dashboard da Uazapi."
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ QR Code gerado");
      console.log("📏 QR Code length:", connection.instance.qrcode.length);
    }

    // =====================================================
    // 7. CONFIGURAR WEBHOOK
    // =====================================================
    if (process.env.NODE_ENV === "development") {
      console.log("🔔 Configurando webhook...");
    }

    await configureWebhook({
      instanceToken: instance.token,
      webhookUrl: process.env.N8N_WEBHOOK_URL,
      events: ["messages", "connection"],
    });

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Webhook configurado");
    }

    // =====================================================
    // 8. SALVAR NO BANCO
    // =====================================================
    if (process.env.NODE_ENV === "development") {
      console.log("💾 Salvando instância...");
    }

    const apiKey = generateApiKey(createdTenantId);

    const instanceInsert: WhatsAppInstanceInsert = {
      tenant_id: createdTenantId,
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

    const { error: instanceError } = await supabaseAdmin
      .from("whatsapp_instances")
      .insert(instanceInsert);

    if (instanceError) {
      console.error("❌ Erro ao salvar instância:", instanceError);
      throw new Error("Falha ao salvar instância");
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Instância salva");
      console.log("🎉 Onboarding completo!");
    }

    // =====================================================
    // 9. SUCESSO
    // =====================================================
    return NextResponse.json<RegisterResponse>(
      {
        success: true,
        data: {
          userId: createdUserId,
          tenantId: createdTenantId,
          qrCode: connection.instance.qrcode,
          pairCode: connection.instance.paircode || null,
          credentials: {
            email: email.trim().toLowerCase(),
            password: password,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // =====================================================
    // ROLLBACK EM CASO DE ERRO
    // =====================================================
    const errorMessage =
      error instanceof Error ? error.message : "Erro ao criar conta";
    console.error("❌ Erro no onboarding:", errorMessage);

    await rollbackOnboarding({
      userId: createdUserId,
      tenantId: createdTenantId,
      instanceToken: createdInstanceToken,
    });

    return NextResponse.json<RegisterResponse>(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
