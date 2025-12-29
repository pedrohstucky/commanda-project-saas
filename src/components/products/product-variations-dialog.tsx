"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Loader2, Ruler } from "lucide-react";
import { EmptyStateCompact } from "../ui/empty-state";
import { toast } from "sonner";
import type { Product, ProductVariation } from "@/lib/types/product";
import { CurrencyInput } from "../ui/currency-input";
import { logger } from "@/lib/logger";

interface ProductVariationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function ProductVariationsDialog({
  open,
  onOpenChange,
  product,
}: ProductVariationsDialogProps) {
  const supabase = createBrowserSupabaseClient();

  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newVariation, setNewVariation] = useState({
    name: "",
    price: 0,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    variationId?: string;
    variationName?: string;
  }>({ open: false });

  const [isDeleting, setIsDeleting] = useState(false);

  const loadVariations = useCallback(async () => {
    if (!product) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", product.id)
        .order("display_order");

      if (error) throw error;

      setVariations(data || []);
    } catch (error) {
      logger.error("Erro ao carregar variações:", error);
      toast.error("Erro ao carregar variações");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, product]);

  const handleAdd = useCallback(async () => {
    if (!product) return;

    if (!newVariation.name.trim()) {
      toast.error("Nome da variação é obrigatório");
      return;
    }

    try {
      setIsSaving(true);

      const maxOrder =
        variations.length > 0
          ? Math.max(...variations.map((v) => v.display_order))
          : 0;

      const { error } = await supabase.from("product_variations").insert({
        product_id: product.id,
        name: newVariation.name,
        price: newVariation.price,
        display_order: maxOrder + 1,
        is_available: true,
      });

      if (error) throw error;

      toast.success("Variação adicionada!");
      setNewVariation({ name: "", price: 0 });
      loadVariations();
    } catch (error) {
      logger.error("Erro ao adicionar variação:", error);
      toast.error("Erro ao adicionar variação");
    } finally {
      setIsSaving(false);
    }
  }, [supabase, product, variations, newVariation, loadVariations]);

  const handleDeleteClick = useCallback((variation: ProductVariation) => {
    setDeleteDialog({
      open: true,
      variationId: variation.id,
      variationName: variation.name,
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteDialog.variationId) return;

    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from("product_variations")
        .delete()
        .eq("id", deleteDialog.variationId);

      if (error) throw error;

      toast.success("Variação excluída!");
      loadVariations();
      setDeleteDialog({ open: false });
    } catch (error) {
      logger.error("Erro ao excluir variação:", error);
      toast.error("Erro ao excluir variação");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDialog.variationId, supabase, loadVariations]);

  const toggleAvailable = useCallback(
    async (variation: ProductVariation) => {
      // 1. Atualizar UI imediatamente
      setVariations((prev) =>
        prev.map((v) =>
          v.id === variation.id ? { ...v, is_available: !v.is_available } : v
        )
      );

      // 2. Toast imediato
      toast.success(
        variation.is_available ? "Variação desativada" : "Variação ativada"
      );

      try {
        // 3. Enviar para servidor
        const { error } = await supabase
          .from("product_variations")
          .update({ is_available: !variation.is_available })
          .eq("id", variation.id);

        if (error) throw error;
      } catch (error) {
        // 4. Reverter em caso de erro
        setVariations((prev) =>
          prev.map((v) =>
            v.id === variation.id
              ? { ...v, is_available: variation.is_available }
              : v
          )
        );

        logger.error("Erro ao atualizar variação:", error);
        toast.error("Erro ao atualizar variação");
      }
    },
    [supabase]
  );

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  useEffect(() => {
    if (open && product) {
      loadVariations();
    }
  }, [open, product, loadVariations]);

  if (!product) return null;

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
          {/* Input de nova variação */}
          <div className="grid grid-cols-[1fr,140px,auto] gap-2">
            <Input
              placeholder="Nome (ex: Grande, 2L)"
              value={newVariation.name}
              onChange={(e) =>
                setNewVariation({ ...newVariation, name: e.target.value })
              }
            />

            <CurrencyInput
              value={newVariation.price || 0}
              onChange={(value) =>
                setNewVariation({ ...newVariation, price: value })
              }
              placeholder="R$ 0,00"
            />

            <Button onClick={handleAdd} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Preço específico desta variação (não afeta o preço base do produto)
          </p>

          {/* Lista de variações */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : variations.length === 0 ? (
            <EmptyStateCompact
              icon={Ruler}
              title="Nenhuma variação cadastrada"
              description="Adicione variações como tamanhos diferentes (P/M/G) para este produto"
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço</TableHead>
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
                      <TableCell className="font-semibold">
                        {formatPrice(variation.price)}
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
                          onClick={() => handleDeleteClick(variation)}
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

        {/* Dialog de confirmação */}
        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
          title="Excluir variação?"
          description={`Tem certeza que deseja excluir "${deleteDialog.variationName}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir variação"
          cancelText="Cancelar"
          onConfirm={confirmDelete}
          variant="destructive"
          isLoading={isDeleting}
        />
      </DialogContent>
    </Dialog>
  );
}
