/**
 * Types para o sistema de pedidos
 *
 * Fluxo simplificado:
 * pending → preparing → completed
 *        ↘ cancelled
 */

/**
 * Status do pedido
 * - pending: Aguardando aceite do restaurante
 * - preparing: Aceito e em preparo
 * - completed: Confirmado/Entregue ao cliente
 * - cancelled: Recusado ou cancelado
 */
export type OrderStatus = "pending" | "preparing" | "completed" | "cancelled";

/**
 * Item individual do pedido
 * Representa um produto com quantidade
 */
export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  variation_id: string | null
  variation_name: string | null
  quantity: number
  product_price: number
  subtotal: number
  created_at: string
  products?: {
    id: string
    name: string
    description?: string | null
    image_url?: string | null
    category_id?: string | null
  }
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[]
}



/**
 * Tipo de entrega do pedido
 */
export type DeliveryType = "delivery" | "pickup";

export interface Order {
  id: string;
  tenant_id: string;
  customer_name: string | null;
  customer_phone: string;
  delivery_type: "delivery" | "pickup";
  delivery_address: string | null;
  total_amount: number;
  status: OrderStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  order_items?: OrderItem[]; // ← Certifique-se que está aqui
}

/**
 * Pedido com items garantidos
 * Usado quando sabemos que os items foram carregados
 */
export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

/**
 * Filtros para busca de pedidos
 */
export interface OrderFilters {
  status?: OrderStatus | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}
/**
 * Dados de paginação
 */
export interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Estatísticas de pedidos
 * Usado no dashboard e relatórios
 */
export interface OrderStats {
  total: number;
  pending: number;
  preparing: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  averageTicket: number;
}

export interface CreateOrderRequest {
  customer_phone: string;
  customer_name?: string;
  delivery_type: "delivery" | "pickup";
  delivery_address?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
}

export interface CreateOrderResponse {
  order_id: string;
  total: number;
  status: string;
  items_count: number;
}
