"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, ImageIcon, Layers, Plus } from "lucide-react"
import type { Product } from "@/lib/types/product"
import Image from 'next/image'

interface ProductCardProps {
  product: Product
  onEdit?: (product: Product) => void
  onDelete?: (productId: string) => void
  onManageVariations?: (product: Product) => void
  onManageExtras?: (product: Product) => void
}

export function ProductCard({
  product,
  onEdit,
  onDelete,
  onManageVariations,
  onManageExtras,
}: ProductCardProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Imagem do produto */}
      <div className="relative aspect-video w-full bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url || '/placeholder.png'}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-1">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {product.description}
              </p>
            )}
          </div>
          <Badge variant={product.is_available ? "default" : "secondary"}>
            {product.is_available ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.category && (
            <span className="text-sm text-muted-foreground">
              • {product.category.name}
            </span>
          )}
        </div>
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

        {/* Linha 3: Extras */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onManageExtras?.(product)}
          title="Gerenciar extras"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Gerenciar Extras</span>
          <span className="sm:hidden">Extras</span>
        </Button>
      </CardFooter>
    </Card>
  )
}