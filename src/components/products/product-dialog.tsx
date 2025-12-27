"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { CurrencyInput } from "../ui/currency-input";
import { Loader2 } from "lucide-react";
import type { Product, Category, ProductFormData } from "@/lib/types/product";

import { logger } from "@/lib/logger";
interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  onSave: (data: ProductFormData) => Promise<void>;
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSave,
}: ProductDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string>("");

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: 0,
    category_id: undefined,
    image_url: "",
    is_available: true,
  });

  // Buscar tenantId
  useEffect(() => {
    async function getTenantId() {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setTenantId(profile.tenant_id);
      }
    }

    if (open) {
      getTenantId();
    }
  }, [open]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price,
        category_id: product.category_id || undefined,
        image_url: product.image_url || "",
        is_available: product.is_available,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        price: 0,
        category_id: categories[0]?.id || undefined,
        image_url: "",
        is_available: true,
      });
    }
  }, [product, categories, open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name.trim()) {
        alert("Nome é obrigatório");
        return;
      }

      if (formData.price < 0) {
        alert("Preço não pode ser negativo");
        return;
      }

      try {
        setIsLoading(true);
        await onSave(formData);
        onOpenChange(false);
      } catch (error) {
        logger.error("Erro ao salvar:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [formData, onSave, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[500px] max-h-[90vh] overflow-y-auto">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="grid gap-2">
            <Label htmlFor="name">
              Nome <span className="text-destructive">*</span>
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

          {/* Imagem */}
          <div className="grid gap-2">
            <Label>Imagem do Produto</Label>
            <ImageUpload
              value={formData.image_url}
              onChange={(url) =>
                setFormData({ ...formData, image_url: url || "" })
              }
              tenantId={tenantId}
              disabled={isLoading || !tenantId}
              maxSizeMB={5}
              compress={true}
            />
          </div>

          {/* Preço e Categoria */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço</Label>
              <CurrencyInput
                id="price"
                value={formData.price || 0}
                onChange={(value) => setFormData({ ...formData, price: value })}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    category_id: value === "none" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Disponível */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Disponível para venda</Label>
              <p className="text-sm text-muted-foreground">
                Clientes podem fazer pedidos deste produto
              </p>
            </div>
            <Switch
              checked={formData.is_available}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_available: checked })
              }
            />
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
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
