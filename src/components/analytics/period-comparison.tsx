"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { PeriodComparison } from "@/lib/analytics/types"
import { formatCurrency } from "@/lib/analytics/calculations"

interface PeriodComparisonProps {
  comparison: PeriodComparison
  isLoading?: boolean
}

export function PeriodComparisonComponent({ comparison, isLoading }: PeriodComparisonProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Períodos</CardTitle>
          <CardDescription>vs. período anterior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const metrics = [
    {
      label: "Receita",
      current: formatCurrency(comparison.current.totalRevenue),
      change: comparison.percentageChange.revenue,
    },
    {
      label: "Pedidos",
      current: comparison.current.totalOrders.toString(),
      change: comparison.percentageChange.orders,
    },
    {
      label: "Ticket Médio",
      current: formatCurrency(comparison.current.averageTicket),
      change: comparison.percentageChange.ticket,
    },
    {
      label: "Conversão",
      current: `${comparison.current.conversionRate.toFixed(1)}%`,
      change: comparison.percentageChange.conversion,
    },
  ]

  const getTrendIcon = (change: number) => {
    if (change > 0) return TrendingUp
    if (change < 0) return TrendingDown
    return Minus
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-green-600"
    if (change < 0) return "text-red-600"
    return "text-muted-foreground"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação de Períodos</CardTitle>
        <CardDescription>vs. período anterior</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => {
            const TrendIcon = getTrendIcon(metric.change)
            
            return (
              <div key={metric.label} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-lg font-bold">{metric.current}</p>
                </div>
                <Badge variant={metric.change > 0 ? "default" : metric.change < 0 ? "destructive" : "secondary"} className="gap-1">
                  <TrendIcon className="h-3 w-3" />
                  {metric.change > 0 ? "+" : ""}
                  {metric.change.toFixed(1)}%
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}