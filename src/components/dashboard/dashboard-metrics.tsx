"use client";

import { useEffect, useState, useCallback } from "react";
import { ShoppingBag, DollarSign, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface Metrics {
  todayOrders: number;
  yesterdayOrders: number;
  todayRevenue: number;
  yesterdayRevenue: number;
  pendingOrders: number;
  avgTicket: number;
  lastWeekAvgTicket: number;
}

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export function DashboardMetrics() {
  const supabase = createBrowserSupabaseClient();

  const [metrics, setMetrics] = useState<Metrics>({
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
    try {
      setIsLoading(true);

      const now = new Date();

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      /* ----------------------------- Orders Count ---------------------------- */

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

      /* ------------------------------- Revenue -------------------------------- */

      const [{ data: todayPaid }, { data: yesterdayPaid }] = await Promise.all([
        supabase
          .from("orders")
          .select("total_amount")
          .gte("created_at", today.toISOString())
          .eq("status", "paid"),

        supabase
          .from("orders")
          .select("total_amount")
          .gte("created_at", yesterday.toISOString())
          .lt("created_at", today.toISOString())
          .eq("status", "paid"),
      ]);

      const todayRevenue =
        todayPaid?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

      const yesterdayRevenue =
        yesterdayPaid?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

      /* ---------------------------- Pending Orders ---------------------------- */

      const { count: pendingOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      /* ---------------------------- Avg Ticket -------------------------------- */

      const avgTicket =
        todayOrders && todayOrders > 0 ? todayRevenue / todayOrders : 0;

      /* ------------------------ Last Week Avg Ticket -------------------------- */

      const { data: lastWeekPaid } = await supabase
        .from("orders")
        .select("total_amount")
        .gte("created_at", lastWeek.toISOString())
        .lt("created_at", today.toISOString())
        .eq("status", "paid");

      const lastWeekRevenue =
        lastWeekPaid?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

      const lastWeekAvgTicket =
        lastWeekPaid && lastWeekPaid.length > 0
          ? lastWeekRevenue / lastWeekPaid.length
          : 0;

      setMetrics({
        todayOrders: todayOrders ?? 0,
        yesterdayOrders: yesterdayOrders ?? 0,
        todayRevenue,
        yesterdayRevenue,
        pendingOrders: pendingOrders ?? 0,
        avgTicket,
        lastWeekAvgTicket,
      });
    } catch (error) {
      console.error("❌ Erro ao carregar métricas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /* -------------------------------------------------------------------------- */
  /*                               REALTIME (FIX)                               */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    // 🔥 carrega imediatamente
    loadMetrics();

    const channel = supabase
      .channel("dashboard-metrics")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
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
  /*                                   UI                                       */
  /* -------------------------------------------------------------------------- */

  const metricsData = [
    {
      title: "Pedidos hoje",
      value: isLoading ? "..." : metrics.todayOrders.toString(),
      change: isLoading
        ? "..."
        : `${calculatePercentChange(
            metrics.todayOrders,
            metrics.yesterdayOrders
          )} vs ontem`,
      icon: ShoppingBag,
      trend: metrics.todayOrders >= metrics.yesterdayOrders ? "up" : "down",
    },
    {
      title: "Faturamento do dia",
      value: isLoading ? "..." : formatCurrency(metrics.todayRevenue),
      change: isLoading
        ? "..."
        : `${calculatePercentChange(
            metrics.todayRevenue,
            metrics.yesterdayRevenue
          )} vs ontem`,
      icon: DollarSign,
      trend: metrics.todayRevenue >= metrics.yesterdayRevenue ? "up" : "down",
    },
    {
      title: "Pedidos pendentes",
      value: isLoading ? "..." : metrics.pendingOrders.toString(),
      change: "Em preparo",
      icon: Clock,
      trend: "neutral",
    },
    {
      title: "Ticket médio",
      value: isLoading ? "..." : formatCurrency(metrics.avgTicket),
      change: isLoading
        ? "..."
        : `${calculatePercentChange(
            metrics.avgTicket,
            metrics.lastWeekAvgTicket
          )} vs semana`,
      icon: TrendingUp,
      trend: metrics.avgTicket >= metrics.lastWeekAvgTicket ? "up" : "down",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {metricsData.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p
              className={`text-xs ${
                metric.trend === "up"
                  ? "text-success"
                  : metric.trend === "down"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {metric.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}