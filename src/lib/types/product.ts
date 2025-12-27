export interface Category {
    id: string
    tenant_id: string
    name: string
    description: string | null
    display_order: number
    is_active: boolean
    created_at: string
    updated_at: string
  }
  
  export interface Product {
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
    category?: Category
  }
  
  export interface ProductWithCategory extends Product {
    category: Category
  }
  
  export interface ProductFilters {
    category_id?: string | 'all'
    search?: string
    is_available?: boolean | 'all'
  }
  
  export interface ProductFormData {
    name: string
    description?: string
    price: number
    category_id?: string
    image_url?: string
    is_available: boolean
  }

  export interface ProductVariation {
    id: string
    product_id: string
    name: string
    price: number
    display_order: number
    is_available: boolean
    created_at: string
    updated_at: string
  }
  
  export interface ProductWithVariations extends Product {
    variations?: ProductVariation[]
  }
  
  export interface VariationFormData {
    name: string
    price: number
    is_available: boolean
  }

  export interface ProductExtra {
    id: string
    product_id: string
    name: string
    price: number
    display_order: number
    is_available: boolean
    created_at: string
    updated_at: string
  }
  
  export interface ProductWithExtras extends Product {
    extras?: ProductExtra[]
  }
  
  export interface ExtraFormData {
    name: string
    price: number
    is_available: boolean
  }