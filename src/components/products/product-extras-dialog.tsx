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
import type { Product, ProductExtra } from "@/lib/types/product";
import { CurrencyInput } from "../ui/currency-input";

import { logger } from "@/lib/logger";
interface ProductExtrasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

/**
 * Dialog para gerenciar extras de um produto
 */
export function ProductExtrasDialog({
  open,
  onOpenChange,
  product,
}: ProductExtrasDialogProps) {
  const supabase = createBrowserSupabaseClient();

  const [extras, setExtras] = useState<ProductExtra[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newExtra, setNewExtra] = useState({
    name: "",
    price: 0,
  });

  /**
   * Carrega extras do produto
   */
  const loadExtras = useCallback(async () => {
    if (!product) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("product_extras")
        .select("*")
        .eq("product_id", product.id)
        .order("display_order");

      if (error) throw error;

      setExtras(data || []);
    } catch (error) {
      logger.error("Erro ao carregar extras:", error);
      toast.error("Erro ao carregar extras");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, product]);

  /**
   * Adiciona novo extra
   */
  const handleAdd = useCallback(async () => {
    if (!product) return;
    if (!newExtra.name.trim()) {
      toast.error("Nome do extra é obrigatório");
      return;
    }
    if (newExtra.price < 0) {
      toast.error("Preço não pode ser negativo");
      return;
    }

    try {
      setIsSaving(true);

      // Calcular próxima ordem
      const maxOrder =
        extras.length > 0 ? Math.max(...extras.map((e) => e.display_order)) : 0;

      const { error } = await supabase.from("product_extras").insert({
        product_id: product.id,
        name: newExtra.name,
        price: newExtra.price,
        display_order: maxOrder + 1,
        is_available: true,
      });

      if (error) throw error;

      toast.success("Extra adicionado!");
      setNewExtra({ name: "", price: 0 });
      loadExtras();
    } catch (error) {
      logger.error("Erro ao adicionar extra:", error);
      toast.error("Erro ao adicionar extra");
    } finally {
      setIsSaving(false);
    }
  }, [supabase, product, extras, newExtra, loadExtras]);

  /**
   * Deleta extra
   */
  const handleDelete = useCallback(
    async (extraId: string) => {
      if (!confirm("Tem certeza que deseja excluir este extra?")) {
        return;
      }

      try {
        const { error } = await supabase
          .from("product_extras")
          .delete()
          .eq("id", extraId);

        if (error) throw error;

        toast.success("Extra excluído!");
        loadExtras();
      } catch (error) {
        logger.error("Erro ao excluir extra:", error);
        toast.error("Erro ao excluir extra");
      }
    },
    [supabase, loadExtras]
  );

  /**
   * Toggle disponibilidade
   */
  const toggleAvailable = useCallback(
    async (extra: ProductExtra) => {
      try {
        const { error } = await supabase
          .from("product_extras")
          .update({ is_available: !extra.is_available })
          .eq("id", extra.id);

        if (error) throw error;

        toast.success(
          extra.is_available ? "Extra desativado" : "Extra ativado"
        );
        loadExtras();
      } catch (error) {
        logger.error("Erro ao atualizar extra:", error);
        toast.error("Erro ao atualizar extra");
      }
    },
    [supabase, loadExtras]
  );

  /**
   * Templates rápidos
   */
  const createPizzaExtras = useCallback(async () => {
    if (!product) return;

    try {
      setIsSaving(true);

      const pizzaExtras = [
        { name: "Bacon", price: 5.0, display_order: 1 },
        { name: "Queijo extra", price: 3.0, display_order: 2 },
        { name: "Azeitona", price: 2.0, display_order: 3 },
        { name: "Calabresa", price: 4.0, display_order: 4 },
        { name: "Catupiry", price: 6.0, display_order: 5 },
      ];

      const { error } = await supabase.from("product_extras").insert(
        pizzaExtras.map((e) => ({
          product_id: product.id,
          ...e,
          is_available: true,
        }))
      );

      if (error) throw error;

      toast.success("Extras de pizza criados!");
      loadExtras();
    } catch (error) {
      logger.error("Erro ao criar extras:", error);
      toast.error("Erro ao criar extras");
    } finally {
      setIsSaving(false);
    }
  }, [supabase, product, loadExtras]);

  const createBurgerExtras = useCallback(async () => {
    if (!product) return;

    try {
      setIsSaving(true);

      const burgerExtras = [
        { name: "Bacon", price: 5.0, display_order: 1 },
        { name: "Queijo cheddar", price: 4.0, display_order: 2 },
        { name: "Ovo", price: 3.0, display_order: 3 },
        { name: "Cebola caramelizada", price: 2.5, display_order: 4 },
        { name: "Molho especial", price: 2.0, display_order: 5 },
      ];

      const { error } = await supabase.from("product_extras").insert(
        burgerExtras.map((e) => ({
          product_id: product.id,
          ...e,
          is_available: true,
        }))
      );

      if (error) throw error;

      toast.success("Extras de hambúrguer criados!");
      loadExtras();
    } catch (error) {
      logger.error("Erro ao criar extras:", error);
      toast.error("Erro ao criar extras");
    } finally {
      setIsSaving(false);
    }
  }, [supabase, product, loadExtras]);

  /**
   * Formata valor monetário
   */
  const formatPrice = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  useEffect(() => {
    if (open && product) {
      loadExtras();
    }
  }, [open, product, loadExtras]);

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extras de {product.name}</DialogTitle>
          <DialogDescription>
            Gerencie complementos opcionais do produto
          </DialogDescription>
        </DialogHeader>

        {/* Templates rápidos */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={createPizzaExtras}
            disabled={extras.length > 0 || isSaving}
          >
            🍕 Pizza
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={createBurgerExtras}
            disabled={extras.length > 0 || isSaving}
          >
            🍔 Hambúrguer
          </Button>
        </div>

        <div className="space-y-4">
          {/* Adicionar novo extra */}
          <div className="grid grid-cols-[1fr,120px,auto] gap-2">
            <Input
              placeholder="Nome (ex: Bacon)"
              value={newExtra.name}
              onChange={(e) =>
                setNewExtra({ ...newExtra, name: e.target.value })
              }
            />
            <CurrencyInput
              value={newExtra.price || 0}
              onChange={(value) =>
                setNewExtra({ ...newExtra, price: value })
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

          {/* Lista de extras */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : extras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhum extra cadastrado</p>
              <p className="text-xs mt-1">
                Adicione complementos opcionais para este produto
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
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
                  {extras.map((extra) => (
                    <TableRow key={extra.id}>
                      <TableCell className="font-medium">
                        {extra.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatPrice(extra.price)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={extra.is_available}
                          onCheckedChange={() => toggleAvailable(extra)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(extra.id)}
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
