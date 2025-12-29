"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CategoryDialog } from "@/components/products/category-dialog";
import { CategoriesTableSkeleton } from "@/components/ui/skeleton-patterns";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toastWithUndo, toastError } from "@/lib/toast-helpers";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus,
  FolderOpen,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { Category } from "@/lib/types/product";

import { logger } from "@/lib/logger";
export default function CategoriesPage() {
  const supabase = createBrowserSupabaseClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    categoryId?: string;
    categoryName?: string;
  }>({ open: false });
  const [isDeleting, setIsDeleting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCategories = useCallback(async () => {
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

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("display_order");

      if (error) {
        logger.error("Erro ao carregar categorias:", error);
        toast.error("Erro ao carregar categorias");
        return;
      }

      setCategories(data);
    } catch (error) {
      logger.error("Erro ao carregar categorias:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const handleDeleteClick = useCallback((category: Category) => {
    setDeleteDialog({
      open: true,
      categoryId: category.id,
      categoryName: category.name,
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteDialog.categoryId) return;

    try {
      setIsDeleting(true);

      // ✅ Salvar referência da categoria ANTES
      const categoryToDelete = categories.find(
        (c) => c.id === deleteDialog.categoryId
      );
      if (!categoryToDelete) {
        toast.error("Categoria não encontrada");
        return;
      }

      // 1. Optimistic update
      setCategories((prev) =>
        prev.filter((c) => c.id !== deleteDialog.categoryId)
      );

      // 2. Toast com desfazer
      toastWithUndo(
        `${categoryToDelete.name} excluída`,
        async () => {
          // Recriar categoria
          const { error } = await supabase.from("categories").insert({
            id: categoryToDelete.id,
            tenant_id: categoryToDelete.tenant_id,
            name: categoryToDelete.name,
            description: categoryToDelete.description,
            display_order: categoryToDelete.display_order,
            is_active: categoryToDelete.is_active,
            created_at: categoryToDelete.created_at,
          });

          if (error) throw error;

          // Recarregar lista
          await loadCategories();
        },
        {
          description: "Os produtos desta categoria ficarão sem categoria.",
          duration: 6000,
        }
      );

      // 3. Persistir exclusão
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", deleteDialog.categoryId);

      if (error) throw error;

      setDeleteDialog({ open: false });
    } catch (error) {
      // Reverter em caso de erro
      await loadCategories();
      toastError("Erro ao excluir categoria", error, { showDetails: true });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDialog.categoryId, supabase, categories, loadCategories]);

  const handleMoveUp = useCallback(
    async (category: Category) => {
      if (category.display_order <= 1) return;

      try {
        const previousCategory = categories.find(
          (c) => c.display_order === category.display_order - 1
        );

        if (!previousCategory) return;

        await Promise.all([
          supabase
            .from("categories")
            .update({ display_order: category.display_order })
            .eq("id", previousCategory.id),
          supabase
            .from("categories")
            .update({ display_order: previousCategory.display_order })
            .eq("id", category.id),
        ]);

        toast.success("Ordem atualizada!");
        loadCategories();
      } catch (error) {
        logger.error("Erro ao reordenar:", error);
        toast.error("Erro ao reordenar categoria");
      }
    },
    [supabase, categories, loadCategories]
  );

  const handleMoveDown = useCallback(
    async (category: Category) => {
      if (category.display_order >= categories.length) return;

      try {
        const nextCategory = categories.find(
          (c) => c.display_order === category.display_order + 1
        );

        if (!nextCategory) return;

        await Promise.all([
          supabase
            .from("categories")
            .update({ display_order: category.display_order })
            .eq("id", nextCategory.id),
          supabase
            .from("categories")
            .update({ display_order: nextCategory.display_order })
            .eq("id", category.id),
        ]);

        toast.success("Ordem atualizada!");
        loadCategories();
      } catch (error) {
        logger.error("Erro ao reordenar:", error);
        toast.error("Erro ao reordenar categoria");
      }
    },
    [supabase, categories, loadCategories]
  );

  const handleSave = useCallback(
    async (data: {
      name: string;
      description?: string;
      is_active: boolean;
    }) => {
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

        if (selectedCategory) {
          const { error } = await supabase
            .from("categories")
            .update({
              name: data.name,
              description: data.description || null,
              is_active: data.is_active,
            })
            .eq("id", selectedCategory.id);

          if (error) throw error;

          toast.success("Categoria atualizada com sucesso!");
        } else {
          const { data: maxOrderData } = await supabase
            .from("categories")
            .select("display_order")
            .eq("tenant_id", profile.tenant_id)
            .order("display_order", { ascending: false })
            .limit(1)
            .maybeSingle();

          const nextOrder = (maxOrderData?.display_order || 0) + 1;

          const { error } = await supabase.from("categories").insert({
            tenant_id: profile.tenant_id,
            name: data.name,
            description: data.description || null,
            display_order: nextOrder,
            is_active: data.is_active,
          });

          if (error) throw error;

          toast.success("Categoria criada com sucesso!");
        }

        loadCategories();
        setSelectedCategory(null);
      } catch (error) {
        logger.error("Erro ao salvar categoria:", error);
        toast.error("Erro ao salvar categoria");
        throw error;
      }
    },
    [supabase, selectedCategory, loadCategories]
  );

  const toggleActive = useCallback(
    async (category: Category) => {
      // 1. Optimistic update
      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id ? { ...c, is_active: !c.is_active } : c
        )
      );

      // 2. Toast imediato
      toast.success(
        category.is_active
          ? `${category.name} desativada`
          : `${category.name} ativada`
      );

      try {
        // 3. Persistir
        const { error } = await supabase
          .from("categories")
          .update({ is_active: !category.is_active })
          .eq("id", category.id);

        if (error) throw error;
      } catch (error) {
        // 4. Reverter em caso de erro
        setCategories((prev) =>
          prev.map((c) =>
            c.id === category.id ? { ...c, is_active: category.is_active } : c
          )
        );

        logger.error("Erro ao atualizar categoria:", error);
        toast.error("Erro ao atualizar categoria");
      }
    },
    [supabase]
  );
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Categorias</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie as categorias do seu cardápio
          </p>
        </div>

        <Button
          className="gap-2 w-full sm:w-auto"
          onClick={() => {
            setSelectedCategory(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <CategoriesTableSkeleton count={5} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhuma categoria criada"
          description="Crie categorias para organizar melhor seu cardápio e facilitar a navegação dos clientes."
          action={{
            label: "Criar primeira categoria",
            onClick: () => {
              setSelectedCategory(null);
              setIsDialogOpen(true);
            },
          }}
        />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Ordem</TableHead>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">
                  Descrição
                </TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveUp(category)}
                        disabled={category.display_order === 1}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveDown(category)}
                        disabled={category.display_order === categories.length}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    #{category.display_order}
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => toggleActive(category)}
                      />
                      <span className="text-sm hidden sm:inline">
                        {category.is_active ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedCategory(category);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de criar/editar */}
      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={selectedCategory}
        onSave={handleSave}
      />

      {/* Dialog de confirmação */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Excluir categoria?"
        description={`Tem certeza que deseja excluir "${deleteDialog.categoryName}"? Os produtos desta categoria ficarão sem categoria.`}
        confirmText="Excluir categoria"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
