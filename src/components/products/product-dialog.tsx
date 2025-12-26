"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import type { Product, Category, ProductFormData } from "@/lib/types/product"

interface ProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  categories: Category[]
  onSave: (data: ProductFormData) => Promise<void>
}

/**
 * Dialog para criar/editar produto
 */
export function ProductDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSave,
}: ProductDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: 0,
    category_id: "",
    is_available: true,
  })

  // Preencher form quando editar
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price,
        category_id: product.category_id || "",
        is_available: product.is_available,
      })
    } else {
      setFormData({
        name: "",
        description: "",
        price: 0,
        category_id: categories[0]?.id || "",
        is_available: true,
      })
    }
  }, [product, categories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações
    if (!formData.name.trim()) {
      alert("Nome do produto é obrigatório")
      return
    }

    if (formData.price <= 0) {
      alert("Preço deve ser maior que zero")
      return
    }

    try {
      setIsLoading(true)
      await onSave(formData)
      onOpenChange(false)
    } catch (error) {
      console.error("Erro ao salvar produto:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {product ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {product
                ? "Atualize as informações do produto"
                : "Adicione um novo produto ao cardápio"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Nome */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Nome do Produto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: Pizza Margherita"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            {/* Descrição */}
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva os ingredientes e características..."
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* Preço e Categoria */}
            <div className="grid grid-cols-2 gap-4">
              {/* Preço */}
              <div className="grid gap-2">
                <Label htmlFor="price">
                  Preço (R$) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.price || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>

              {/* Categoria */}
              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Disponível */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="available" className="text-base">
                  Disponível
                </Label>
                <p className="text-sm text-muted-foreground">
                  Produto disponível para pedidos
                </p>
              </div>
              <Switch
                id="available"
                checked={formData.is_available}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_available: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}