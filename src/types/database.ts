/**
 * Types do banco de dados Supabase
 * Atualizar com: npx supabase gen types typescript --project-id seu-projeto > src/types/database.ts
 */

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
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string
          full_name: string
          created_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          full_name: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          full_name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          tenant_id: string
          name: string
          price: number
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          price: number
          is_available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          price?: number
          is_available?: boolean
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          tenant_id: string
          status: 'pending' | 'paid' | 'cancelled'
          total_amount: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          status?: 'pending' | 'paid' | 'cancelled'
          total_amount?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          status?: 'pending' | 'paid' | 'cancelled'
          total_amount?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity?: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_price?: number
          quantity?: number
          subtotal?: number
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          order_id: string
          payment_method: 'cash' | 'card' | 'pix'
          amount: number
          status: 'pending' | 'completed' | 'failed'
          processed_by: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          payment_method: 'cash' | 'card' | 'pix'
          amount: number
          status?: 'pending' | 'completed' | 'failed'
          processed_by: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          payment_method?: 'cash' | 'card' | 'pix'
          amount?: number
          status?: 'pending' | 'completed' | 'failed'
          processed_by?: string
          created_at?: string
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
          status: 'disconnected' | 'connecting' | 'connected'
          qr_code: string | null
          pair_code: string | null
          phone_number: string | null
          profile_name: string | null
          profile_pic_url: string | null
          is_business: boolean
          webhook_url: string
          connected_at: string | null
          disconnected_at: string | null
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
          status?: 'disconnected' | 'connecting' | 'connected'
          qr_code?: string | null
          pair_code?: string | null
          phone_number?: string | null
          profile_name?: string | null
          profile_pic_url?: string | null
          is_business?: boolean
          webhook_url: string
          connected_at?: string | null
          disconnected_at?: string | null
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
          status?: 'disconnected' | 'connecting' | 'connected'
          qr_code?: string | null
          pair_code?: string | null
          phone_number?: string | null
          profile_name?: string | null
          profile_pic_url?: string | null
          is_business?: boolean
          webhook_url?: string
          connected_at?: string | null
          disconnected_at?: string | null
          created_at?: string
          updated_at?: string
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