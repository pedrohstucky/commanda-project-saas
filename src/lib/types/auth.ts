export interface RegisterRequest {
    email: string
    password: string
    fullName: string
    restaurantName: string
  }
  
  export interface RegisterResponse {
    success: boolean
    data?: {
      userId: string
      tenantId: string // ← Corrigido de "tanatId"
      qrCode: string
    }
    error?: string
  }