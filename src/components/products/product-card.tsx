"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, ImageIcon, Layers } from "lucide-react"
import type { Product } from "@/lib/types/product"
import Image from "next/image"

interface ProductCardProps {
  product: Product
  onEdit?: (product: Product) => void
  onDelete?: (productId: string) => void
  onManageVariations?: (product: Product) => void
}

/**
 * Card de produto para listagem
 */
export function ProductCard({ 
  product, 
  onEdit, 
  onDelete,
  onManageVariations 
}: ProductCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Imagem */}
      <div className="relative aspect-video bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
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

      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
        {/* Linha 1: Editar e Excluir */}
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit?.(product)}
            title="Editar produto"
          >
            <Edit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
            onClick={() => onDelete?.(product.id)}
            title="Excluir produto"
          >
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Excluir</span>
          </Button>
        </div>

        {/* Linha 2: Variações */}
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => onManageVariations?.(product)}
          title="Gerenciar variações"
        >
          <Layers className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Gerenciar Variações</span>
          <span className="sm:hidden">Variações</span>
        </Button>
      </CardFooter>
    </Card>
  )
}