"use client"

import { Card } from "@/components/ui/card"
import { ImageIcon, Plus } from "lucide-react"
import Image from "next/image"

interface OrderItemExtra {
  id: string
  extra_id: string
  extra_name: string
  extra_price: number
}

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  variation_id?: string | null
  variation_name?: string | null
  quantity: number
  product_price: number
  subtotal: number
  order_item_extras?: OrderItemExtra[]
  products?: {
    id: string
    name: string
    description?: string | null
    image_url?: string | null
  }
}

interface OrderItemsListProps {
  items: OrderItem[]
}

/**
 * Lista de itens do pedido
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
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Nenhum item neste pedido</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex gap-4">
            {/* Imagem do produto */}
            <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
              {item.products?.image_url ? (
                <Image
                  src={item.products.image_url}
                  alt={item.product_name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Detalhes do item */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="font-medium line-clamp-1">
                    {item.product_name}
                  </p>
                  
                  {/* Variação */}
                  {item.variation_name && (
                    <p className="text-sm text-muted-foreground">
                      {item.variation_name}
                    </p>
                  )}
                  
                  {/* Extras */}
                  {item.order_item_extras && item.order_item_extras.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.order_item_extras.map((extra) => (
                        <span
                          key={extra.id}
                          className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded"
                        >
                          <Plus className="h-3 w-3" />
                          {extra.extra_name}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    Quantidade: {item.quantity}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  <p className="font-semibold">
                    {formatCurrency(item.subtotal)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.product_price)} cada
                  </p>
                  {/* Mostrar preço dos extras */}
                  {item.order_item_extras && item.order_item_extras.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      +{formatCurrency(
                        item.order_item_extras.reduce((sum, e) => sum + e.extra_price, 0)
                      )} extras
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {/* Total */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "itens"}
          </span>
          <span className="text-lg font-bold">
            {formatCurrency(
              items.reduce((sum, item) => sum + item.subtotal, 0)
            )}
          </span>
        </div>
      </div>
    </div>
  )
}