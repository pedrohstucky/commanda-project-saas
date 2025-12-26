"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { ProductCard } from "@/components/products/product-card"
import { ProductFilters } from "@/components/products/product-filters"
import { ProductDialog } from "@/components/products/product-dialog"
import { ProductVariationsDialog } from "@/components/products/product-variations-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Package, FolderOpen } from "lucide-react"
import { toast } from "sonner"
import type { Product, Category, ProductFilters as ProductFiltersType, ProductFormData } from "@/lib/types/product"

export default function ProductsPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [filters, setFilters] = useState<ProductFiltersType>({
    category_id: "all",
    search: "",
    is_available: "all",
  })

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const [variationsDialogOpen, setVariationsDialogOpen] = useState(false)
  const [selectedProductForVariations, setSelectedProductForVariations] = useState<Product | null>(null)

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single()

      if (!profile) return

      let query = supabase
        .from("products")
        .select(
          `
          *,
          category:categories(*)
        `
        )
        .eq("tenant_id", profile.tenant_id)
        .order("name")

      if (filters.category_id && filters.category_id !== "all") {
        query = query.eq("category_id", filters.category_id)
      }

      if (filters.search && filters.search.trim().length > 0) {
        query = query.ilike("name", `%${filters.search.trim()}%`)
      }

      if (
        filters.is_available !== "all" &&
        filters.is_available !== undefined
      ) {
        query = query.eq("is_available", filters.is_available)
      }

      const { data, error } = await query

      if (error) {
        console.error("Erro ao carregar produtos:", error)
        toast.error("Erro ao carregar produtos")
        return
      }

      setProducts(data as Product[])
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, filters])

  const handleSave = useCallback(
    async (data: ProductFormData) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .single()

        if (!profile) return

        if (selectedProduct) {
          const updateData = {
            name: data.name,
            description: data.description || null,
            price: data.price,
            category_id: data.category_id || null,
            is_available: data.is_available,
            updated_at: new Date().toISOString(),
          }

          const { error } = await supabase
            .from("products")
            .update(updateData)
            .eq("id", selectedProduct.id)

          if (error) throw error

          toast.success("Produto atualizado com sucesso!")
        } else {
          const insertData = {
            tenant_id: profile.tenant_id,
            name: data.name,
            description: data.description || null,
            price: data.price,
            category_id: data.category_id || null,
            is_available: data.is_available,
          }

          const { error } = await supabase
            .from("products")
            .insert(insertData)

          if (error) throw error

          toast.success("Produto criado com sucesso!")
        }

        loadProducts()
        setSelectedProduct(null)
      } catch (error) {
        console.error("❌ Erro ao salvar produto:", error)
        toast.error("Erro ao salvar produto", {
          description:
            error instanceof Error ? error.message : "Erro desconhecido",
        })
        throw error
      }
    },
    [supabase, selectedProduct, loadProducts]
  )

  const loadCategories = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
        .eq("is_active", true)
        .order("display_order")

      if (error) {
        console.error("Erro ao carregar categorias:", error)
        return
      }

      setCategories(data)
    } catch (error) {
      console.error("Erro ao carregar categorias:", error)
    }
  }, [supabase])

  const handleDelete = useCallback(
    async (productId: string) => {
      if (!confirm("Tem certeza que deseja excluir este produto?")) {
        return
      }

      try {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", productId)

        if (error) throw error

        toast.success("Produto excluído com sucesso!")
        loadProducts()
      } catch (error) {
        console.error("Erro ao excluir produto:", error)
        toast.error("Erro ao excluir produto")
      }
    },
    [supabase, loadProducts]
  )

  const handleEdit = useCallback((product: Product) => {
    setSelectedProduct(product)
    setIsDialogOpen(true)
  }, [])

  const handleCreate = useCallback(() => {
    setSelectedProduct(null)
    setIsDialogOpen(true)
  }, [])

  const handleManageVariations = useCallback((product: Product) => {
    setSelectedProductForVariations(product)
    setVariationsDialogOpen(true)
  }, [])

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [loadProducts, loadCategories])

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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
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
              onDelete={handleDelete}
              onManageVariations={handleManageVariations}
            />
          ))}
        </div>
      )}

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
    </div>
  )
}