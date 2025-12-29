"use client";

import { useState } from "react";
import {
  Lock,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Zap,
  Star,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MetricCard } from "@/lib/types/metrics";
import type { SubscriptionPlan } from "@/lib/types/subscription";

interface MetricCardExpandableProps {
  metric: MetricCard;
  userPlan: SubscriptionPlan;
  hasAccess: boolean;
  isTrialExpired: boolean;
  daysRemaining?: number;
  onUpgrade?: () => void;
}

export function MetricCardExpandable({
  metric,
  userPlan,
  hasAccess,
  isTrialExpired,
  daysRemaining,
  onUpgrade,
}: MetricCardExpandableProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getTrendIcon = (trend?: "up" | "down" | "neutral") => {
    if (trend === "up") return TrendingUp;
    if (trend === "down") return TrendingDown;
    return Minus;
  };

  const getTrendColor = (trend?: "up" | "down" | "neutral") => {
    if (trend === "up") return "text-success";
    if (trend === "down") return "text-destructive";
    return "text-muted-foreground";
  };

  const getPlanIcon = (plan: SubscriptionPlan) => {
    const icons = {
      trial: Star,
      basic: Star,
      pro: Zap,
      premium: Crown,
    };
    return icons[plan];
  };

  const getPlanLabel = (plan: SubscriptionPlan) => {
    const labels = {
      trial: "Trial",
      basic: "Básico",
      pro: "Pro",
      premium: "Premium",
    };
    return labels[plan];
  };

  const detailHasAccess = (detailPlan: SubscriptionPlan): boolean => {
    if (isTrialExpired) return false;

    const planHierarchy: Record<SubscriptionPlan, number> = {
      trial: 1,
      basic: 1,
      pro: 2,
      premium: 3,
    };

    return planHierarchy[userPlan] >= planHierarchy[detailPlan];
  };

  const TrendIcon = getTrendIcon(metric.trend);
  const PlanIcon = getPlanIcon(metric.plan);

  return (
    <>
      {/* Card Compacto */}
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-lg",
          !hasAccess && "opacity-75 border-dashed",
          isTrialExpired && "border-destructive"
        )}
        onClick={() => setIsOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {metric.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <metric.icon className="h-4 w-4 text-muted-foreground" />
            {!hasAccess && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-1">
            <div className="text-2xl font-bold">
              {hasAccess && !isTrialExpired ? metric.value : "---"}
            </div>

            {metric.change && hasAccess && !isTrialExpired && (
              <div className="flex items-center gap-1">
                <TrendIcon
                  className={cn("h-3 w-3", getTrendColor(metric.trend))}
                />
                <p
                  className={cn(
                    "text-xs font-medium",
                    getTrendColor(metric.trend)
                  )}
                >
                  {metric.change}
                </p>
              </div>
            )}

            {isTrialExpired && (
              <p className="text-xs text-destructive font-medium">
                Trial expirado
              </p>
            )}

            {!hasAccess && !isTrialExpired && (
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-1 hover:bg-primary hover:text-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpgrade?.();
                }}
              >
                <Lock className="h-3 w-3" />
                Upgrade para {getPlanLabel(metric.plan)}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Expandido */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto pb-10">
          <DialogHeader>
            <div className="flex items-start justify-between pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <metric.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{metric.title}</DialogTitle>
                  <DialogDescription>
                    Análise detalhada e métricas
                  </DialogDescription>
                </div>
              </div>

              {userPlan === "trial" && daysRemaining !== undefined && (
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3" />
                  {daysRemaining} {daysRemaining === 1 ? "dia" : "dias"}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Métrica Principal */}
            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Valor Atual</p>
                  <div className="flex items-baseline gap-3">
                    <p className="text-2xl font-bold">
                      {hasAccess && !isTrialExpired ? metric.value : "---"}
                    </p>
                    {metric.change && hasAccess && !isTrialExpired && (
                      <div className="flex items-center gap-1">
                        <TrendIcon
                          className={cn("h-4 w-4", getTrendColor(metric.trend))}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            getTrendColor(metric.trend)
                          )}
                        >
                          {metric.change}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/10">
                  <PlanIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>

            {/* Métricas Detalhadas */}
            {hasAccess && !isTrialExpired ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">
                    Métricas Detalhadas
                  </h3>
                  <Badge variant="secondary">
                    {metric.detailedMetrics?.length || 0} indicadores
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {metric.detailedMetrics?.map((detail, index) => {
                    const hasDetailAccess = detailHasAccess(detail.plan);
                    const DetailPlanIcon = getPlanIcon(detail.plan);
                    const DetailTrendIcon = getTrendIcon(detail.trend);

                    return (
                      <div
                        key={index}
                        className={cn(
                          "relative p-5 rounded-lg border bg-card p-6",
                          !hasDetailAccess && "border-dashed"
                        )}
                      >
                        {/* Lock overlay com CTA */}
                        {!hasDetailAccess && (
                          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center space-y-3">
                            <Lock className="h-6 w-6 text-muted-foreground" />
                            <div className="text-center space-y-1">
                              <p className="text-sm font-medium">
                                {detail.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Requer {getPlanLabel(detail.plan)}
                              </p>
                            </div>
                            <Button
                              size="lg"
                              variant="outline"
                              className="gap-1 hover:bg-primary hover:text-muted mb-4"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpgrade?.();
                              }}
                            >
                              <ArrowUpRight className="h-3 w-3" />
                              Fazer Upgrade
                            </Button>
                          </div>
                        )}

                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-sm font-medium text-muted-foreground">
                            {detail.label}
                          </p>
                          <Badge variant="outline" className="gap-1">
                            <DetailPlanIcon className="h-3 w-3" />
                            <span className="text-xs">
                              {getPlanLabel(detail.plan)}
                            </span>
                          </Badge>
                        </div>

                        {/* Valor */}
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold">
                              {hasDetailAccess ? detail.value : "---"}
                            </p>
                            {detail.change && hasDetailAccess && (
                              <div className="flex items-center gap-1">
                                <DetailTrendIcon
                                  className={cn(
                                    "h-3 w-3",
                                    getTrendColor(detail.trend)
                                  )}
                                />
                                <span
                                  className={cn(
                                    "text-xs font-medium",
                                    getTrendColor(detail.trend)
                                  )}
                                >
                                  {detail.change}
                                </span>
                              </div>
                            )}
                          </div>

                          {detail.description && hasDetailAccess && (
                            <p className="text-xs text-muted-foreground">
                              {detail.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Upgrade CTA */
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-primary" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold">
                    {isTrialExpired
                      ? "Trial Expirado"
                      : "Desbloqueie Métricas Detalhadas"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {isTrialExpired
                      ? "Seu período de trial expirou. Escolha um plano para continuar acessando análises."
                      : `Faça upgrade para o plano ${getPlanLabel(
                          metric.plan
                        )} e tenha acesso a métricas avançadas.`}
                  </p>
                </div>

                <div className="flex gap-3 justify-center pt-4 pb-4">
                  <Button onClick={onUpgrade} className="gap-2">
                    {isTrialExpired ? "Escolher Plano" : "Fazer Upgrade"}
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
