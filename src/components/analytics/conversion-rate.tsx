"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown } from "lucide-react"

interface ConversionRateProps {
  rate: number
  previousRate?: number
  isLoading?: boolean
}

export function ConversionRate({ rate, previousRate, isLoading }: ConversionRateProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Taxa de Conversão</CardTitle>
          <CardDescription>Pedidos completados vs total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const trend = previousRate ? rate - previousRate : null
  const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taxa de Conversão</CardTitle>
        <CardDescription>Pedidos completados vs total</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="text-4xl font-bold">{rate.toFixed(1)}%</div>
          {trend !== null && (
            <div className={`flex items-center gap-1 text-sm ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
              <TrendIcon className="h-4 w-4" />
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>

        <Progress value={rate} className="h-2" />

        <p className="text-xs text-muted-foreground">
          {rate >= 70 ? "Excelente taxa de conversão!" : rate >= 50 ? "Boa taxa de conversão" : "Há espaço para melhorias"}
        </p>
      </CardContent>
    </Card>
  )
}