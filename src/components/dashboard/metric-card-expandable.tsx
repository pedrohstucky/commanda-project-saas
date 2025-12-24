"use client"

import { useState } from "react"
import { ChevronDown, Lock, TrendingUp, TrendingDown, Minus, Crown, Zap, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { MetricCard } from "@/lib/types/metrics"
import type { SubscriptionPlan } from "@/lib/types/subscription"

interface MetricCardExpandableProps {
  metric: MetricCard
  userPlan: SubscriptionPlan
  hasAccess: boolean
  isTrialExpired: boolean
  daysRemaining?: number
  onUpgrade?: () => void
}

export function MetricCardExpandable({
  metric,
  userPlan,
  hasAccess,
  isTrialExpired,
  daysRemaining,
  onUpgrade
}: MetricCardExpandableProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />
    if (trend === 'down') return <TrendingDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return 'text-success'
    if (trend === 'down') return 'text-destructive'
    return 'text-muted-foreground'
  }

  const getPlanBadge = (plan: SubscriptionPlan) => {
    const badges: Record<SubscriptionPlan, { label: string; className: string }> = {
      trial: { 
        label: 'Trial', 
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
      },
      basic: { 
        label: 'Básico', 
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      },
      pro: { 
        label: 'Pro', 
        className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
      },
      premium: { 
        label: 'Premium', 
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
      }
    }
    return badges[plan]
  }

  const getPlanIcon = (plan: SubscriptionPlan) => {
    const icons: Record<SubscriptionPlan, React.ComponentType<{ className?: string }>> = {
      trial: Star,
      basic: Star,
      pro: Zap,
      premium: Crown
    }
    return icons[plan]
  }

  const detailHasAccess = (detailPlan: SubscriptionPlan): boolean => {
    if (isTrialExpired) return false
    
    const planHierarchy: Record<SubscriptionPlan, number> = {
      trial: 1,
      basic: 1,
      pro: 2,
      premium: 3
    }
    
    return planHierarchy[userPlan] >= planHierarchy[detailPlan]
  }

  return (
    <>
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          !hasAccess && "opacity-75",
          isTrialExpired && "border-destructive/50"
        )}
        onClick={() => setIsOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {metric.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <metric.icon className="h-4 w-4 text-muted-foreground" />
            {!hasAccess && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">
                {hasAccess && !isTrialExpired ? metric.value : '---'}
              </div>
              {metric.change && hasAccess && !isTrialExpired && (
                <p className={cn("text-xs", getTrendColor(metric.trend))}>
                  {metric.change}
                </p>
              )}
              {isTrialExpired && (
                <p className="text-xs text-destructive">Trial expirado</p>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <metric.icon className="h-5 w-5" />
              {metric.title}
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>Métricas detalhadas e análises</span>
              {userPlan === 'trial' && daysRemaining !== undefined && (
                <Badge variant="outline" className="bg-white-300 text-primary border-primary">
                  {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'} restantes
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Métrica Principal */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Valor Atual</p>
                <p className="text-3xl font-bold">
                  {hasAccess && !isTrialExpired ? metric.value : '---'}
                </p>
              </div>
              {metric.change && hasAccess && !isTrialExpired && (
                <div className={cn("flex items-center gap-1", getTrendColor(metric.trend))}>
                  {getTrendIcon(metric.trend)}
                  <span className="text-sm font-medium">{metric.change}</span>
                </div>
              )}
            </div>

            {/* Métricas Detalhadas */}
            {hasAccess && !isTrialExpired ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {metric.detailedMetrics?.map((detail, index) => {
                  const hasDetailAccess = detailHasAccess(detail.plan)
                  const PlanIcon = getPlanIcon(detail.plan)

                  return (
                    <div
                      key={index}
                      className={cn(
                        "p-4 border rounded-lg",
                        !hasDetailAccess && "opacity-50 relative"
                      )}
                    >
                      {!hasDetailAccess && (
                        <div className="absolute top-2 right-2">
                          <Lock className="h-3 w-3" />
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium">{detail.label}</p>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "flex items-center gap-1",
                            getPlanBadge(detail.plan).className
                          )}
                        >
                          <PlanIcon className="h-3 w-3" />
                          {getPlanBadge(detail.plan).label}
                        </Badge>
                      </div>
                      
                      <p className="text-2xl font-bold mb-1">
                        {hasDetailAccess ? detail.value : '---'}
                      </p>
                      
                      {detail.description && hasDetailAccess && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {detail.description}
                        </p>
                      )}
                      
                      {detail.change && hasDetailAccess && (
                        <div className={cn("flex items-center gap-1 text-xs", getTrendColor(detail.trend))}>
                          {getTrendIcon(detail.trend)}
                          <span>{detail.change}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-semibold mb-2">
                    {isTrialExpired 
                      ? 'Trial Expirado' 
                      : 'Desbloqueie Métricas Detalhadas'
                    }
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isTrialExpired
                      ? 'Seu período de trial expirou. Faça upgrade para continuar acessando suas métricas.'
                      : `Faça upgrade para o plano ${getPlanBadge(metric.plan).label} para acessar análises avançadas`
                    }
                  </p>
                  <Button onClick={onUpgrade} className="gap-2">
                    {isTrialExpired ? 'Escolher Plano' : 'Fazer Upgrade'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}