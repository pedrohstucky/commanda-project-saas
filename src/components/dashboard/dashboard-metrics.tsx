"use client"

import { useEffect, useState, useCallback } from "react";
import { 
  ShoppingBag, 
  DollarSign, 
  Star,
  TrendingUp,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { MetricCardExpandable } from "./metric-card-expandable";
import { useSubscription } from "@/hooks/use-subscription";
import { MetricCardSkeleton } from "../ui/skeleton-patterns";
import { useRouter } from "next/navigation";
import type { MetricCard } from "@/lib/types/metrics";
import { subDays, getHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logger } from "@/lib/logger";

/* -------------------------------------------------------------------------- */
/*                                TYPES                                       */
/* -------------------------------------------------------------------------- */

interface MetricsData {
  // Basic
  todayOrders: number
  yesterdayOrders: number
  todayRevenue: number
  yesterdayRevenue: number
  pendingOrders: number
  avgTicket: number
  lastWeekAvgTicket: number
  
  // Pro
  weekOrders?: number
  weekRevenue?: number
  peakHour?: string
  topProduct?: { name: string; sales: number; revenue: number }
  avgPrepTime?: number
  rejectionRate?: number
  topExtra?: { name: string; sales: number }
  topCategory?: { name: string; revenue: number }
  
  // Premium
  weeklyGrowth?: number
  forecastRevenue?: number
  returningCustomers?: number
  bestDay?: { day: string; revenue: number }
}

interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  subtotal: number
  orders: {
    status: string
    created_at: string
  }
}

interface OrderItemExtra {
  extra_name: string
  order_items: {
    id: string
    orders: {
      status: string
      created_at: string
    }
  }
}

interface Product {
  id: string
  categories: {
    name: string
  } | null
}

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export function DashboardMetrics() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const { hasAccess, isTrialExpired, daysRemaining, plan } = useSubscription();

  const [metrics, setMetrics] = useState<MetricsData>({
    todayOrders: 0,
    yesterdayOrders: 0,
    todayRevenue: 0,
    yesterdayRevenue: 0,
    pendingOrders: 0,
    avgTicket: 0,
    lastWeekAvgTicket: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  /* -------------------------------------------------------------------------- */
  /*                                  HELPERS                                   */
  /* -------------------------------------------------------------------------- */

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }, []);

  const calculatePercentChange = useCallback(
    (current: number, previous: number): string => {
      if (previous === 0) {
        return current > 0 ? "+100%" : "0%";
      }
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`;
    },
    []
  );

  /* -------------------------------------------------------------------------- */
  /*                              LOAD METRICS                                  */
  /* -------------------------------------------------------------------------- */

  const loadMetrics = useCallback(async () => {
    if (isTrialExpired) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastWeek = subDays(today, 7);
      const twoWeeksAgo = subDays(today, 14);
      const lastMonth = subDays(today, 30);

      /* ----------------------------- BASIC ---------------------------- */

      // Pedidos hoje e ontem
      const [{ count: todayOrders }, { count: yesterdayOrders }] =
        await Promise.all([
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .gte("created_at", today.toISOString()),

          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .gte("created_at", yesterday.toISOString())
            .lt("created_at", today.toISOString()),
        ]);

      // Receita hoje e ontem
      const [{ data: todayCompleted }, { data: yesterdayCompleted }] =
        await Promise.all([
          supabase
            .from("orders")
            .select("total_amount")
            .gte("created_at", today.toISOString())
            .eq("status", "completed"),

          supabase
            .from("orders")
            .select("total_amount")
            .gte("created_at", yesterday.toISOString())
            .lt("created_at", today.toISOString())
            .eq("status", "completed"),
        ]);

      const todayRevenue =
        todayCompleted?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const yesterdayRevenue =
        yesterdayCompleted?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

      // Pendentes
      const { count: pendingOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Ticket médio hoje
      const avgTicket =
        todayCompleted && todayCompleted.length > 0
          ? todayRevenue / todayCompleted.length
          : 0;

      // Ticket médio semana
      const { data: lastWeekCompleted } = await supabase
        .from("orders")
        .select("total_amount")
        .gte("created_at", lastWeek.toISOString())
        .lt("created_at", today.toISOString())
        .eq("status", "completed");

      const lastWeekRevenue =
        lastWeekCompleted?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const lastWeekAvgTicket =
        lastWeekCompleted && lastWeekCompleted.length > 0
          ? lastWeekRevenue / lastWeekCompleted.length
          : 0;

      const newMetrics: MetricsData = {
        todayOrders: todayOrders ?? 0,
        yesterdayOrders: yesterdayOrders ?? 0,
        todayRevenue,
        yesterdayRevenue,
        pendingOrders: pendingOrders ?? 0,
        avgTicket,
        lastWeekAvgTicket,
      };

      /* ----------------------------- PRO ---------------------------- */

      if (hasAccess("pro")) {
        // Total semana
        const { count: weekOrders } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .gte("created_at", lastWeek.toISOString());

        const { data: weekCompleted } = await supabase
          .from("orders")
          .select("total_amount, created_at")
          .gte("created_at", lastWeek.toISOString())
          .eq("status", "completed");

        const weekRevenue =
          weekCompleted?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

        // Horário de pico
        const hourCounts: Record<number, number> = {};
        weekCompleted?.forEach((order) => {
          const hour = getHours(new Date(order.created_at));
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const peakHourNum = Object.entries(hourCounts).sort(
          ([, a], [, b]) => b - a
        )[0]?.[0];

        const peakHour = peakHourNum
          ? `${peakHourNum}:00 - ${parseInt(peakHourNum) + 1}:00`
          : "Sem dados";

        // Produto mais vendido
        const { data: weekItems } = await supabase
          .from("order_items")
          .select(`
            product_id,
            product_name,
            quantity,
            subtotal,
            orders!inner(status, created_at)
          `)
          .eq("orders.status", "completed")
          .gte("orders.created_at", lastWeek.toISOString())
          .returns<OrderItem[]>();

        const productStats: Record<string, { sales: number; revenue: number }> = {};
        weekItems?.forEach((item) => {
          const name = item.product_name;
          if (!productStats[name]) {
            productStats[name] = { sales: 0, revenue: 0 };
          }
          productStats[name].sales += item.quantity;
          productStats[name].revenue += Number(item.subtotal);
        });

        const topProductEntry = Object.entries(productStats).sort(
          ([, a], [, b]) => b.revenue - a.revenue
        )[0];

        const topProduct = topProductEntry
          ? {
              name: topProductEntry[0],
              sales: topProductEntry[1].sales,
              revenue: topProductEntry[1].revenue,
            }
          : undefined;

        // Tempo médio preparo
        const { data: completedOrders } = await supabase
          .from("orders")
          .select("created_at, updated_at")
          .eq("status", "completed")
          .gte("created_at", lastWeek.toISOString())
          .not("updated_at", "is", null);

        let avgPrepTime = 0;
        if (completedOrders && completedOrders.length > 0) {
          const totalTime = completedOrders.reduce((sum, order) => {
            const created = new Date(order.created_at).getTime();
            const updated = new Date(order.updated_at!).getTime();
            return sum + (updated - created);
          }, 0);
          avgPrepTime = totalTime / completedOrders.length / (1000 * 60);
        }

        // Taxa de rejeição
        const { count: rejectedCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "rejected")
          .gte("created_at", lastWeek.toISOString());

        const rejectionRate =
          weekOrders && weekOrders > 0 ? ((rejectedCount || 0) / weekOrders) * 100 : 0;

        // Extra mais vendido
        const { data: weekExtras } = await supabase
          .from("order_item_extras")
          .select(`
            extra_name,
            order_items!inner(
              id,
              orders!inner(status, created_at)
            )
          `)
          .eq("order_items.orders.status", "completed")
          .gte("order_items.orders.created_at", lastWeek.toISOString())
          .returns<OrderItemExtra[]>();

        const extraCounts: Record<string, number> = {};
        weekExtras?.forEach((extra) => {
          const name = extra.extra_name;
          extraCounts[name] = (extraCounts[name] || 0) + 1;
        });

        const topExtraEntry = Object.entries(extraCounts).sort(
          ([, a], [, b]) => b - a
        )[0];

        const topExtra = topExtraEntry
          ? { name: topExtraEntry[0], sales: topExtraEntry[1] }
          : undefined;

        // Categoria mais lucrativa
        const { data: products } = await supabase
          .from("products")
          .select("id, categories(name)")
          .returns<Product[]>();

        const categoryRevenue: Record<string, number> = {};

        weekItems?.forEach((item) => {
          const product = products?.find((p) => p.id === item.product_id);
          if (product?.categories) {
            const categoryName = product.categories.name;
            categoryRevenue[categoryName] =
              (categoryRevenue[categoryName] || 0) + Number(item.subtotal);
          }
        });

        const topCategoryEntry = Object.entries(categoryRevenue).sort(
          ([, a], [, b]) => b - a
        )[0];

        const topCategory = topCategoryEntry
          ? { name: topCategoryEntry[0], revenue: topCategoryEntry[1] }
          : undefined;

        newMetrics.weekOrders = weekOrders || 0;
        newMetrics.weekRevenue = weekRevenue;
        newMetrics.peakHour = peakHour;
        newMetrics.topProduct = topProduct;
        newMetrics.avgPrepTime = avgPrepTime;
        newMetrics.rejectionRate = rejectionRate;
        newMetrics.topExtra = topExtra;
        newMetrics.topCategory = topCategory;
      }

      /* ----------------------------- PREMIUM ---------------------------- */

      if (hasAccess("premium")) {
        // Crescimento semanal
        const { data: prevWeekCompleted } = await supabase
          .from("orders")
          .select("total_amount")
          .gte("created_at", twoWeeksAgo.toISOString())
          .lt("created_at", lastWeek.toISOString())
          .eq("status", "completed");

        const prevWeekRevenue =
          prevWeekCompleted?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

        const weeklyGrowth =
          prevWeekRevenue > 0
            ? ((lastWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
            : 0;

        // Previsão mensal
        const avgDailyRevenue = lastWeekRevenue / 7;
        const daysInMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        ).getDate();
        const forecastRevenue = avgDailyRevenue * daysInMonth;

        // Clientes recorrentes
        const { data: recentOrders } = await supabase
          .from("orders")
          .select("customer_phone")
          .gte("created_at", lastMonth.toISOString())
          .eq("status", "completed")
          .not("customer_phone", "is", null);

        const phoneCount: Record<string, number> = {};
        recentOrders?.forEach((order) => {
          if (order.customer_phone) {
            phoneCount[order.customer_phone] =
              (phoneCount[order.customer_phone] || 0) + 1;
          }
        });

        const returningCustomers = Object.values(phoneCount).filter(
          (count) => count > 1
        ).length;

        // Melhor dia da semana
        const { data: weekDaysOrders } = await supabase
          .from("orders")
          .select("created_at, total_amount")
          .gte("created_at", lastWeek.toISOString())
          .eq("status", "completed");

        const dayRevenue: Record<string, number> = {};
        weekDaysOrders?.forEach((order) => {
          const day = format(new Date(order.created_at), "EEEE", { locale: ptBR });
          dayRevenue[day] = (dayRevenue[day] || 0) + Number(order.total_amount);
        });

        const bestDayEntry = Object.entries(dayRevenue).sort(
          ([, a], [, b]) => b - a
        )[0];

        const bestDay = bestDayEntry
          ? { day: bestDayEntry[0], revenue: bestDayEntry[1] }
          : undefined;

        newMetrics.weeklyGrowth = weeklyGrowth;
        newMetrics.forecastRevenue = forecastRevenue;
        newMetrics.returningCustomers = returningCustomers;
        newMetrics.bestDay = bestDay;
      }

      setMetrics(newMetrics);
    } catch (error) {
      logger.error("Erro ao carregar métricas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, hasAccess, isTrialExpired]);

  /* -------------------------------------------------------------------------- */
  /*                               REALTIME                                     */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    loadMetrics();

    const channel = supabase
      .channel("dashboard-metrics")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadMetrics]);

  /* -------------------------------------------------------------------------- */
  /*                               METRICS CARDS                                */
  /* -------------------------------------------------------------------------- */

  const metricsCards: MetricCard[] = [
    {
      id: "today-orders",
      title: "Pedidos hoje",
      value: isLoading ? "..." : metrics.todayOrders.toString(),
      change: isLoading
        ? "..."
        : `${calculatePercentChange(metrics.todayOrders, metrics.yesterdayOrders)} vs ontem`,
      trend: metrics.todayOrders >= metrics.yesterdayOrders ? "up" : "down",
      icon: ShoppingBag,
      plan: "basic",
      detailedMetrics: [
        {
          label: "Ontem",
          value: metrics.yesterdayOrders,
          plan: "basic",
        },
        {
          label: "Última semana",
          value: metrics.weekOrders || 0,
          plan: "pro",
          description: "Total de pedidos nos últimos 7 dias",
        },
        {
          label: "Horário de pico",
          value: metrics.peakHour || "Sem dados",
          plan: "pro",
          description: "Horário com mais pedidos",
        },
        {
          label: "Taxa de rejeição",
          value: `${metrics.rejectionRate?.toFixed(1) || 0}%`,
          plan: "pro",
          description: "Pedidos recusados na semana",
        },
      ],
    },

    {
      id: "revenue",
      title: "Faturamento do dia",
      value: isLoading ? "..." : formatCurrency(metrics.todayRevenue),
      change: isLoading
        ? "..."
        : `${calculatePercentChange(metrics.todayRevenue, metrics.yesterdayRevenue)} vs ontem`,
      trend: metrics.todayRevenue >= metrics.yesterdayRevenue ? "up" : "down",
      icon: DollarSign,
      plan: "basic",
      detailedMetrics: [
        {
          label: "Receita de ontem",
          value: formatCurrency(metrics.yesterdayRevenue),
          plan: "basic",
        },
        {
          label: "Receita semanal",
          value: formatCurrency(metrics.weekRevenue || 0),
          plan: "pro",
          description: "Faturamento dos últimos 7 dias",
        },
        {
          label: "Crescimento semanal",
          value: `${metrics.weeklyGrowth?.toFixed(1) || 0}%`,
          plan: "premium",
          description: "vs. semana anterior",
          trend:
            metrics.weeklyGrowth && metrics.weeklyGrowth > 0
              ? "up"
              : metrics.weeklyGrowth && metrics.weeklyGrowth < 0
              ? "down"
              : "neutral",
        },
        {
          label: "Previsão mensal",
          value: formatCurrency(metrics.forecastRevenue || 0),
          plan: "premium",
          description: "Baseado na média diária",
        },
      ],
    },

    {
      id: "top-product",
      title: "Produto Campeão",
      value: isLoading ? "..." : metrics.topProduct?.name || "Sem vendas",
      change: metrics.topProduct ? `${metrics.topProduct.sales} vendas` : "Sem dados",
      trend: "up",
      icon: Star,
      plan: "pro",
      detailedMetrics: [
        {
          label: "Vendas",
          value: metrics.topProduct?.sales || 0,
          plan: "pro",
        },
        {
          label: "Receita gerada",
          value: formatCurrency(metrics.topProduct?.revenue || 0),
          plan: "pro",
          description: "Total faturado com este produto",
        },
        {
          label: "Categoria líder",
          value: metrics.topCategory?.name || "Sem dados",
          plan: "pro",
          description: formatCurrency(metrics.topCategory?.revenue || 0),
        },
        {
          label: "Extra favorito",
          value: metrics.topExtra?.name || "Nenhum",
          plan: "pro",
          description: `${metrics.topExtra?.sales || 0} vendas`,
        },
      ],
    },

    {
      id: "performance",
      title: "Ticket Médio",
      value: isLoading ? "..." : formatCurrency(metrics.avgTicket),
      change: isLoading
        ? "..."
        : `${calculatePercentChange(metrics.avgTicket, metrics.lastWeekAvgTicket)} vs semana`,
      trend: metrics.avgTicket >= metrics.lastWeekAvgTicket ? "up" : "down",
      icon: TrendingUp,
      plan: "basic",
      detailedMetrics: [
        {
          label: "Ticket médio da semana",
          value: formatCurrency(metrics.lastWeekAvgTicket),
          plan: "basic",
          description: "Média dos últimos 7 dias",
        },
        {
          label: "Tempo de preparo",
          value: `${metrics.avgPrepTime?.toFixed(0) || 0} min`,
          plan: "pro",
          description: "Tempo médio para completar pedidos",
        },
        {
          label: "Clientes recorrentes",
          value: metrics.returningCustomers || 0,
          plan: "premium",
          description: "Fizeram 2+ pedidos no mês",
        },
        {
          label: "Melhor dia",
          value: metrics.bestDay?.day || "Sem dados",
          plan: "premium",
          description: metrics.bestDay ? formatCurrency(metrics.bestDay.revenue) : "Esta semana",
        },
      ],
    },
  ];

  /* -------------------------------------------------------------------------- */
  /*                                   UI                                       */
  /* -------------------------------------------------------------------------- */

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {metricsCards.map((metric) => (
        <MetricCardExpandable
          key={metric.id}
          metric={metric}
          userPlan={plan}
          hasAccess={hasAccess(metric.plan)}
          isTrialExpired={isTrialExpired}
          daysRemaining={daysRemaining}
          onUpgrade={() => router.push("/dashboard/settings/billing")}
        />
      ))}
    </div>
  );
}