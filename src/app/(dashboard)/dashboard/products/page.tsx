"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ProductCard } from "@/components/products/product-card";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductDialog } from "@/components/products/product-dialog";
import { ProductVariationsDialog } from "@/components/products/product-variations-dialog";
import { ProductExtrasDialog } from "@/components/products/product-extras-dialog";
import { ProductsGridSkeleton } from "@/components/ui/skeleton-patterns";
import { ConfirmDialog } from "@/components/ui/confirme-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Package, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type {
  Product,
  Category,
  ProductFilters as ProductFiltersType,
  ProductFormData,
} from "@/lib/types/product";

export default function ProductsPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState<ProductFiltersType>({
    category_id: "all",
    search: "",
    is_available: "all",
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [variationsDialogOpen, setVariationsDialogOpen] = useState(false);
  const [selectedProductForVariations, setSelectedProductForVariations] =
    useState<Product | null>(null);

  const [extrasDialogOpen, setExtrasDialogOpen] = useState(false);
  const [selectedProductForExtras, setSelectedProductForExtras] =
    useState<Product | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    productId?: string;
    productName?: string;
  }>({ open: false });

  const [isDeleting, setIsDeleting] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      let query = supabase
        .from("products")
        .select(
          `
          *,
          category:categories(*)
        `
        )
        .eq("tenant_id", profile.tenant_id)
        .order("name");

      if (filters.category_id && filters.category_id !== "all") {
        query = query.eq("category_id", filters.category_id);
      }

      if (filters.search && filters.search.trim().length > 0) {
        query = query.ilike("name", `%${filters.search.trim()}%`);
      }

      if (
        filters.is_available !== "all" &&
        filters.is_available !== undefined
      ) {
        query = query.eq("is_available", filters.is_available);
      }

      const { data, error } = await query;

      if (error) {
        logger.error("Erro ao carregar produtos:", error);
        toast.error("Erro ao carregar produtos");
        return;
      }

      setProducts(data as Product[]);
    } catch (error) {
      logger.error("Erro ao carregar produtos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filters]);

  const handleSave = useCallback(
    async (data: ProductFormData) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .single();

        if (!profile) return;

        if (selectedProduct) {
          // ATUALIZAR
          const updateData = {
            name: data.name,
            description: data.description || null,
            price: data.price,
            category_id: data.category_id || null,
            image_url: data.image_url || null,
            is_available: data.is_available,
            updated_at: new Date().toISOString(),
          };

          logger.debug("📝 Atualizando produto:", updateData);

          const { error } = await supabase
            .from("products")
            .update(updateData)
            .eq("id", selectedProduct.id);

          if (error) throw error;

          toast.success("Produto atualizado com sucesso!");
        } else {
          // CRIAR
          const insertData = {
            tenant_id: profile.tenant_id,
            name: data.name,
            description: data.description || null,
            price: data.price,
            category_id: data.category_id || null,
            image_url: data.image_url || null,
            is_available: data.is_available,
          };

          logger.debug("➕ Criando produto:", insertData);

          const { error } = await supabase.from("products").insert(insertData);

          if (error) throw error;

          toast.success("Produto criado com sucesso!");
        }

        loadProducts();
        setSelectedProduct(null);
      } catch (error) {
        logger.error("❌ Erro ao salvar produto:", error);
        toast.error("Erro ao salvar produto", {
          description:
            error instanceof Error ? error.message : "Erro desconhecido",
        });
        throw error;
      }
    },
    [supabase, selectedProduct, loadProducts]
  );

  const loadCategories = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .order("display_order");

      if (error) {
        logger.error("Erro ao carregar categorias:", error);
        return;
      }

      setCategories(data);
    } catch (error) {
      logger.error("Erro ao carregar categorias:", error);
    }
  }, [supabase]);

  const handleDeleteClick = useCallback((product: Product) => {
    setDeleteDialog({
      open: true,
      productId: product.id,
      productName: product.name,
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteDialog.productId) return;

    try {
      setIsDeleting(true);

      // ✅ VERIFICAR SE PRODUTO JÁ FOI USADO EM PEDIDOS
      const { count: usageCount, error: checkError } = await supabase
        .from("order_items")
        .select("*", { count: "exact", head: true })
        .eq("product_id", deleteDialog.productId);

      if (checkError) {
        logger.error("Erro ao verificar uso do produto:", checkError);
        toast.error("Erro ao verificar produto");
        return;
      }

      // ✅ SE PRODUTO JÁ FOI USADO, APENAS DESATIVAR
      if (usageCount && usageCount > 0) {
        logger.debug(
          "Produto já foi usado em pedidos, desativando ao invés de deletar",
          {
            productId: deleteDialog.productId,
            usageCount,
          }
        );

        const { error: updateError } = await supabase
          .from("products")
          .update({ is_available: false })
          .eq("id", deleteDialog.productId);

        if (updateError) {
          logger.error("Erro ao desativar produto:", updateError);
          toast.error("Erro ao desativar produto");
          return;
        }

        toast.success("Produto desativado com sucesso!", {
          description: `Este produto já foi vendido ${usageCount} vez(es) e foi desativado ao invés de excluído para manter o histórico de pedidos.`,
        });
      } else {
        // ✅ SE NUNCA FOI USADO, PODE DELETAR
        logger.debug("Produto nunca foi usado, deletando permanentemente");

        const { error: deleteError } = await supabase
          .from("products")
          .delete()
          .eq("id", deleteDialog.productId);

        if (deleteError) {
          logger.error("Erro ao excluir produto:", deleteError);
          toast.error("Erro ao excluir produto", {
            description: deleteError.message,
          });
          return;
        }

        toast.success("Produto excluído com sucesso!");
      }

      await loadProducts();
      setDeleteDialog({ open: false });
    } catch (error) {
      logger.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao processar produto");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDialog.productId, supabase, loadProducts]);

  const handleEdit = useCallback((product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  }, []);

  const handleManageVariations = useCallback((product: Product) => {
    setSelectedProductForVariations(product);
    setVariationsDialogOpen(true);
  }, []);

  const handleManageExtras = useCallback((product: Product) => {
    setSelectedProductForExtras(product);
    setExtrasDialogOpen(true);
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Cardápio</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie os produtos do seu restaurante
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 flex-1 sm:flex-none"
            onClick={() => router.push("/dashboard/products/categories")}
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
          </Button>
          <Button className="gap-2 flex-1 sm:flex-none" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <ProductFilters
        filters={filters}
        categories={categories}
        onFiltersChange={setFilters}
      />

      {/* Lista de produtos */}
      {isLoading ? (
        <ProductsGridSkeleton count={8} />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Nenhum produto encontrado
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            {filters.search ||
            filters.category_id !== "all" ||
            filters.is_available !== "all"
              ? "Tente ajustar os filtros de busca"
              : "Comece adicionando produtos ao seu cardápio"}
          </p>
          <Button className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Adicionar Primeiro Produto
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
              onDelete={() => handleDeleteClick(product)}
              onManageVariations={handleManageVariations}
              onManageExtras={handleManageExtras}
            />
          ))}
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Excluir produto?"
        description={`Deseja excluir "${deleteDialog.productName}"? 
    
Se o produto já foi vendido, ele será apenas desativado para preservar o histórico de pedidos. Caso contrário, será excluído permanentemente.`}
        confirmText="Continuar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        variant="destructive"
        isLoading={isDeleting}
      />

      {/* Dialog de criar/editar */}
      <ProductDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        product={selectedProduct}
        categories={categories}
        onSave={handleSave}
      />

      {/* Dialog de variações */}
      <ProductVariationsDialog
        open={variationsDialogOpen}
        onOpenChange={setVariationsDialogOpen}
        product={selectedProductForVariations}
      />

      {/* Dialog de extras */}
      <ProductExtrasDialog
        open={extrasDialogOpen}
        onOpenChange={setExtrasDialogOpen}
        product={selectedProductForExtras}
      />
    </div>
  );
}
