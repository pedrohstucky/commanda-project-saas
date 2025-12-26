"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Product, ProductVariation } from "@/lib/types/product"

interface ProductVariationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

/**
 * Dialog para gerenciar variações de um produto
 */
export function ProductVariationsDialog({
  open,
  onOpenChange,
  product,
}: ProductVariationsDialogProps) {
  const supabase = createBrowserSupabaseClient()
  
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [newVariation, setNewVariation] = useState({
    name: "",
    price_modifier: 0,
  })

  /**
   * Carrega variações do produto
   */
  const loadVariations = useCallback(async () => {
    if (!product) return

    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", product.id)
        .order("display_order")

      if (error) throw error

      setVariations(data || [])
    } catch (error) {
      console.error("Erro ao carregar variações:", error)
      toast.error("Erro ao carregar variações")
    } finally {
      setIsLoading(false)
    }
  }, [supabase, product])

  /**
   * Adiciona nova variação
   */
  const handleAdd = useCallback(async () => {
    if (!product) return
    if (!newVariation.name.trim()) {
      toast.error("Nome da variação é obrigatório")
      return
    }

    try {
      setIsSaving(true)

      // Calcular próxima ordem
      const maxOrder = variations.length > 0
        ? Math.max(...variations.map(v => v.display_order))
        : 0

      const { error } = await supabase
        .from("product_variations")
        .insert({
          product_id: product.id,
          name: newVariation.name,
          price_modifier: newVariation.price_modifier,
          display_order: maxOrder + 1,
          is_available: true,
        })

      if (error) throw error

      toast.success("Variação adicionada!")
      setNewVariation({ name: "", price_modifier: 0 })
      loadVariations()
    } catch (error) {
      console.error("Erro ao adicionar variação:", error)
      toast.error("Erro ao adicionar variação")
    } finally {
      setIsSaving(false)
    }
  }, [supabase, product, variations, newVariation, loadVariations])

  /**
   * Deleta variação
   */
  const handleDelete = useCallback(async (variationId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta variação?")) {
      return
    }

    try {
      const { error } = await supabase
        .from("product_variations")
        .delete()
        .eq("id", variationId)

      if (error) throw error

      toast.success("Variação excluída!")
      loadVariations()
    } catch (error) {
      console.error("Erro ao excluir variação:", error)
      toast.error("Erro ao excluir variação")
    }
  }, [supabase, loadVariations])

  /**
   * Toggle disponibilidade
   */
  const toggleAvailable = useCallback(async (variation: ProductVariation) => {
    try {
      const { error } = await supabase
        .from("product_variations")
        .update({ is_available: !variation.is_available })
        .eq("id", variation.id)

      if (error) throw error

      toast.success(
        variation.is_available ? "Variação desativada" : "Variação ativada"
      )
      loadVariations()
    } catch (error) {
      console.error("Erro ao atualizar variação:", error)
      toast.error("Erro ao atualizar variação")
    }
  }, [supabase, loadVariations])

  /**
   * Formata valor monetário
   */
  const formatPrice = (value: number) => {
    const sign = value >= 0 ? "+" : ""
    return `${sign}R$ ${Math.abs(value).toFixed(2)}`
  }

  useEffect(() => {
    if (open && product) {
      loadVariations()
    }
  }, [open, product, loadVariations])

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Variações de {product.name}</DialogTitle>
          <DialogDescription>
            Gerencie tamanhos e variações do produto (ex: P/M/G)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Adicionar nova variação */}
          <div className="grid grid-cols-[1fr,140px,auto] gap-2">
            <Input
              placeholder="Nome (ex: Grande, 2L)"
              value={newVariation.name}
              onChange={(e) =>
                setNewVariation({ ...newVariation, name: e.target.value })
              }
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Modificador"
              value={newVariation.price_modifier}
              onChange={(e) =>
                setNewVariation({
                  ...newVariation,
                  price_modifier: parseFloat(e.target.value) || 0,
                })
              }
            />
            <Button
              onClick={handleAdd}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Modificador: valor a adicionar (+) ou descontar (-) do preço base
          </p>

          {/* Lista de variações */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : variations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma variação cadastrada</p>
              <p className="text-xs mt-1">
                Adicione variações como tamanhos diferentes
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Modificador</TableHead>
                    <TableHead>Preço Final</TableHead>
                    <TableHead className="w-24">Ativo</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variations.map((variation) => (
                    <TableRow key={variation.id}>
                      <TableCell className="font-medium">
                        {variation.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatPrice(variation.price_modifier)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        R$ {(product.price + variation.price_modifier).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={variation.is_available}
                          onCheckedChange={() => toggleAvailable(variation)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(variation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}