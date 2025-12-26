"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OrderStatusBadge } from "./order-status-badge"
import { 
  MapPin, 
  Phone, 
  Clock, 
  Package, 
  Check, 
  X, 
  CheckCircle,
  Loader2,
  ShoppingBag
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Order } from "@/lib/types/order"

interface OrderCardProps {
  order: Order
  onAccept?: (orderId: string) => void
  onReject?: (orderId: string) => void
  onComplete?: (orderId: string) => void
  onClick?: (orderId: string) => void
  isLoading?: boolean
}

export function OrderCard({
  order,
  onAccept,
  onReject,
  onComplete,
  onClick,
  isLoading = false,
}: OrderCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick?.(order.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {order.customer_name || "Cliente sem nome"}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </div>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {/* Telefone */}
        {order.customer_phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{order.customer_phone}</span>
          </div>
        )}

        {/* Endereço ou Retirada */}
        <div className="flex items-start gap-2 text-sm">
          {order.delivery_type === "delivery" ? (
            <>
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground line-clamp-2">
                {order.delivery_address || "Endereço não informado"}
              </span>
            </>
          ) : (
            <>
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Retirada no local</span>
            </>
          )}
        </div>

        {/* Itens do pedido */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="pt-2 border-t space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <ShoppingBag className="h-3 w-3" />
              <span>Itens ({order.order_items.length})</span>
            </div>
            <div className="space-y-0.5">
              {order.order_items.slice(0, 3).map((item) => (
                <div key={item.id} className="text-sm flex items-start justify-between gap-2">
                  <span className="flex-1 line-clamp-1">
                    {item.quantity}x {item.product_name}
                    {item.variation_name && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({item.variation_name})
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
              {order.order_items.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  + {order.order_items.length - 3} item(ns)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
        {order.status === "pending" && (
          <>
            <Button
              variant="default"
              size="sm"
              className="flex-1 min-w-[120px]"
              onClick={(e) => {
                e.stopPropagation()
                onAccept?.(order.id)
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Aceitar</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-w-[120px]"
              onClick={(e) => {
                e.stopPropagation()
                onReject?.(order.id)
              }}
              disabled={isLoading}
            >
              <X className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Recusar</span>
            </Button>
          </>
        )}

        {order.status === "preparing" && (
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onComplete?.(order.id)
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Marcar como Concluído</span>
                <span className="sm:hidden">Concluir</span>
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}