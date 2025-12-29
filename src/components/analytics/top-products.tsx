"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { TopProduct } from "@/lib/analytics/types"
import { Trophy, TrendingUp } from "lucide-react"

interface TopProductsProps {
  products: TopProduct[]
  maxProducts: number
  isLoading?: boolean
}

export function TopProducts({ products, maxProducts, isLoading }: TopProductsProps) {
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
          <CardTitle>Top Produtos</CardTitle>
          <CardDescription>Mais vendidos do período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayProducts = products.slice(0, maxProducts)
  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Top {maxProducts} Produtos
            </CardTitle>
            <CardDescription>Mais vendidos do período</CardDescription>
          </div>
          <Badge variant="secondary">
            {formatCurrency(totalRevenue)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {displayProducts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Nenhum produto vendido neste período</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayProducts.map((product, index) => (
              <div key={product.id} className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Ranking */}
                    <div
                      className={`
                        flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0
                        ${index === 0 ? "bg-amber-500 text-white" : ""}
                        ${index === 1 ? "bg-slate-400 text-white" : ""}
                        ${index === 2 ? "bg-orange-600 text-white" : ""}
                        ${index > 2 ? "bg-muted text-muted-foreground" : ""}
                      `}
                    >
                      {index + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {product.totalSold} vendidos
                        </span>
                        {product.category && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {product.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">
                      {formatCurrency(product.revenue)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {product.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <Progress value={product.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}