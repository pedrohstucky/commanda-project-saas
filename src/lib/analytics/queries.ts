import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import type { AnalyticsMetrics, DailyRevenue, TopProduct, CategoryStats } from "./types"
import { startOfDay, endOfDay, format } from "date-fns"

/* -------------------------------------------------------------------------- */
/*                                TYPES                                       */
/* -------------------------------------------------------------------------- */

interface OrderData {
  total_amount: number
  status: string
  created_at: string
}

interface OrderItemData {
  product_id: string
  product_name: string
  quantity: number
  subtotal: number
  orders: {
    tenant_id: string
    status: string
    created_at: string
  }
}

interface ProductData {
  id: string
  category_id: string
  categories: {
    name: string
  } | null
}

interface CategoryItemData {
  product_id: string
  quantity: number
  subtotal: number
  orders: {
    tenant_id: string
    status: string
    created_at: string
  }
}

/* -------------------------------------------------------------------------- */
/*                                FUNCTIONS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Busca métricas principais
 */
export async function getAnalyticsMetrics(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsMetrics> {
  const supabase = createBrowserSupabaseClient()

  // Buscar pedidos do período
  const { data: orders, error } = await supabase
    .from("orders")
    .select("total_amount, status, created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", startOfDay(startDate).toISOString())
    .lte("created_at", endOfDay(endDate).toISOString())
    .returns<OrderData[]>()

  if (error || !orders) {
    throw new Error("Erro ao buscar métricas")
  }

  // Calcular métricas
  const completedOrders = orders.filter((o) => o.status === "completed")
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total_amount, 0)
  const totalOrders = orders.length
  const completedCount = completedOrders.length
  const averageTicket = completedCount > 0 ? totalRevenue / completedCount : 0
  const conversionRate = totalOrders > 0 ? (completedCount / totalOrders) * 100 : 0

  return {
    totalRevenue,
    totalOrders,
    averageTicket,
    conversionRate,
    growthRate: 0,
  }
}

/**
 * Busca receita diária
 */
export async function getDailyRevenue(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyRevenue[]> {
  const supabase = createBrowserSupabaseClient()

  const { data: orders, error } = await supabase
    .from("orders")
    .select("total_amount, created_at, status")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .gte("created_at", startOfDay(startDate).toISOString())
    .lte("created_at", endOfDay(endDate).toISOString())
    .order("created_at")
    .returns<OrderData[]>()

  if (error || !orders) {
    throw new Error("Erro ao buscar receita diária")
  }

  // Agrupar por dia
  const dailyMap: Record<string, { revenue: number; orders: number }> = {}

  orders.forEach((order) => {
    const date = format(new Date(order.created_at), "yyyy-MM-dd")
    if (!dailyMap[date]) {
      dailyMap[date] = { revenue: 0, orders: 0 }
    }
    dailyMap[date].revenue += order.total_amount
    dailyMap[date].orders += 1
  })

  // Converter para array
  return Object.entries(dailyMap)
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Busca top produtos
 */
export async function getTopProducts(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  limit = 10
): Promise<TopProduct[]> {
  const supabase = createBrowserSupabaseClient()

  const { data: items, error } = await supabase
    .from("order_items")
    .select(
      `
      product_id,
      product_name,
      quantity,
      subtotal,
      orders!inner(
        tenant_id,
        status,
        created_at
      )
    `
    )
    .eq("orders.tenant_id", tenantId)
    .eq("orders.status", "completed")
    .gte("orders.created_at", startOfDay(startDate).toISOString())
    .lte("orders.created_at", endOfDay(endDate).toISOString())
    .returns<OrderItemData[]>()

  if (error || !items) {
    throw new Error("Erro ao buscar top produtos")
  }

  // Agrupar por produto
  const productMap: Record<string, { name: string; totalSold: number; revenue: number }> = {}

  items.forEach((item) => {
    if (!productMap[item.product_id]) {
      productMap[item.product_id] = {
        name: item.product_name,
        totalSold: 0,
        revenue: 0,
      }
    }
    productMap[item.product_id].totalSold += item.quantity
    productMap[item.product_id].revenue += item.subtotal
  })

  // Converter para array e ordenar
  const totalRevenue = Object.values(productMap).reduce(
    (sum, p) => sum + p.revenue,
    0
  )

  return Object.entries(productMap)
    .map(([id, data]) => ({
      id,
      name: data.name,
      totalSold: data.totalSold,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

/**
 * Busca estatísticas por categoria
 */
export async function getCategoryStats(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<CategoryStats[]> {
  const supabase = createBrowserSupabaseClient()

  // Buscar produtos com categoria
  const { data: products } = await supabase
    .from("products")
    .select("id, category_id, categories(name)")
    .eq("tenant_id", tenantId)
    .returns<ProductData[]>()

  if (!products) return []

  // Buscar itens vendidos
  const { data: items, error } = await supabase
    .from("order_items")
    .select(
      `
      product_id,
      quantity,
      subtotal,
      orders!inner(
        tenant_id,
        status,
        created_at
      )
    `
    )
    .eq("orders.tenant_id", tenantId)
    .eq("orders.status", "completed")
    .gte("orders.created_at", startOfDay(startDate).toISOString())
    .lte("orders.created_at", endOfDay(endDate).toISOString())
    .returns<CategoryItemData[]>()

  if (error || !items) return []

  // Mapear produto → categoria
  const productCategoryMap: Record<string, { id: string; name: string }> = {}
  
  products.forEach((p) => {
    productCategoryMap[p.id] = {
      id: p.category_id,
      name: p.categories?.name || "Sem categoria"
    }
  })

  // Agrupar por categoria
  const categoryMap: Record<string, { name: string; revenue: number; orders: number }> = {}

  items.forEach((item) => {
    const category = productCategoryMap[item.product_id]
    if (!category) return

    if (!categoryMap[category.id]) {
      categoryMap[category.id] = {
        name: category.name,
        revenue: 0,
        orders: 0,
      }
    }
    categoryMap[category.id].revenue += item.subtotal
    categoryMap[category.id].orders += 1
  })

  const totalRevenue = Object.values(categoryMap).reduce(
    (sum, c) => sum + c.revenue,
    0
  )

  return Object.entries(categoryMap).map(([id, data]) => ({
    id,
    name: data.name,
    totalRevenue: data.revenue,
    totalOrders: data.orders,
    percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
  }))
}