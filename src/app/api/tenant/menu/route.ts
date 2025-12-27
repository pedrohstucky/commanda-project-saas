import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { logger } from "@/lib/logger";
/**
 * GET /api/tenant/menu
 * Busca cardápio completo do tenant (TODOS OS PLANOS)
 * Autenticado via x-instance-token
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validar instance_token
    const instanceToken = request.headers.get("x-instance-token");

    if (!instanceToken) {
      return NextResponse.json(
        { success: false, error: "instance_token não fornecido" },
        { status: 401 }
      );
    }

    logger.debug("🔍 Buscando cardápio via instance_token");

    // 2. Buscar instância WhatsApp
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("tenant_id, instance_token")
      .eq("instance_token", instanceToken)
      .single();

    if (instanceError || !instance) {
      logger.debug("❌ Instância não encontrada");
      return NextResponse.json(
        { success: false, error: "Instância não encontrada" },
        { status: 404 }
      );
    }

    logger.debug("✅ Instância encontrada, tenant_id:", instance.tenant_id);

    // 3. Buscar dados do tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, theme_color, whatsapp_number, subscription_plan")
      .eq("id", instance.tenant_id)
      .single();

    if (tenantError || !tenant) {
      logger.debug("❌ Tenant não encontrado");
      return NextResponse.json(
        { success: false, error: "Tenant não encontrado" },
        { status: 404 }
      );
    }
    logger.debug("Tenant encontrado", {
      name: tenant.name,
      plan: tenant.subscription_plan,
    });

    // 4. Buscar categorias ativas
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from("categories")
      .select("id, name, description, display_order")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("display_order");

    if (categoriesError) {
      logger.error("❌ Erro ao buscar categorias:", categoriesError);
      throw categoriesError;
    }

    logger.debug(`📁 ${categories?.length || 0} categoria(s) encontrada(s)`);

    // 5. Buscar produtos disponíveis com variações e extras
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select(
        `
        id,
        name,
        description,
        price,
        category_id,
        image_url,
        is_available,
        product_variations(
          id,
          name,
          price,
          display_order,
          is_available
        ),
        product_extras(
          id,
          name,
          price,
          display_order,
          is_available
        )
      `
      )
      .eq("tenant_id", tenant.id)
      .eq("is_available", true)
      .order("name");

    if (productsError) {
      logger.error("❌ Erro ao buscar produtos:", productsError);
      throw productsError;
    }

    logger.debug(`🍕 ${products?.length || 0} produto(s) encontrado(s)`);

    // 6. Retornar dados
    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          subscription_plan: tenant.subscription_plan,
          whatsapp_number: tenant.whatsapp_number,
        },
        categories: categories || [],
        products: products || [],
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar cardápio:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro ao buscar cardápio",
      },
      { status: 500 }
    );
  }
}
