"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "./order-status-badge";
import {
  Phone,
  User,
  ShoppingBag,
  Calendar,
  MessageSquare,
  MapPin,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/lib/types/order";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderCardProps {
  order: Order;
  onAccept?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  onComplete?: (orderId: string) => void;
  onClick?: (orderId: string) => void;
  isLoading?: boolean;
}

/**
 * Card de pedido para listagem
 *
 * Mostra informações essenciais e botões de ação
 * Botões aparecem baseado no status atual:
 * - pending: [Aceitar] [Recusar]
 * - preparing: [Confirmar Entrega]
 * - completed/cancelled: Apenas visualização
 */
export function OrderCard({
  order,
  onAccept,
  onReject,
  onComplete,
  onClick,
  isLoading = false,
}: OrderCardProps) {
  /**
   * Formata valor monetário em Real brasileiro
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  /**
   * Calcula tempo relativo (ex: "há 5 minutos")
   */
  const getRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "Data inválida";
    }
  };

  /**
   * Conta total de itens no pedido
   */
  const getTotalItems = () => {
    if (!order.order_items || order.order_items.length === 0) return 0;
    return order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <Card
      className={`
        hover:shadow-lg transition-shadow cursor-pointer
        ${isLoading ? "opacity-50 pointer-events-none" : ""}
      `}
      onClick={() => onClick?.(order.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Nome do cliente ou "Cliente não identificado" */}
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h3 className="font-semibold truncate">
                {order.customer_name || "Cliente não identificado"}
              </h3>
            </div>

            {/* Tipo de entrega */}
            <div className="flex items-center gap-2 mb-2">
              {order.delivery_type === "delivery" ? (
                <Badge variant="outline" className="gap-1.5">
                  <MapPin className="h-3 w-3" />
                  Entrega
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5">
                  <Package className="h-3 w-3" />
                  Retirada
                </Badge>
              )}
            </div>

            {/* Telefone do cliente */}
            {order.customer_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{order.customer_phone}</span>
              </div>
            )}
          </div>

          {/* Badge de status */}
          <OrderStatusBadge status={order.status} />
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-2">
        {/* Informações do pedido */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShoppingBag className="h-4 w-4" />
            <span>
              {getTotalItems()} {getTotalItems() === 1 ? "item" : "itens"}
            </span>
          </div>
          <span className="font-bold text-lg">
            {formatCurrency(order.total_amount)}
          </span>
        </div>

        {/* Endereço (apenas se for entrega) */}
        {order.delivery_type === "delivery" && order.delivery_address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{order.delivery_address}</span>
          </div>
        )}

        {/* Se for retirada, mostrar aviso */}
        {order.delivery_type === "pickup" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="italic">Cliente retirará no local</span>
          </div>
        )}

        {/* Data/hora do pedido */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{getRelativeTime(order.created_at)}</span>
        </div>

        {/* Observações do cliente */}
        {order.notes && (
          <div className="flex items-start gap-2 text-sm bg-muted/50 p-2 rounded">
            <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground line-clamp-2">{order.notes}</p>
          </div>
        )}
      </CardContent>

      {/* Botões de ação baseados no status */}
      {(order.status === "pending" || order.status === "preparing") && (
        <CardFooter className="pt-3 gap-2">
          {order.status === "pending" && (
            <>
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept?.(order.id);
                }}
                disabled={isLoading}
              >
                Aceitar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject?.(order.id);
                }}
                disabled={isLoading}
              >
                Recusar
              </Button>
            </>
          )}

          {order.status === "preparing" && (
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onComplete?.(order.id);
              }}
              disabled={isLoading}
            >
              Confirmar Entrega
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}