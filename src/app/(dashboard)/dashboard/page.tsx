"use client"

import { useEffect, useState } from "react"
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics"
import { RecentOrders } from "@/components/dashboard/recent-orders"
import { DashboardSkeleton } from "@/components/ui/skeleton-patterns"

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 500)
  }, [])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Visão geral do seu restaurante
        </p>
      </div>

      {/* Métricas */}
      <DashboardMetrics />

      {/* Pedidos Recentes */}
      <RecentOrders />
    </div>
  )
}
