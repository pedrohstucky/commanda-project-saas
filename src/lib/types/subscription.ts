export type SubscriptionPlan = "trial" | "basic" | "pro" | "premium"

export type SubscriptionStatus = "active" | "expired" | "cancelled"

export interface SubscriptionView {
  plan: SubscriptionPlan
  status: SubscriptionStatus
}

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

  plan_display_name: string
  plan_description: string
  features: string[]

  trial_ends_at: string | null
  subscription_started_at: string
  trial_used: boolean

  payment_due_date: string | null
  expired_at: string | null
  cancelled_at: string | null

  days_remaining: number | null
  is_expired: boolean

  max_orders: number
  max_users: number
  has_advanced_metrics: boolean
  has_complete_metrics: boolean

  orders_remaining: number
  orders_usage_percentage: number
  orders_count_current_period: number
  users_count: number

  can_create_order: boolean

  price_monthly: number
  price_yearly: number
}
