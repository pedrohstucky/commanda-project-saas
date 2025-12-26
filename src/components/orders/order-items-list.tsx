import { OrderItem } from "@/lib/types/order"
import Image from "next/image"
import { Package } from "lucide-react"

interface OrderItemsListProps {
  items: OrderItem[]
}

/**
 * Lista de itens do pedido
 * 
 * Mostra cada produto com:
 * - Imagem (se disponível)
 * - Nome do produto
 * - Quantidade
 * - Preço unitário
 * - Subtotal
 */
export function OrderItemsList({ items }: OrderItemsListProps) {
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhum item no pedido
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 p-3 rounded-lg border bg-card"
        >
          {/* Imagem do produto */}
          <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
            {item.product?.image_url ? (
              <Image
                src={item.product.image_url}
                alt={item.product.name || "Produto"}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Informações do produto */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">
              {item.product?.name || "Produto desconhecido"}
            </h4>
            {item.product?.description && (
              <p className="text-sm text-muted-foreground truncate">
                {item.product.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>Qtd: {item.quantity}</span>
              <span>•</span>
              <span>{formatCurrency(item.product_price)} cada</span>
            </div>
          </div>

          {/* Subtotal */}
          <div className="text-right flex-shrink-0">
            <p className="font-semibold">
              {formatCurrency(item.quantity * item.product_price)}
            </p>
          </div>
        </div>
      ))}

      {/* Total do pedido */}
      <div className="flex items-center justify-between pt-3 border-t">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-bold">
          {formatCurrency(
            items.reduce((sum, item) => sum + (item.quantity * item.product_price), 0)
          )}
        </span>
      </div>
    </div>
  )
}