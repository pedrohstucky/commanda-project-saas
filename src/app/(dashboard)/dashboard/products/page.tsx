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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Package, FolderOpen } from "lucide-react";
import { EmptyState, NoResultsState } from "@/components/ui/empty-state";
import { toastWithUndo, toastError } from "@/lib/toast-helpers";
import {
  StaggerContainer,
  StaggerItem,
  PageTransition,
} from "@/components/ui/animations";
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
          category:categories(*),
          variations:product_variations(count),
          extras:product_extras(count)
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

      // Salvar referência do produto ANTES de modificar
      const productToDelete = products.find(
        (p) => p.id === deleteDialog.productId
      );
      if (!productToDelete) {
        toast.error("Produto não encontrado");
        return;
      }

      // Verificar uso em pedidos
      const { count: usageCount, error: countError } = await supabase
        .from("order_items")
        .select("*", { count: "exact", head: true })
        .eq("product_id", deleteDialog.productId);

      if (countError) {
        throw countError;
      }

      if (usageCount && usageCount > 0) {
        // ===== DESATIVAR =====

        // 1. Optimistic update
        setProducts((prev) =>
          prev.map((p) =>
            p.id === deleteDialog.productId ? { ...p, is_available: false } : p
          )
        );

        // 2. Toast com desfazer
        toastWithUndo(
          `${productToDelete.name} desativado`,
          async () => {
            // Reativar produto
            const { error } = await supabase
              .from("products")
              .update({ is_available: true })
              .eq("id", deleteDialog.productId);

            if (error) throw error;

            // Atualizar UI
            setProducts((prev) =>
              prev.map((p) =>
                p.id === deleteDialog.productId
                  ? { ...p, is_available: true }
                  : p
              )
            );
          },
          {
            description: `Vendido ${usageCount}x. Desativado para preservar histórico.`,
            duration: 6000,
          }
        );

        // 3. Persistir desativação
        const { error: updateError } = await supabase
          .from("products")
          .update({ is_available: false })
          .eq("id", deleteDialog.productId);

        if (updateError) throw updateError;
      } else {
        // ===== DELETAR =====

        // 1. Optimistic update
        setProducts((prev) =>
          prev.filter((p) => p.id !== deleteDialog.productId)
        );

        // 2. Toast com desfazer
        toastWithUndo(
          `${productToDelete.name} excluído`,
          async () => {
            // Recriar produto (copia TODOS os campos)
            const { error } = await supabase.from("products").insert({
              id: productToDelete.id,
              tenant_id: productToDelete.tenant_id,
              name: productToDelete.name,
              description: productToDelete.description,
              price: productToDelete.price,
              category_id: productToDelete.category_id,
              image_url: productToDelete.image_url,
              is_available: productToDelete.is_available,
              created_at: productToDelete.created_at,
            });

            if (error) throw error;

            // Recarregar lista
            await loadProducts();
          },
          {
            description: "Nunca foi vendido.",
            duration: 6000,
          }
        );

        // 3. Persistir exclusão
        const { error: deleteError } = await supabase
          .from("products")
          .delete()
          .eq("id", deleteDialog.productId);

        if (deleteError) throw deleteError;
      }

      setDeleteDialog({ open: false });
    } catch (error) {
      // Reverter tudo em caso de erro
      await loadProducts();
      toastError("Erro ao processar produto", error, { showDetails: true });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDialog.productId, supabase, products, loadProducts]);

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

  const toggleAvailability = useCallback(
    async (product: Product) => {
      // 1. Optimistic update
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_available: !p.is_available } : p
        )
      );

      // 2. Toast com NOME do produto
      toast.success(
        product.is_available
          ? `${product.name} desativado`
          : `${product.name} ativado`
      );

      try {
        // 3. Persistir
        const { error } = await supabase
          .from("products")
          .update({ is_available: !product.is_available })
          .eq("id", product.id);

        if (error) throw error;
      } catch (error) {
        // 4. Reverter em caso de erro
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id
              ? { ...p, is_available: product.is_available }
              : p
          )
        );

        logger.error("Erro ao atualizar produto:", error);
        toast.error("Erro ao atualizar disponibilidade");
      }
    },
    [supabase]
  );
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-screen-2xl px-6 space-y-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cardápio</h1>
            <p className="text-base text-muted-foreground">
              Gerencie os produtos do seu restaurante
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push("/dashboard/products/categories")}
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Categorias</span>
            </Button>
            <Button
              className="gap-2 flex-1 sm:flex-none"
              onClick={handleCreate}
            >
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
          // Verificar se é busca ou vazio real
          filters.search ||
          filters.category_id !== "all" ||
          filters.is_available !== "all" ? (
            <NoResultsState
              searchQuery={filters.search || "filtros aplicados"}
              onClear={() => {
                setFilters({
                  category_id: "all",
                  search: "",
                  is_available: "all",
                });
              }}
            />
          ) : (
            <EmptyState
              icon={Package}
              title="Nenhum produto cadastrado"
              description="Comece adicionando produtos ao seu cardápio para que seus clientes possam fazer pedidos."
              action={{
                label: "Adicionar primeiro produto",
                onClick: handleCreate,
              }}
            />
          )
        ) : (
          <StaggerContainer>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <StaggerItem key={product.id}>
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEdit}
                    onDelete={() => handleDeleteClick(product)}
                    onToggleAvailability={toggleAvailability}
                    onManageVariations={handleManageVariations}
                    onManageExtras={handleManageExtras}
                  />
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
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
    </PageTransition>
  );
}
