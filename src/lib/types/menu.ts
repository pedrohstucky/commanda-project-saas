export interface MenuSettings {
    slug: string
    menu_enabled: boolean
    theme_color: string
    whatsapp_number: string
    opening_hours: OpeningHours
    welcome_message: string
    social_links: SocialLinks
  }
  
  export interface OpeningHours {
    monday: DayHours
    tuesday: DayHours
    wednesday: DayHours
    thursday: DayHours
    friday: DayHours
    saturday: DayHours
    sunday: DayHours
  }
  
  export interface DayHours {
    open: string
    close: string
    closed?: boolean
  }
  
  export interface SocialLinks {
    instagram?: string
    facebook?: string
    website?: string
  }
  
  export interface CartItem {
    product_id: string
    product_name: string
    product_price: number
    variation_id?: string
    variation_name?: string
    variation_modifier?: number
    extras: Array<{
      id: string
      name: string
      price: number
    }>
    quantity: number
    notes?: string
  }
  
  export interface Cart {
    items: CartItem[]
    total: number
  }
  
  export interface MenuAnalytics {
    views_today: number
    views_week: number
    views_month: number
    top_products: Array<{
      product_id: string
      product_name: string
      clicks: number
    }>
    whatsapp_clicks: number
  }