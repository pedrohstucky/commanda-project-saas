"use client"

import { useEffect, useState } from "react"
import { subDays } from "date-fns"
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react"
import { StatsCard } from "@/components/analytics/stats-card"
import { getAnalyticsMetrics } from "@/lib/analytics/queries"
import type { AnalyticsMetrics } from "@/lib/analytics/types"
import { logger } from "@/lib/logger"

export function AnalyticsOverview({ tenantId }: { tenantId: string }) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoading(true)
        const endDate = new Date()
        const startDate = subDays(endDate, 7)
        
        const data = await getAnalyticsMetrics(tenantId, startDate, endDate)
        setMetrics(data)
      } catch (error) {
        logger.error("Erro ao carregar métricas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (tenantId) {
      loadMetrics()
    }
  }, [tenantId])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Receita (7 dias)"
        value={metrics ? formatCurrency(metrics.totalRevenue) : "-"}
        icon={DollarSign}
        isLoading={isLoading}
      />

      <StatsCard
        title="Pedidos"
        value={metrics?.totalOrders ?? "-"}
        icon={ShoppingCart}
        isLoading={isLoading}
      />

      <StatsCard
        title="Ticket Médio"
        value={metrics ? formatCurrency(metrics.averageTicket) : "-"}
        icon={TrendingUp}
        isLoading={isLoading}
      />

      <StatsCard
        title="Conversão"
        value={metrics ? `${metrics.conversionRate.toFixed(1)}%` : "-"}
        icon={Users}
        isLoading={isLoading}
      />
    </div>
  )
}