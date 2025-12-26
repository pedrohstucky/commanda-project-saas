"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Filter, X } from "lucide-react"
import { format } from "date-fns"
import type { OrderFilters } from "@/lib/types/order"

interface OrderAdvancedFiltersProps {
  filters: OrderFilters
  onFiltersChange: (filters: OrderFilters) => void
}

export function OrderAdvancedFilters({
  filters,
  onFiltersChange
}: OrderAdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [datePreset, setDatePreset] = useState<string>("all")

  const hasAdvancedFilters = 
    filters.dateFrom || 
    filters.dateTo || 
    filters.minAmount !== undefined || 
    filters.maxAmount !== undefined

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset)

    const now = new Date()
    let dateFrom: Date | undefined
    let dateTo: Date | undefined = now

    switch (preset) {
      case "today":
        dateFrom = new Date(now)
        dateFrom.setHours(0, 0, 0, 0)
        break
      case "week":
        dateFrom = new Date(now)
        dateFrom.setDate(dateFrom.getDate() - 7)
        break
      case "month":
        dateFrom = new Date(now)
        dateFrom.setMonth(dateFrom.getMonth() - 1)
        break
      case "all":
      default:
        dateFrom = undefined
        dateTo = undefined
    }

    onFiltersChange({
      ...filters,
      dateFrom: dateFrom?.toISOString(),
      dateTo: dateTo?.toISOString()
    })
  }

  const handleClearFilters = () => {
    setDatePreset("all")
    onFiltersChange({
      ...filters,
      dateFrom: undefined,
      dateTo: undefined,
      minAmount: undefined,
      maxAmount: undefined
    })
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros avançados
          {hasAdvancedFilters && (
            <span className="flex h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Filtros Avançados</h4>
            {hasAdvancedFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Filtro de Data */}
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={datePreset} onValueChange={handleDatePresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Datas personalizadas */}
          {datePreset === "custom" && (
            <div className="space-y-2">
              <Label>Data inicial</Label>
              <Input
                type="date"
                value={filters.dateFrom ? format(new Date(filters.dateFrom), "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined
                  onFiltersChange({
                    ...filters,
                    dateFrom: date?.toISOString()
                  })
                }}
              />
              <Label>Data final</Label>
              <Input
                type="date"
                value={filters.dateTo ? format(new Date(filters.dateTo), "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined
                  onFiltersChange({
                    ...filters,
                    dateTo: date?.toISOString()
                  })
                }}
              />
            </div>
          )}

          {/* Filtro de Valor */}
          <div className="space-y-2">
            <Label>Valor do pedido</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Mínimo</Label>
                <Input
                  type="number"
                  placeholder="R$ 0,00"
                  min="0"
                  step="0.01"
                  value={filters.minAmount ?? ""}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : undefined
                    onFiltersChange({
                      ...filters,
                      minAmount: value
                    })
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Máximo</Label>
                <Input
                  type="number"
                  placeholder="R$ 999,99"
                  min="0"
                  step="0.01"
                  value={filters.maxAmount ?? ""}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : undefined
                    onFiltersChange({
                      ...filters,
                      maxAmount: value
                    })
                  }}
                />
              </div>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={() => setIsOpen(false)}
          >
            Aplicar Filtros
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}