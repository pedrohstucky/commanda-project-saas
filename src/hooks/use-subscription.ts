"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger";
import type {
  SubscriptionPlan,
  TenantSubscription,
  SubscriptionPlanData,
} from "@/lib/types/subscription"

export function useSubscription() {
  const supabase = createBrowserSupabaseClient()

  const [subscription, setSubscription] =
    useState<TenantSubscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlanData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadSubscription = useCallback(async () => {
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setSubscription(null)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.tenant_id) {
        logger.error("Erro ao carregar profile:", profileError)
        setSubscription(null)
        return
      }

      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .single()

      if (error) {
        logger.error("Erro ao carregar assinatura:", error)
        setSubscription(null)
        return
      }

      setSubscription(data as TenantSubscription)
    } catch (error) {
      logger.error("Erro inesperado ao carregar assinatura:", error)
      setSubscription(null)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const loadPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true })

      if (error) {
        logger.error("Erro ao carregar planos:", error)
        return
      }

      setPlans(data as SubscriptionPlanData[])
    } catch (error) {
      logger.error("Erro inesperado ao carregar planos:", error)
    }
  }, [supabase])

  const hasAccess = useCallback(
    (requiredPlan: SubscriptionPlan): boolean => {
      if (!subscription) return false
      if (subscription.status !== "active") return false

      const planHierarchy: Record<SubscriptionPlan, number> = {
        trial: 1,
        basic: 1,
        pro: 2,
        premium: 3,
      }

      return (
        planHierarchy[subscription.plan] >=
        planHierarchy[requiredPlan]
      )
    },
    [subscription]
  )

  useEffect(() => {
    loadSubscription()
    loadPlans()
  }, [loadSubscription, loadPlans])

  return {
    subscription,
    plans,
    isLoading,
    hasAccess,

    // helpers
    isTrialExpired: subscription?.status === "expired",
    daysRemaining: subscription?.days_remaining ?? 0,
    plan: subscription?.plan ?? "trial",

    // actions
    refreshSubscription: loadSubscription,
    refreshPlans: loadPlans,
  }
}
