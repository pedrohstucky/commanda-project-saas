import type { AnalyticsMetrics, PeriodComparison } from "./types"

/**
 * Calcula a taxa de crescimento entre dois períodos
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Calcula comparação entre períodos
 */
export function comparePeriods(
  current: AnalyticsMetrics,
  previous: AnalyticsMetrics
): PeriodComparison {
  return {
    current,
    previous,
    percentageChange: {
      revenue: calculateGrowthRate(current.totalRevenue, previous.totalRevenue),
      orders: calculateGrowthRate(current.totalOrders, previous.totalOrders),
      ticket: calculateGrowthRate(current.averageTicket, previous.averageTicket),
      conversion: calculateGrowthRate(current.conversionRate, previous.conversionRate),
    },
  }
}

/**
 * Formata número como moeda BRL
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

/**
 * Formata número como percentual
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Calcula ticket médio
 */
export function calculateAverageTicket(
  totalRevenue: number,
  totalOrders: number
): number {
  return totalOrders > 0 ? totalRevenue / totalOrders : 0
}

/**
 * Calcula taxa de conversão
 */
export function calculateConversionRate(
  completedOrders: number,
  totalOrders: number
): number {
  return totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
}