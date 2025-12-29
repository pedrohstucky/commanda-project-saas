"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Edit,
  Trash2,
  ImageIcon,
  MoreVertical,
  Layers,
  Plus,
  Tag,
} from "lucide-react"
import type { Product } from "@/lib/types/product"
import Image from "next/image"
import { useState } from "react"
import { HoverScale } from "@/components/ui/animations"

interface ProductCardProps {
  product: Product
  onEdit?: (product: Product) => void
  onDelete?: (productId: string) => void
  onToggleAvailability?: (product: Product) => void
  onManageVariations?: (product: Product) => void
  onManageExtras?: (product: Product) => void
}

export function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggleAvailability,
  onManageVariations,
  onManageExtras,
}: ProductCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  // Simular contagem (depois pode vir do backend)
  const variationsCount = 0 // TODO: buscar do backend
  const extrasCount = 0 // TODO: buscar do backend

  return (
    <HoverScale>
      <Card className="group overflow-hidden transition-all hover:shadow-md relative flex flex-col h-full p-0">
        {/* ↑ ADICIONAR p-0 */}
        
        {/* Menu de ações (sempre visível no mobile, hover no desktop) */}
        <div className="absolute top-3 right-3 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full shadow-sm bg-background/95 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(product)
                  setIsMenuOpen(false)
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar produto
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onManageVariations?.(product)
                  setIsMenuOpen(false)
                }}
              >
                <Layers className="h-4 w-4 mr-2" />
                Variações
                {variationsCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {variationsCount}
                  </Badge>
                )}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onManageExtras?.(product)
                  setIsMenuOpen(false)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Extras
                {extrasCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {extrasCount}
                  </Badge>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(product.id)
                  setIsMenuOpen(false)
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Imagem do produto */}
        <div className="relative aspect-video w-full bg-muted">
          {/* ↑ REMOVER rounded-t-lg (o Card já tem rounded) */}
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}

          {/* Badge de status (overlay na imagem) */}
          {!product.is_available && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
              <Badge variant="secondary" className="text-xs">
                Indisponível
              </Badge>
            </div>
          )}
        </div>

        {/* Conteúdo - flex-1 para preencher espaço */}
        <div className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            {/* Nome do produto */}
            <h3 className="font-semibold line-clamp-1 text-base">{product.name}</h3>

            {/* Preço + Toggle */}
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-xl font-bold text-primary">
                {formatPrice(product.price)}
              </span>

              <div 
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {product.is_available ? "Ativo" : "Inativo"}
                </span>
                <Switch
                  checked={product.is_available}
                  onCheckedChange={() => onToggleAvailability?.(product)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 pb-10 space-y-2 flex-1 flex flex-col justify-between">
            {/* Descrição */}
            <div>
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>

            {/* Info badges - sempre no final */}
            <div className="flex flex-wrap gap-2 pt-2">
              {/* Categoria */}
              {product.category && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Tag className="h-3 w-3" />
                  {product.category.name}
                </Badge>
              )}

              {/* Variações */}
              {variationsCount > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Layers className="h-3 w-3" />
                  {variationsCount} var
                </Badge>
              )}

              {/* Extras */}
              {extrasCount > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Plus className="h-3 w-3" />
                  {extrasCount} extras
                </Badge>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </HoverScale>
  )
}