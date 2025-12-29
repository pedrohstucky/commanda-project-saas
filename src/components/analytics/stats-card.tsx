"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    label: string
  }
  isLoading?: boolean
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  isLoading,
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return TrendingUp
    if (trend.value < 0) return TrendingDown
    return Minus
  }

  const getTrendColor = () => {
    if (!trend) return ""
    if (trend.value > 0) return "text-green-600"
    if (trend.value < 0) return "text-red-600"
    return "text-muted-foreground"
  }

  const TrendIcon = getTrendIcon()

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-24 animate-pulse bg-muted rounded" />
          <div className="h-4 w-32 animate-pulse bg-muted rounded mt-2" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && TrendIcon && (
              <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
                <TrendIcon className="h-3 w-3" />
                <span className="font-medium">
                  {trend.value > 0 ? "+" : ""}
                  {trend.value.toFixed(1)}%
                </span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend?.label && (
              <p className="text-xs text-muted-foreground">{trend.label}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}