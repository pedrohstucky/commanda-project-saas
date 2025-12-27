import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

import { logger } from "@/lib/logger";
/**
 * GET /api/public/menu/[slug]
 * Busca cardápio público completo por slug
 * Endpoint público (sem autenticação)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    logger.debug("🔍 Buscando cardápio para slug:", slug)

    // 1. Buscar tenant pelo slug
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("slug", slug)
      .eq("menu_enabled", true)
      .single()

    if (tenantError || !tenant) {
      logger.debug("❌ Tenant não encontrado ou menu desabilitado")
      return NextResponse.json(
        { success: false, error: "Cardápio não encontrado" },
        { status: 404 }
      )
    }

    logger.debug("✅ Tenant encontrado:", tenant.name)

    // 2. Verificar se é premium
    if (tenant.subscription_plan !== "premium") {
      logger.debug("⚠️ Tenant não é premium")
      return NextResponse.json(
        { success: false, error: "Cardápio não disponível" },
        { status: 403 }
      )
    }

    // 3. Buscar categorias ativas
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("display_order")

    if (categoriesError) {
      logger.error("❌ Erro ao buscar categorias:", categoriesError)
      throw categoriesError
    }

    logger.debug(`📁 ${categories?.length || 0} categoria(s) encontrada(s)`)

    // 4. Buscar produtos disponíveis com variações e extras
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select(`
        *,
        category:categories(*),
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
      `)
      .eq("tenant_id", tenant.id)
      .eq("is_available", true)
      .order("name")

    if (productsError) {
      logger.error("❌ Erro ao buscar produtos:", productsError)
      throw productsError
    }

    logger.debug(`🍕 ${products?.length || 0} produto(s) encontrado(s)`)

    // 5. Registrar visualização (analytics)
    await supabaseAdmin.from("menu_analytics").insert({
      tenant_id: tenant.id,
      event_type: "view",
      user_agent: request.headers.get("user-agent"),
      referrer: request.headers.get("referer"),
    })

    // 6. Retornar dados
    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          theme_color: tenant.theme_color,
          whatsapp_number: tenant.whatsapp_number,
          welcome_message: tenant.welcome_message,
          social_links: tenant.social_links,
          opening_hours: tenant.opening_hours,
        },
        categories: categories || [],
        products: products || [],
      },
    })
  } catch (error) {
    logger.error("❌ Erro ao buscar cardápio:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao buscar cardápio",
      },
      { status: 500 }
    )
  }
}