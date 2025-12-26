"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock, XCircle } from "lucide-react"
import { useSubscription } from "@/hooks/use-subscription"
import { useRouter } from "next/navigation"

export function SubscriptionAlertBanner() {
  const router = useRouter()
  const { subscription, daysRemaining } = useSubscription()

  if (!subscription) return null

  const { plan, status } = subscription

  const isExpired = status === "expired"
  const isCancelled = status === "cancelled"
  const isTrialEndingSoon = plan === "trial" && daysRemaining <= 3 && daysRemaining > 0

  // Cancelado - crítico
  if (isCancelled) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Assinatura Cancelada</AlertTitle>
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>Sua assinatura foi cancelada. Reative para continuar usando o sistema.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/settings/billing")}
              className="ml-4"
            >
              Reativar Agora
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Expirado - urgente
  if (isExpired) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Assinatura Expirada</AlertTitle>
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>
              Sua assinatura expirou. Renove agora para continuar recebendo pedidos.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/settings/billing")}
              className="ml-4"
            >
              Renovar Agora
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Trial expirando em breve - aviso
  if (isTrialEndingSoon) {
    return (
      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <AlertTitle className="text-orange-800 dark:text-orange-200">
          Período de Teste Terminando
        </AlertTitle>
        <AlertDescription className="text-orange-700 dark:text-orange-300">
          <div className="flex items-center justify-between">
            <span>
              Seu período de teste termina em {daysRemaining} {daysRemaining === 1 ? "dia" : "dias"}. 
              Escolha um plano para continuar usando.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/settings/billing")}
              className="ml-4"
            >
              Ver Planos
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}