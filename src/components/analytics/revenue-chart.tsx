"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DailyRevenue } from "@/lib/analytics/types"
import { TrendingUp } from "lucide-react"

interface RevenueChartProps {
  data: DailyRevenue[]
  isLoading?: boolean
}

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receita</CardTitle>
          <CardDescription>Vendas dos últimos dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  // Calcular total e tendência
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Receita</CardTitle>
            <CardDescription>Vendas dos últimos {data.length} dias</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Média: {formatCurrency(avgRevenue)}/dia
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Nenhum dado disponível para este período</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Receita"]}
                labelFormatter={(label) => format(new Date(label), "dd/MM/yyyy", { locale: ptBR })}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}