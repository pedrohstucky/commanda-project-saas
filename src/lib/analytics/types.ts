export type SubscriptionTier = "trial" | "basic" | "pro" | "premium";

export interface AnalyticsMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  conversionRate: number;
  growthRate: number;
}

export interface PeriodComparison {
  current: AnalyticsMetrics;
  previous: AnalyticsMetrics;
  percentageChange: {
    revenue: number;
    orders: number;
    ticket: number;
    conversion: number;
  };
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  category?: string;
  totalSold: number;
  revenue: number;
  percentage: number;
}

export interface CategoryStats {
  id: string;
  name: string;
  totalRevenue: number;
  totalOrders: number;
  percentage: number;
}

export interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  compareWithPrevious?: boolean;
}

/**
 * Permissões de analytics por tier
 */
export interface AnalyticsPermissions {
  maxDays: number; // Máximo de dias de histórico
  hasCharts: boolean; // Pode ver gráficos
  chartDays: number; // Quantos dias mostrar no gráfico
  hasComparison: boolean; // Pode comparar períodos
  hasTopProducts: boolean; // Pode ver top produtos
  maxTopProducts: number; // Quantos produtos no ranking
  hasCategoryStats: boolean; // Estatísticas por categoria
  hasExport: boolean; // Pode exportar relatórios
  exportFormats: string[]; // Formatos disponíveis
  hasAdvancedFilters: boolean; // Filtros personalizados
  hasPredictions: boolean; // Previsões com IA
}

/**
 * Retorna permissões baseadas no tier
 */
export function getAnalyticsPermissions(
  tier: SubscriptionTier
): AnalyticsPermissions {
  switch (tier) {
    case "trial":
      return {
        maxDays: 7,
        hasCharts: false,
        chartDays: 0,
        hasComparison: false,
        hasTopProducts: false,
        maxTopProducts: 0,
        hasCategoryStats: false,
        hasExport: false,
        exportFormats: [],
        hasAdvancedFilters: false,
        hasPredictions: false,
      };

    case "basic":
      return {
        maxDays: 30,
        hasCharts: false,
        chartDays: 0,
        hasComparison: false,
        hasTopProducts: false,
        maxTopProducts: 0,
        hasCategoryStats: false,
        hasExport: false,
        exportFormats: [],
        hasAdvancedFilters: false,
        hasPredictions: false,
      };

    case "pro":
      return {
        maxDays: 90,
        hasCharts: true,
        chartDays: 30,
        hasComparison: true,
        hasTopProducts: true,
        maxTopProducts: 10,
        hasCategoryStats: true,
        hasExport: true,
        exportFormats: ["pdf"],
        hasAdvancedFilters: false,
        hasPredictions: false,
      };

    case "premium":
      return {
        maxDays: 365,
        hasCharts: true,
        chartDays: 90,
        hasComparison: true,
        hasTopProducts: true,
        maxTopProducts: 20,
        hasCategoryStats: true,
        hasExport: true,
        exportFormats: ["pdf", "excel", "csv"],
        hasAdvancedFilters: true,
        hasPredictions: true,
      };
  }
}

/**
 * Informações de upgrade
 */
export interface TierUpgradeInfo {
  name: string;
  price: number;
  features: string[];
  highlighted?: boolean;
}

export function getTierUpgradeInfo(
  currentTier: SubscriptionTier
): TierUpgradeInfo[] {
  const allTiers: Record<SubscriptionTier, TierUpgradeInfo> = {
    trial: {
      name: "Trial",
      price: 0,
      features: ["Teste grátis de 14 dias", "7 dias de histórico"],
    },
    basic: {
      name: "Básico",
      price: 77,
      features: ["Métricas básicas", "30 dias de histórico"],
    },
    pro: {
      name: "Pro",
      price: 167,
      features: [
        "90 dias de histórico",
        "Gráficos de vendas (30 dias)",
        "Top 10 produtos",
        "Análise por categoria",
        "Comparação de períodos",
        "Exportação PDF",
      ],
      highlighted: true,
    },
    premium: {
      name: "Premium",
      price: 347,
      features: [
        "Histórico ilimitado (1 ano)",
        "Gráficos completos (90 dias)",
        "Top 20 produtos",
        "Previsões e tendências",
        "Export PDF + Excel + CSV",
        "Filtros personalizados",
      ],
    },
  };

  // Retornar apenas tiers superiores ao atual
  const tierOrder: SubscriptionTier[] = ["basic", "pro", "premium"];
  const currentIndex = tierOrder.indexOf(currentTier);

  return tierOrder.slice(currentIndex + 1).map((tier) => allTiers[tier]);
}

/**
 * Informações visuais dos tiers
 */
export const TIER_CONFIG = {
  trial: {
    label: "Trial",
    price: 0,
    color: "text-muted",
    bgColor: "bg-primary",
  },
  basic: {
    label: "Básico",
    price: 77,
    color: "text-muted",
    bgColor: "bg-primary",
  },
  pro: {
    label: "Pro",
    price: 167,
    color: "text-muted",
    bgColor: "bg-primary",
  },
  premium: {
    label: "Premium",
    price: 347,
    color: "text-muted",
    bgColor: "bg-primary",
  },
} as const;
