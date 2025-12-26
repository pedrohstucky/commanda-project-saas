"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { OrderAdvancedFilters } from "./order-advanced-filters"
import type { OrderFilters as OrderFiltersType } from "@/lib/types/order"

interface OrderFiltersProps {
  filters: OrderFiltersType
  onFiltersChange: (filters: OrderFiltersType) => void
  orderCounts: {
    all: number
    pending: number
    preparing: number
    completed: number
    cancelled: number
  }
}

const statusButtons = [
  { value: "all", label: "Todos", key: "all" },
  { value: "pending", label: "Pendentes", key: "pending" },
  { value: "preparing", label: "Preparando", key: "preparing" },
  { value: "completed", label: "Concluídos", key: "completed" },
  { value: "cancelled", label: "Cancelados", key: "cancelled" },
] as const

/**
 * Componente de filtros para listagem de pedidos
 */
export function OrderFilters({
  filters,
  onFiltersChange,
  orderCounts,
}: OrderFiltersProps) {
  const hasActiveFilters = 
    filters.search ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined

  const handleClearFilters = () => {
    onFiltersChange({
      status: "all",
      search: "",
      dateFrom: undefined,
      dateTo: undefined,
      minAmount: undefined,
      maxAmount: undefined,
    })
  }

  return (
    <div className="space-y-4">
      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {statusButtons.map((button) => {
          const count = orderCounts[button.key]
          const isActive = filters.status === button.value

          return (
            <Button
              key={button.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() =>
                onFiltersChange({ ...filters, status: button.value })
              }
              className="gap-2"
            >
              {button.label}
              <span
                className={`
                  rounded-full px-2 py-0.5 text-xs font-medium
                  ${
                    isActive
                      ? "bg-primary-foreground text-primary"
                      : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {count}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Busca e filtros avançados */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Campo de busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={filters.search || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pl-9"
          />
        </div>

        {/* Filtros avançados */}
        <div className="flex gap-2">
          <OrderAdvancedFilters
            filters={filters}
            onFiltersChange={onFiltersChange}
          />

          {/* Botão limpar */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}