"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { CategoryStats } from "@/lib/analytics/types"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Layers } from "lucide-react"

interface CategoryStatsProps {
  categories: CategoryStats[]
  isLoading?: boolean
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function CategoryStats({ categories, isLoading }: CategoryStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas por Categoria</CardTitle>
          <CardDescription>Distribuição de receita</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const chartData = categories.map((cat) => ({
    name: cat.name,
    value: cat.totalRevenue,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Vendas por Categoria
        </CardTitle>
        <CardDescription>Distribuição de receita</CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Nenhuma venda por categoria neste período</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Gráfico de pizza */}
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Lista */}
            <div className="space-y-3">
              {categories.map((category, index) => (
                <div key={category.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(category.totalRevenue)}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <Progress value={category.percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}