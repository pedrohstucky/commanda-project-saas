import type { SubscriptionPlan } from "./subscription";

export interface MetricCard {
    id: string
    title: string
    value: string | number
    change?: string
    trend?: 'up' | 'down' | 'neutral'
    icon: React.ComponentType<{ className? : string }>
    plan: SubscriptionPlan
    detailedMetrics?: DetailedMetric[]
}

export interface DetailedMetric {
    label: string
    value: string | number
    description?: string
    trend?: 'up' | 'down' | 'neutral'
    change?: string
    plan: SubscriptionPlan
}

export interface MetricsData {
    // Básicas (trial e basic)
    todayOrders: number
    yesterdayOrders: number
    todayRevenue: number
    yesterdayRevenue: number
    pendingOrders: number
    avgTicket: number
    lastWeekAvgTicket: number
    
    // Avançadas (pro e premium)
    weekOrders?: number
    weekRevenue?: number
    conversionRate?: number
    cancelledOrders?: number
    
    // Completas (apenas premium)
    topProducts?: { name: string; quantity: number; revenue: number }[]
    highestTicketToday?: number
    monthRevenue?: number
  }