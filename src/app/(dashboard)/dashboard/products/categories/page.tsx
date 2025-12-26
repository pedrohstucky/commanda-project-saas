"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, FolderOpen, Pencil, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { Category } from "@/lib/types/product"

export default function CategoriesPage() {
  const supabase = createBrowserSupabaseClient()
  
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Carrega categorias
   */
  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single()

      if (!profile) return

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("display_order")

      if (error) {
        console.error("Erro ao carregar categorias:", error)
        toast.error("Erro ao carregar categorias")
        return
      }

      setCategories(data)
    } catch (error) {
      console.error("Erro ao carregar categorias:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  /**
   * Deleta categoria
   */
  const handleDelete = useCallback(async (categoryId: string) => {
    if (!confirm("Tem certeza? Produtos desta categoria ficarão sem categoria.")) {
      return
    }

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId)

      if (error) throw error

      toast.success("Categoria excluída com sucesso!")
      loadCategories()
    } catch (error) {
      console.error("Erro ao excluir categoria:", error)
      toast.error("Erro ao excluir categoria")
    }
  }, [supabase, loadCategories])

  /**
   * Toggle ativo/inativo
   */
  const toggleActive = useCallback(async (category: Category) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id)

      if (error) throw error

      toast.success(
        category.is_active 
          ? "Categoria desativada" 
          : "Categoria ativada"
      )
      loadCategories()
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error)
      toast.error("Erro ao atualizar categoria")
    }
  }, [supabase, loadCategories])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground">
            Gerencie as categorias do seu cardápio
          </p>
        </div>

        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Nenhuma categoria encontrada
          </h3>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    {category.display_order}
                  </TableCell>
                  <TableCell className="font-medium">
                    {category.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={category.is_active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActive(category)}
                    >
                      {category.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(category.id)}
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
    </div>
  )
}