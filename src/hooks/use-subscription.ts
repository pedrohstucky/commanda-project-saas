"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import type {
    SubscriptionPlan,
    TenantSubscription,
    SubscriptionPlanData
} from '@/lib/types/subscription'

export function useSubscription() {
    const supabase = createBrowserSupabaseClient()
    const [subscription, setSubscription] = useState<TenantSubscription | null>(null)
    const [plans, setPlans] = useState<SubscriptionPlanData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const loadSubscription = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setIsLoading(false)
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (profile) {
                const { data, error } = await supabase
                    .from('tenant_subscriptions')
                    .select('*')
                    .eq('tenant_id', profile.tenant_id)
                    .single()
                
                if (error) {
                    console.log('Erro ao carregar assinatura:', error)
                } else {
                    setSubscription(data as TenantSubscription)
                }
            }
        } catch (error) {
            console.error('Erro ao carregar assinatura', error)
        } finally {
            setIsLoading(false)
        }
    }, [supabase])

    const loadPlans = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('price_monthly', { ascending: true })
            
            if (error) {
                console.error('Erro ao carregar planos:', error)
            } else {
                setPlans(data as SubscriptionPlanData[])
            }
        } catch (error) {
            console.error('Erro ao carregar planos:', error)
        }
    }, [supabase])

    const hasAccess = useCallback((requiredPlan: SubscriptionPlan): boolean => {
        if (!subscription || subscription.is_expired) return false

        const planHierarchy: Record<SubscriptionPlan, number> = {
            trial: 1,
            basic: 1,
            pro: 2,
            premium: 3
        }

        return planHierarchy[subscription.plan] >= planHierarchy[requiredPlan]
    }, [subscription])

    useEffect(() => {
        loadSubscription()
        loadPlans()
    }, [loadSubscription, loadPlans])

    return {
        subscription,
        plans,
        isLoading,
        hasAccess,
        isTrialExpired: subscription?.is_expired || false,
        daysRemaining: subscription?.days_remaining || 0,
        plan: subscription?.plan || 'trial',
        refreshSubscription: loadSubscription,
        refreshPlans: loadPlans    
    }
}