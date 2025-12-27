import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authenticateTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
/**
 * Request body para criar pedido
 */
interface CreateOrderRequest {
  customer: {
    phone: string;
    name?: string;
  };
  delivery_type: "delivery" | "pickup";
  delivery_address?: string;
  notes?: string;
  items: Array<{
    product_id: string | string[];
    quantity: number | number[];
    variation_id?: string | string[];
    extras?: string[] | string[][];
  }>;
}

/**
 * Response de sucesso
 */
interface CreateOrderResponse {
  success: boolean;
  data?: {
    order_id: string;
    total: number;
    items_count: number;
    status: string;
  };
  error?: string;
}

/**
 * Tipos do banco
 */
interface Product {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface ProductVariation {
  id: string;
  product_id: string;
  name: string;
  price: number
  is_available: boolean;
}

interface ProductExtra {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface NormalizedItem {
  product_id: string;
  quantity: number;
  variation_id?: string;
  extras?: string[];
}

interface OrderItemData {
  product_id: string;
  quantity: number;
  product_price: number;
  variation_id?: string;
  extras: string[];
}

/**
 * Normaliza items para formato padrão
 */
function normalizeItems(items: CreateOrderRequest["items"]): NormalizedItem[] {
  const normalized: NormalizedItem[] = [];

  for (const item of items) {
    if (Array.isArray(item.product_id)) {
      const productIds = item.product_id;
      const quantities = Array.isArray(item.quantity)
        ? item.quantity
        : Array(productIds.length).fill(item.quantity);
      const variationIds = Array.isArray(item.variation_id)
        ? item.variation_id
        : Array(productIds.length).fill(item.variation_id);
      const extrasArray = Array.isArray(item.extras?.[0])
        ? (item.extras as string[][])
        : Array(productIds.length).fill(item.extras || []);

      if (quantities.length !== productIds.length) {
        throw new Error(
          "Arrays de product_id e quantity devem ter o mesmo tamanho"
        );
      }

      for (let i = 0; i < productIds.length; i++) {
        normalized.push({
          product_id: productIds[i],
          quantity: quantities[i],
          variation_id: variationIds[i] || undefined,
          extras: Array.isArray(extrasArray[i]) ? extrasArray[i] : [],
        });
      }
    } else {
      normalized.push({
        product_id: item.product_id,
        quantity: Array.isArray(item.quantity)
          ? item.quantity[0]
          : item.quantity,
        variation_id: Array.isArray(item.variation_id)
          ? item.variation_id[0]
          : item.variation_id,
        extras: Array.isArray(item.extras)
          ? Array.isArray(item.extras[0])
            ? (item.extras[0] as string[])
            : (item.extras as string[])
          : [],
      });
    }
  }

  return normalized;
}

/**
 * POST /api/tenant/orders
 * Cria um novo pedido
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateOrderResponse>> {
  try {
    // 1. Autenticar tenant
    const auth = await authenticateTenant(request);

    if (!auth.success) {
      logger.error("❌ Autenticação falhou:", auth.error);
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const { tenantId } = auth.tenant;
    logger.debug("✅ Tenant autenticado:", tenantId);

    // 2. Parsear body
    const body = (await request.json()) as CreateOrderRequest;
    logger.debug("📥 Payload recebido:", { body: JSON.stringify(body, null, 2) });

    // 3. Validar dados obrigatórios
    if (!body.customer?.phone) {
      return NextResponse.json(
        { success: false, error: "Telefone do cliente é obrigatório" },
        { status: 400 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pedido deve ter pelo menos 1 item" },
        { status: 400 }
      );
    }

    if (
      !body.delivery_type ||
      !["delivery", "pickup"].includes(body.delivery_type)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tipo de entrega inválido. Use "delivery" ou "pickup"',
        },
        { status: 400 }
      );
    }

    if (body.delivery_type === "delivery" && !body.delivery_address) {
      return NextResponse.json(
        {
          success: false,
          error: "Endereço de entrega é obrigatório para pedidos delivery",
        },
        { status: 400 }
      );
    }

    // 4. Normalizar items
    let normalizedItems: NormalizedItem[];

    try {
      normalizedItems = normalizeItems(body.items);
      logger.debug(
        "📦 Items normalizados:",
        JSON.stringify(normalizedItems, null, 2)
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Erro ao processar items",
        },
        { status: 400 }
      );
    }

    // 5. Buscar produtos
    const productIds = normalizedItems.map((item) => item.product_id);

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, is_available")
      .eq("tenant_id", tenantId)
      .in("id", productIds);

    if (productsError) {
      logger.error("❌ Erro ao buscar produtos:", productsError);
      throw productsError;
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum produto encontrado" },
        { status: 400 }
      );
    }

    // 6. Buscar variações (se houver)
    const variationIds = normalizedItems
      .filter((item) => item.variation_id)
      .map((item) => item.variation_id!);

    let variations: ProductVariation[] = [];

    if (variationIds.length > 0) {
      const { data: variationsData, error: variationsError } =
        await supabaseAdmin
          .from("product_variations")
          .select("id, product_id, name, price, is_available")
          .in("id", variationIds);

      if (variationsError) {
        logger.error("❌ Erro ao buscar variações:", variationsError);
        throw variationsError;
      }

      variations = (variationsData || []) as ProductVariation[];
    }

    // 7. Buscar extras (se houver)
    const extraIds = normalizedItems
      .flatMap((item) => item.extras || [])
      .filter(Boolean);

    let extras: ProductExtra[] = [];

    if (extraIds.length > 0) {
      const { data: extrasData, error: extrasError } = await supabaseAdmin
        .from("product_extras")
        .select("id, product_id, name, price, is_available")
        .in("id", extraIds);

      if (extrasError) {
        logger.error("❌ Erro ao buscar extras:", extrasError);
        throw extrasError;
      }

      extras = (extrasData || []) as ProductExtra[];
    }

    logger.debug(
      `✅ ${products.length} produto(s), ${variations.length} variação(ões) e ${extras.length} extra(s) encontrados`
    );

    // 8. Verificar disponibilidade
    const unavailable = products.filter((p) => !p.is_available);
    if (unavailable.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Produtos indisponíveis: ${unavailable
            .map((p) => p.name)
            .join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 9. Calcular total COM VARIAÇÕES E EXTRAS
    const productsMap = new Map(
      (products as Product[]).map((p) => [p.id, p])
    );
    const variationsMap = new Map(variations.map((v) => [v.id, v]));
    const extrasMap = new Map(extras.map((e) => [e.id, e]));

    let totalAmount = 0;
    const orderItems: OrderItemData[] = [];

    for (const item of normalizedItems) {
      const product = productsMap.get(item.product_id);
      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: `Produto ${item.product_id} não encontrado`,
          },
          { status: 400 }
        );
      }

      let finalPrice = product.price;
      let variationId: string | undefined = undefined;

      // Aplicar variação
      if (item.variation_id) {
        const variation = variationsMap.get(item.variation_id);

        if (!variation) {
          return NextResponse.json(
            {
              success: false,
              error: `Variação ${item.variation_id} não encontrada`,
            },
            { status: 400 }
          );
        }

        if (variation.product_id !== product.id) {
          return NextResponse.json(
            {
              success: false,
              error: `Variação não pertence ao produto ${product.name}`,
            },
            { status: 400 }
          );
        }

        if (!variation.is_available) {
          return NextResponse.json(
            {
              success: false,
              error: `Variação "${variation.name}" está indisponível`,
            },
            { status: 400 }
          );
        }

        // ✅ MUDADO: usar preço direto da variação
        finalPrice = variation.price;
        variationId = variation.id;

        logger.debug(
          `📏 Variação aplicada: ${product.name} ${variation.name} (R$ ${variation.price.toFixed(2)})`
        );
      }

      // Calcular preço dos extras
      let extrasPrice = 0;
      const validExtras: string[] = [];

      if (item.extras && item.extras.length > 0) {
        for (const extraId of item.extras) {
          const extra = extrasMap.get(extraId);

          if (!extra) {
            return NextResponse.json(
              {
                success: false,
                error: `Extra ${extraId} não encontrado`,
              },
              { status: 400 }
            );
          }

          if (extra.product_id !== product.id) {
            return NextResponse.json(
              {
                success: false,
                error: `Extra "${extra.name}" não pertence ao produto ${product.name}`,
              },
              { status: 400 }
            );
          }

          if (!extra.is_available) {
            return NextResponse.json(
              {
                success: false,
                error: `Extra "${extra.name}" está indisponível`,
              },
              { status: 400 }
            );
          }

          extrasPrice += extra.price;
          validExtras.push(extra.id);

          logger.debug(
            `➕ Extra adicionado: ${extra.name} (+R$ ${extra.price.toFixed(
              2
            )})`
          );
        }
      }

      // Preço final = produto/variação + extras
      const itemPrice = finalPrice + extrasPrice;
      const subtotal = itemPrice * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        product_id: item.product_id,
        product_price: finalPrice,
        quantity: item.quantity,
        variation_id: variationId,
        extras: validExtras,
      });

      // ✅ MUDADO: log mais claro
      const variationName = item.variation_id ? ` (${variationsMap.get(item.variation_id)?.name})` : '';
      logger.debug(
        `💵 Item: ${product.name}${variationName} - Preço: R$ ${finalPrice.toFixed(
          2
        )} + Extras: R$ ${extrasPrice.toFixed(2)} = R$ ${itemPrice.toFixed(
          2
        )} x ${item.quantity} = R$ ${subtotal.toFixed(2)}`
      );
    }

    logger.debug(`💰 Total calculado: R$ ${totalAmount.toFixed(2)}`);

    // 10. Buscar owner do tenant
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("owner_id")
      .eq("id", tenantId)
      .single();

    if (!tenant?.owner_id) {
      logger.error("❌ Tenant owner não encontrado");
      throw new Error("Tenant owner não encontrado");
    }

    // 11. Criar pedido
    const orderData = {
      tenant_id: tenantId,
      customer_name: body.customer.name || null,
      customer_phone: body.customer.phone,
      delivery_type: body.delivery_type,
      delivery_address:
        body.delivery_type === "delivery" ? body.delivery_address : null,
      notes: body.notes || null,
      status: "pending" as const,
      total_amount: totalAmount,
      created_by: tenant.owner_id,
    };

    logger.debug(
      "💾 Dados do pedido a serem salvos:",
      JSON.stringify(orderData, null, 2)
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert(orderData)
      .select(
        "id, customer_name, customer_phone, delivery_type, delivery_address, total_amount, status"
      )
      .single();

    if (orderError || !order) {
      logger.error("❌ Erro ao criar pedido:", orderError);
      throw orderError;
    }

    logger.debug("✅ Pedido criado no banco:", { order: JSON.stringify(order, null, 2) });

    // 12. Criar itens do pedido
    const itemsToInsert = orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_price: item.product_price,
      quantity: item.quantity,
      variation_id: item.variation_id ?? undefined,
    }));

    logger.debug(`📦 Inserindo ${itemsToInsert.length} item(ns)...`);

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(itemsToInsert)
      .select("id");

    if (itemsError || !insertedItems) {
      logger.error("❌ Erro ao criar itens:", itemsError);
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw itemsError;
    }

    // 13. Criar extras dos itens
    const extrasToInsert: Array<{
      order_item_id: string;
      extra_id: string;
    }> = [];

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const orderItemId = insertedItems[i].id;

      if (item.extras && item.extras.length > 0) {
        for (const extraId of item.extras) {
          extrasToInsert.push({
            order_item_id: orderItemId,
            extra_id: extraId,
          });
        }
      }
    }

    if (extrasToInsert.length > 0) {
      logger.debug(`➕ Inserindo ${extrasToInsert.length} extra(s)...`);

      const { error: extrasError } = await supabaseAdmin
        .from("order_item_extras")
        .insert(extrasToInsert);

      if (extrasError) {
        logger.error("❌ Erro ao criar extras:", extrasError);
        await supabaseAdmin.from("orders").delete().eq("id", order.id);
        throw extrasError;
      }
    }

    logger.debug(`✅ Pedido ${order.id} criado com sucesso via API`);
    logger.debug(
      `📱 Cliente: ${order.customer_name || "Sem nome"} (${
        order.customer_phone
      })`
    );
    logger.debug(
      `📍 ${
        order.delivery_type === "delivery"
          ? `Entrega: ${order.delivery_address}`
          : "Retirada no local"
      }`
    );

    // 14. Retornar sucesso
    return NextResponse.json(
      {
        success: true,
        data: {
          order_id: order.id,
          total: order.total_amount,
          items_count: orderItems.length,
          status: order.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("❌ Erro na API de pedidos:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao criar pedido",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tenant/orders
 * Lista pedidos do tenant
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateTenant(request);

    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const { tenantId } = auth.tenant;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        customer_name,
        customer_phone,
        delivery_type,
        delivery_address,
        total_amount,
        status,
        notes,
        created_at,
        accepted_at,
        completed_at,
        cancelled_at,
        order_items (
          id,
          product_id,
          product_name,
          variation_id,
          variation_name,
          quantity,
          product_price,
          subtotal,
          order_item_extras (
            id,
            extra_id,
            extra_name,
            extra_price
          )
        )
      `,
        { count: "exact" }
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (
      status &&
      ["pending", "preparing", "completed", "cancelled"].includes(status)
    ) {
      query = query.eq("status", status);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao listar pedidos:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro ao listar pedidos",
      },
      { status: 500 }
    );
  }
}