export type SubscriptionPlan = 'trial' | 'basic' | 'pro' | 'premium'

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'

export interface SubscriptionPlanData {
  id: string
  name: SubscriptionPlan
  display_name: string
  description: string
  price_monthly: number
  price_yearly: number
  features: string[]
  is_active: boolean
  created_at: string
}

export interface TenantSubscription {
  tenant_id: string
  tenant_name: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  trial_ends_at: string | null
  subscription_started_at: string
  orders_count_current_period: number
  users_count: number
  period_start: string
  trial_used: boolean
  payment_due_date: string | null
  expired_at: string | null
  cancelled_at: string | null
  
  // Calculados
  days_remaining: number
  is_expired: boolean
  
  // Informações do plano
  plan_display_name: string
  plan_description: string
  price_monthly: number
  price_yearly: number
  features: string[]
  
  // Limites
  max_orders: number | null
  max_users: number
  has_advanced_metrics: boolean
  has_complete_metrics: boolean
  
  // Uso
  orders_remaining: number | null
  orders_usage_percentage: number
  can_create_order: boolean
}