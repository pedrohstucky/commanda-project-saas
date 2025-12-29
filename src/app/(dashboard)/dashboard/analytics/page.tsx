"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { subDays } from "date-fns";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";

import { StatsCard } from "@/components/analytics/stats-card";
import { UpgradeCard } from "@/components/analytics/upgrade-card";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { TopProducts } from "@/components/analytics/top-products";
import { CategoryStats as CategoryStatsComponent } from "@/components/analytics/category-stats";
import { PageTransition } from "@/components/ui/animations";

import type { SubscriptionTier } from "@/lib/analytics/types";
import {
  getAnalyticsPermissions,
  type AnalyticsMetrics,
  type DailyRevenue,
  type TopProduct,
  type CategoryStats,
} from "@/lib/analytics/types";
import {
  getAnalyticsMetrics,
  getDailyRevenue,
  getTopProducts,
  getCategoryStats,
} from "@/lib/analytics/queries";

import { logger } from "@/lib/logger";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/*                                TYPES                                       */
/* -------------------------------------------------------------------------- */

interface ProfileData {
  tenant_id: string
  tenants: {
    subscription_plan: string
  } | null
}

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export default function AnalyticsPage() {
  const supabase = createBrowserSupabaseClient();

  // Estado
  const [tier, setTier] = useState<SubscriptionTier>("basic");
  const [tenantId, setTenantId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  // Permissões baseadas no tier
  const permissions = getAnalyticsPermissions(tier || "basic");

  /**
   * Buscar tenant e tier do usuário
   */
  const loadUserData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, tenants(subscription_plan)")
        .eq("id", user.id)
        .single();

      if (profile?.tenant_id) {
        const typedProfile = profile as unknown as ProfileData;
        
        setTenantId(typedProfile.tenant_id);
        
        const subscriptionPlan = typedProfile.tenants?.subscription_plan || "basic";
        setTier(subscriptionPlan as SubscriptionTier);
      }
    } catch (error) {
      logger.error("Erro ao carregar dados do usuário:", error);
    }
  }, [supabase]);

  /**
   * Carregar dados do usuário (uma vez)
   */
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  /**
   * Carregar analytics quando tenantId ou tier mudar
   */
  useEffect(() => {
    if (!tenantId) return;

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);

        const permissions = getAnalyticsPermissions(tier);
        const endDate = new Date();
        const startDate = subDays(endDate, permissions.maxDays);

        // Buscar métricas sempre (todos os tiers)
        const metricsData = await getAnalyticsMetrics(
          tenantId,
          startDate,
          endDate
        );
        setMetrics(metricsData);

        // Buscar gráfico de receita (apenas PRO+)
        if (permissions.hasCharts) {
          const chartStartDate = subDays(endDate, permissions.chartDays);
          const revenueData = await getDailyRevenue(
            tenantId,
            chartStartDate,
            endDate
          );
          setDailyRevenue(revenueData);
        } else {
          setDailyRevenue([]);
        }

        // Buscar top produtos (apenas PRO+)
        if (permissions.hasTopProducts) {
          const productsData = await getTopProducts(
            tenantId,
            startDate,
            endDate,
            permissions.maxTopProducts
          );
          setTopProducts(productsData);
        } else {
          setTopProducts([]);
        }

        // Buscar stats por categoria (apenas PRO+)
        if (permissions.hasCategoryStats) {
          const categoriesData = await getCategoryStats(
            tenantId,
            startDate,
            endDate
          );
          setCategoryStats(categoriesData);
        } else {
          setCategoryStats([]);
        }
      } catch (error) {
        logger.error("Erro ao carregar analytics:", error);
        toast.error("Erro ao carregar analytics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [tenantId, tier]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (!permissions) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando analytics...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Analytics</h1>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
            Análise detalhada do seu negócio
          </p>
        </div>

        {/* Cards de métricas - TODOS OS TIERS */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Receita Total"
            value={metrics ? formatCurrency(metrics.totalRevenue) : "-"}
            icon={DollarSign}
            description={`Últimos ${permissions.maxDays} dias`}
            isLoading={isLoading}
          />

          <StatsCard
            title="Total de Pedidos"
            value={metrics?.totalOrders ?? "-"}
            icon={ShoppingCart}
            description={`Últimos ${permissions.maxDays} dias`}
            isLoading={isLoading}
          />

          <StatsCard
            title="Ticket Médio"
            value={metrics ? formatCurrency(metrics.averageTicket) : "-"}
            icon={TrendingUp}
            description="Por pedido completo"
            isLoading={isLoading}
          />

          <StatsCard
            title="Taxa de Conversão"
            value={metrics ? `${metrics.conversionRate.toFixed(1)}%` : "-"}
            icon={Users}
            description="Pedidos completados"
            isLoading={isLoading}
          />
        </div>

        {/* Gráfico de Receita - APENAS PRO+ */}
        <div className="w-full">
          {permissions.hasCharts ? (
            <RevenueChart data={dailyRevenue} isLoading={isLoading} />
          ) : (
            <UpgradeCard
              feature="Gráfico de Vendas"
              requiredTier="pro"
              benefits={[
                "Visualize tendências de vendas",
                "Gráficos de 30 dias",
                "Identifique padrões de compra",
                "Compare períodos",
              ]}
            />
          )}
        </div>

        {/* Grid: Top Produtos + Categorias */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Top Produtos - APENAS PRO+ */}
          {permissions.hasTopProducts ? (
            <TopProducts
              products={topProducts}
              maxProducts={permissions.maxTopProducts}
              isLoading={isLoading}
            />
          ) : (
            <UpgradeCard
              feature="Top Produtos"
              requiredTier="pro"
              benefits={[
                "Top 10 produtos mais vendidos",
                "Receita por produto",
                "Percentual de participação",
                "Identifique seus best-sellers",
              ]}
            />
          )}

          {/* Categorias - APENAS PRO+ */}
          {permissions.hasCategoryStats ? (
            <CategoryStatsComponent
              categories={categoryStats}
              isLoading={isLoading}
            />
          ) : (
            <UpgradeCard
              feature="Análise por Categoria"
              requiredTier="pro"
              benefits={[
                "Receita por categoria",
                "Gráfico de distribuição",
                "Identifique categorias top",
                "Otimize seu cardápio",
              ]}
            />
          )}
        </div>

        {/* Exportação - APENAS PRO+ */}
        {!permissions.hasExport && (
          <div className="w-full">
            <UpgradeCard
              feature="Exportação de Relatórios"
              requiredTier="pro"
              benefits={[
                "Exporte relatórios em PDF",
                tier === "pro"
                  ? "Premium: Excel e CSV também"
                  : "Compartilhe com sua equipe",
                "Relatórios personalizados",
                "Histórico completo",
              ]}
            />
          </div>
        )}
      </div>
    </PageTransition>
  );
}