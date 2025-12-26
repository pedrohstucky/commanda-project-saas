"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2 } from "lucide-react"
import type { Product } from "@/lib/types/product"

interface ProductCardProps {
  product: Product
  onEdit?: (product: Product) => void
  onDelete?: (productId: string) => void
}

/**
 * Card de produto para listagem
 */
export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative bg-white">
        {/* Badge de disponibilidade */}
        <div className="absolute top-2 right-2">
          <Badge variant={product.is_available ? "default" : "secondary"}>
            {product.is_available ? "Disponível" : "Indisponível"}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Categoria */}
        {product.category && (
          <p className="text-xs text-muted-foreground mb-2">
            {product.category.name}
          </p>
        )}

        {/* Nome */}
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">
          {product.name}
        </h3>

        {/* Descrição */}
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {product.description}
          </p>
        )}

        {/* Preço */}
        <p className="text-2xl font-bold text-primary">
          {formatCurrency(product.price)}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
          onClick={() => onEdit?.(product)}
        >
          <Edit className="h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-2 text-destructive hover:text-destructive"
          onClick={() => onDelete?.(product.id)}
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </CardFooter>
    </Card>
  )
}