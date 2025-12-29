"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, TrendingUp, Zap, Crown } from "lucide-react"
import { useRouter } from "next/navigation"
import type { SubscriptionTier } from "@/lib/analytics/types"
import { TIER_CONFIG } from "@/lib/analytics/types"

interface UpgradeCardProps {
  feature: string
  requiredTier: Exclude<SubscriptionTier, "trial" | "basic"> // ✅ ATUALIZAR
  benefits: string[]
}

export function UpgradeCard({ feature, requiredTier, benefits }: UpgradeCardProps) {
  const router = useRouter()

  const tierIcons = {
    pro: Zap,
    premium: Crown,
  }

  const config = TIER_CONFIG[requiredTier]
  const TierIcon = tierIcons[requiredTier]

  return (
    <Card className="border-2 border-dashed border-muted-foreground/25 bg-muted/30">
      <CardHeader className="text-center space-y-3">
        <div className="flex justify-center">
          <div className={`rounded-full ${config.bgColor} p-3`}>
            <Lock className={`h-6 w-6 ${config.color}`} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <CardTitle className="text-xl">{feature}</CardTitle>
          </div>
          <CardDescription>
            Desbloqueie este recurso fazendo upgrade do seu plano
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Benefícios */}
        <div className="space-y-2">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <TrendingUp className={`h-4 w-4 ${config.color} shrink-0 mt-0.5`} />
              <span className="text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          className="w-full gap-2"
          onClick={() => router.push("/dashboard/settings/subscription")}
        >
          <TierIcon className="h-4 w-4" />
          Fazer upgrade para {config.label}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          R$ {config.price}/mês
        </p>
      </CardContent>
    </Card>
  )
}