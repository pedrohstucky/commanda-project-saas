"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"
import type { ProductFilters, Category } from "@/lib/types/product"

interface ProductFiltersComponentProps {
  filters: ProductFilters
  categories: Category[]
  onFiltersChange: (filters: ProductFilters) => void
}

export function ProductFilters({
  filters,
  categories,
  onFiltersChange,
}: ProductFiltersComponentProps) {
  const hasActiveFilters =
    filters.search ||
    (filters.category_id && filters.category_id !== "all") ||
    (filters.is_available !== "all" && filters.is_available !== undefined)

  const handleClearFilters = () => {
    onFiltersChange({
      category_id: "all",
      search: "",
      is_available: "all",
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Busca */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          value={filters.search || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="pl-9"
        />
      </div>

      {/* Categoria */}
      <Select
        value={filters.category_id || "all"}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, category_id: value })
        }
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas categorias</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Disponibilidade */}
      <Select
        value={
          filters.is_available === true
            ? "available"
            : filters.is_available === false
            ? "unavailable"
            : "all"
        }
        onValueChange={(value) => {
          const is_available =
            value === "available"
              ? true
              : value === "unavailable"
              ? false
              : "all"
          onFiltersChange({ ...filters, is_available })
        }}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Disponibilidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="available">Disponíveis</SelectItem>
          <SelectItem value="unavailable">Indisponíveis</SelectItem>
        </SelectContent>
      </Select>

      {/* Limpar filtros */}
      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={handleClearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}