"use client";

import { useEffect, useState, useCallback } from "react";
import { ShoppingBag, DollarSign, Clock, TrendingUp } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { MetricCardExpandable } from "./metric-card-expandable";
import { useSubscription } from "@/hooks/use-subscription";
import { useRouter } from "next/navigation";
import type { MetricsData, MetricCard } from "@/lib/types/metrics";

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

      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const lastMonth = new Date(today);
      lastMonth.setDate(lastMonth.getDate() - 30);

      /* ----------------------------- BÁSICAS (trial/basic) ---------------------------- */

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

      // ✅ CORRIGIDO: paid → completed
      const [{ data: todayCompleted }, { data: yesterdayCompleted }] = await Promise.all([
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

      const { count: pendingOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const avgTicket =
        todayOrders && todayOrders > 0 ? todayRevenue / todayOrders : 0;

      // ✅ CORRIGIDO: paid → completed
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

      /* ----------------------------- AVANÇADAS (pro/premium) ---------------------------- */

      if (hasAccess("pro")) {
        const { count: weekOrders } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .gte("created_at", lastWeek.toISOString());

        // ✅ CORRIGIDO: paid → completed
        const { data: weekCompleted } = await supabase
          .from("orders")
          .select("total_amount")
          .gte("created_at", lastWeek.toISOString())
          .eq("status", "completed");

        const weekRevenue =
          weekCompleted?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

        const { count: cancelled } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "cancelled")
          .gte("created_at", lastWeek.toISOString());

        const totalOrders = weekOrders || 0;
        const completedOrders = weekCompleted?.length || 0;
        
        // ✅ CORRIGIDO: Taxa de conversão agora usa "completed"
        const conversionRate =
          totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

        newMetrics.weekOrders = weekOrders || 0;
        newMetrics.weekRevenue = weekRevenue;
        newMetrics.cancelledOrders = cancelled || 0;
        newMetrics.conversionRate = conversionRate;
      }

      /* ----------------------------- COMPLETAS (premium) ---------------------------- */

      if (hasAccess("premium")) {
        // Maior ticket do dia
        const { data: todayOrdersData } = await supabase
          .from("orders")
          .select("total_amount")
          .gte("created_at", today.toISOString())
          .order("total_amount", { ascending: false })
          .limit(1);

        newMetrics.highestTicketToday = todayOrdersData?.[0]
          ? Number(todayOrdersData[0].total_amount)
          : 0;

        // Receita do mês
        const firstDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        
        // ✅ CORRIGIDO: paid → completed
        const { data: monthCompleted } = await supabase
          .from("orders")
          .select("total_amount")
          .gte("created_at", firstDayOfMonth.toISOString())
          .eq("status", "completed");

        newMetrics.monthRevenue =
          monthCompleted?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

        // Top produtos
        const { data: topProductsData } = await supabase
          .from("order_items")
          .select("product_id, quantity, product_price, products(name)")
          .gte("created_at", lastMonth.toISOString());

        const productMap = new Map();
        topProductsData?.forEach((item) => {
          const productData = item.products as unknown;
          const name =
            productData &&
            typeof productData === "object" &&
            "name" in productData
              ? (productData as { name: string }).name
              : "Produto";

          const existing = productMap.get(name) || {
            name,
            quantity: 0,
            revenue: 0,
          };
          productMap.set(name, {
            name,
            quantity: existing.quantity + item.quantity,
            revenue:
              existing.revenue + item.quantity * Number(item.product_price),
          });
        });

        newMetrics.topProducts = Array.from(productMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
      }

      setMetrics(newMetrics);
    } catch (error) {
      console.error("❌ Erro ao carregar métricas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, hasAccess, isTrialExpired]);

  /* -------------------------------------------------------------------------- */
  /*                               REALTIME                                     */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    loadMetrics().catch((err) => {
      console.error("❌ Erro ao carregar métricas iniciais:", err);
    });

    const channel = supabase
      .channel("dashboard-metrics")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadMetrics().catch((err) => {
            console.error("❌ Erro ao recarregar métricas (realtime):", err);
          });
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
        : `${calculatePercentChange(
            metrics.todayOrders,
            metrics.yesterdayOrders
          )} vs ontem`,
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
          label: "Taxa de conversão",
          value: `${metrics.conversionRate?.toFixed(1) || 0}%`,
          plan: "pro",
          description: "Pedidos concluídos / total de pedidos",
        },
        {
          label: "Pedidos cancelados",
          value: metrics.cancelledOrders || 0,
          plan: "premium",
          description: "Pedidos cancelados na última semana",
        },
      ],
    },
    {
      id: "revenue",
      title: "Faturamento do dia",
      value: isLoading ? "..." : formatCurrency(metrics.todayRevenue),
      change: isLoading
        ? "..."
        : `${calculatePercentChange(
            metrics.todayRevenue,
            metrics.yesterdayRevenue
          )} vs ontem`,
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
          label: "Receita mensal projetada",
          value: formatCurrency((metrics.weekRevenue || 0) * 4.3),
          plan: "premium",
          description: "Baseado na média semanal",
        },
        {
          label: "Produto mais vendido",
          value: metrics.topProducts?.[0]?.name || "Sem dados",
          plan: "premium",
          description: metrics.topProducts?.[0]
            ? `${metrics.topProducts[0].quantity} vendas - ${formatCurrency(
                metrics.topProducts[0].revenue
              )}`
            : "Nenhum produto vendido no mês",
        },
      ],
    },
    {
      id: "pending",
      title: "Pedidos pendentes",
      value: isLoading ? "..." : metrics.pendingOrders.toString(),
      change: "Aguardando aceite",
      trend: "neutral",
      icon: Clock,
      plan: "basic",
      detailedMetrics: [
        {
          label: "Aguardando aceite",
          value: metrics.pendingOrders,
          plan: "basic",
          description: "Pedidos com status 'pending'",
        },
        {
          label: "Taxa de conversão",
          value: `${metrics.conversionRate?.toFixed(1) || 0}%`,
          plan: "pro",
          description: "Pedidos concluídos / total de pedidos",
        },
        {
          label: "Pedidos cancelados",
          value: metrics.cancelledOrders || 0,
          plan: "pro",
          description: "Cancelamentos na última semana",
        },
        {
          label: "Taxa de sucesso",
          value:
            metrics.weekOrders && metrics.cancelledOrders !== undefined
              ? `${(
                  ((metrics.weekOrders - metrics.cancelledOrders) /
                    metrics.weekOrders) *
                  100
                ).toFixed(1)}%`
              : "N/A",
          plan: "premium",
          description: "Pedidos concluídos / total de pedidos",
        },
      ],
    },
    {
      id: "avg-ticket",
      title: "Ticket médio",
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
          description: "Média dos últimos 7 dias"
        },
        {
          label: "Ticket médio do mês",
          value: metrics.monthRevenue && metrics.weekOrders
            ? formatCurrency(metrics.monthRevenue / (metrics.weekOrders * 4))
            : formatCurrency(0),
          plan: "pro",
          description: "Média do mês atual",
        },
        {
          label: "Maior pedido hoje",
          value: formatCurrency(metrics.highestTicketToday || 0),
          plan: "premium",
          description: "Pedido de maior valor do dia",
        },
        {
          label: "Faturamento mensal",
          value: formatCurrency(metrics.monthRevenue || 0),
          plan: "premium",
          description: "Total faturado no mês atual",
        },
      ],
    },
  ];

  /* -------------------------------------------------------------------------- */
  /*                                   UI                                       */
  /* -------------------------------------------------------------------------- */

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