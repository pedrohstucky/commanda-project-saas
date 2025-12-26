export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
          updated_at: string
          subscription_plan: string
          subscription_status: string
          trial_ends_at: string | null
          subscription_started_at: string
          orders_count_current_period: number
          users_count: number
          period_start: string
          trial_used: boolean
          payment_due_date: string | null
          expired_at: string | null
          cancelled_at: string | null
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
          updated_at?: string
          subscription_plan?: string
          subscription_status?: string
          trial_ends_at?: string | null
          subscription_started_at?: string
          orders_count_current_period?: number
          users_count?: number
          period_start?: string
          trial_used?: boolean
          payment_due_date?: string | null
          expired_at?: string | null
          cancelled_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
          updated_at?: string
          subscription_plan?: string
          subscription_status?: string
          trial_ends_at?: string | null
          subscription_started_at?: string
          orders_count_current_period?: number
          users_count?: number
          period_start?: string
          trial_used?: boolean
          payment_due_date?: string | null
          expired_at?: string | null
          cancelled_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string
          full_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          full_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          full_name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          id: string
          tenant_id: string
          instance_id: string
          instance_token: string
          instance_name: string
          api_key: string
          status: string
          qr_code: string | null
          pair_code: string | null
          phone_number: string | null
          profile_name: string | null
          profile_pic_url: string | null
          is_business: boolean
          webhook_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          instance_id: string
          instance_token: string
          instance_name: string
          api_key: string
          status?: string
          qr_code?: string | null
          pair_code?: string | null
          phone_number?: string | null
          profile_name?: string | null
          profile_pic_url?: string | null
          is_business?: boolean
          webhook_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          instance_id?: string
          instance_token?: string
          instance_name?: string
          api_key?: string
          status?: string
          qr_code?: string | null
          pair_code?: string | null
          phone_number?: string | null
          profile_name?: string | null
          profile_pic_url?: string | null
          is_business?: boolean
          webhook_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          price: number
          category_id: string | null
          image_url: string | null
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          price: number
          category_id?: string | null
          image_url?: string | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          price?: number
          category_id?: string | null
          image_url?: string | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          tenant_id: string
          customer_name: string | null
          customer_phone: string | null
          delivery_type: string
          delivery_address: string | null
          total_amount: number
          status: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          accepted_at: string | null
          accepted_by: string | null
          completed_at: string | null
          completed_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_type?: string
          delivery_address?: string | null
          total_amount: number
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_type?: string
          delivery_address?: string | null
          total_amount?: number
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          variation_id?: string
          variation_name?: string
          quantity: number
          product_price: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name?: string
          variation_id?: string
          variation_name?: string
          quantity: number
          product_price: number
          subtotal?: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          variation_id?: string
          variation_name?: string
          quantity?: number
          product_price?: number
          subtotal?: number
          created_at?: string
        }
        Relationships: []
      }
      product_variations: {
        Row: {
          id: string
          product_id: string
          name: string
          price_modifier: number
          display_order: number
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          name: string
          price_modifier?: number
          display_order?: number
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          name?: string
          price_modifier?: number
          display_order?: number
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          order_id: string
          amount: number
          payment_method: string
          processed_by: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          amount: number
          payment_method: string
          processed_by?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          amount?: number
          payment_method?: string
          processed_by?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          price_monthly: number
          price_yearly: number
          features: string[]
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          price_monthly?: number
          price_yearly?: number
          features?: string[]
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          price_monthly?: number
          price_yearly?: number
          features?: string[]
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}