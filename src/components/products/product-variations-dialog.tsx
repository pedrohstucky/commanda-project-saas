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
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Product, ProductVariation } from "@/lib/types/product";
import { CurrencyInput } from "../ui/currency-input";
import { logger } from "@/lib/logger";

interface ProductVariationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

/**
 * Dialog para gerenciar variações de um produto
 */
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

  /**
   * Carrega variações do produto
   */
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

  /**
   * Adiciona nova variação
   */
  const handleAdd = useCallback(async () => {
    console.log("🔵 handleAdd chamado"); // ← DEBUG
    console.log("Product:", product); // ← DEBUG
    console.log("newVariation:", newVariation); // ← DEBUG

    if (!product) {
      console.log("❌ Sem produto"); // ← DEBUG
      return;
    }

    if (!newVariation.name.trim()) {
      console.log("❌ Nome vazio"); // ← DEBUG
      toast.error("Nome da variação é obrigatório");
      return;
    }

    console.log("✅ Validações passaram"); // ← DEBUG

    try {
      setIsSaving(true);
      console.log("🔄 Salvando..."); // ← DEBUG

      // Calcular próxima ordem
      const maxOrder =
        variations.length > 0
          ? Math.max(...variations.map((v) => v.display_order))
          : 0;

      const dataToInsert = {
        product_id: product.id,
        name: newVariation.name,
        price: newVariation.price, // ✅ Certifique-se que é 'price'
        display_order: maxOrder + 1,
        is_available: true,
      };

      console.log("📦 Dados a inserir:", dataToInsert); // ← DEBUG

      const { data, error } = await supabase
        .from("product_variations")
        .insert(dataToInsert)
        .select(); // ← ADICIONAR .select() para retornar dados

      console.log("📊 Resultado:", { data, error }); // ← DEBUG

      if (error) {
        console.error("❌ Erro do Supabase:", error); // ← DEBUG
        throw error;
      }

      console.log("✅ Variação inserida:", data); // ← DEBUG
      toast.success("Variação adicionada!");
      setNewVariation({ name: "", price: 0 });
      await loadVariations();
      console.log("✅ Lista recarregada"); // ← DEBUG
    } catch (error) {
      console.error("💥 Erro capturado:", error); // ← DEBUG
      logger.error("Erro ao adicionar variação:", error);
      toast.error("Erro ao adicionar variação");
    } finally {
      setIsSaving(false);
      console.log("🏁 handleAdd finalizado"); // ← DEBUG
    }
  }, [supabase, product, variations, newVariation, loadVariations]);

  /**
   * Deleta variação
   */
  const handleDelete = useCallback(
    async (variationId: string) => {
      if (!confirm("Tem certeza que deseja excluir esta variação?")) {
        return;
      }

      try {
        const { error } = await supabase
          .from("product_variations")
          .delete()
          .eq("id", variationId);

        if (error) throw error;

        toast.success("Variação excluída!");
        loadVariations();
      } catch (error) {
        logger.error("Erro ao excluir variação:", error);
        toast.error("Erro ao excluir variação");
      }
    },
    [supabase, loadVariations]
  );

  /**
   * Toggle disponibilidade
   */
  const toggleAvailable = useCallback(
    async (variation: ProductVariation) => {
      try {
        const { error } = await supabase
          .from("product_variations")
          .update({ is_available: !variation.is_available })
          .eq("id", variation.id);

        if (error) throw error;

        toast.success(
          variation.is_available ? "Variação desativada" : "Variação ativada"
        );
        loadVariations();
      } catch (error) {
        logger.error("Erro ao atualizar variação:", error);
        toast.error("Erro ao atualizar variação");
      }
    },
    [supabase, loadVariations]
  );

  /**
   * Formata valor monetário
   */
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

          {/* ATUALIZAR DESCRIÇÃO */}
          <p className="text-xs text-muted-foreground">
            Preço específico desta variação
          </p>

          <TableBody>
            {variations.map((variation) => (
              <TableRow key={variation.id}>
              </TableRow>
            ))}
          </TableBody>

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
  );
}
