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
        tanatId: string
        qrCode: string
    }
    error?: string
}

export interface Product {
    id: string
    name: string
    price: number
    is_available: boolean
}

export interface CreateOrderRequest {
    customer_phone: string
    items: Array<{
        product_id: string
        quantity: number
    }>
}

export interface CreateOrderResponse {
    order_id: string
    total: number
    status: string
}
