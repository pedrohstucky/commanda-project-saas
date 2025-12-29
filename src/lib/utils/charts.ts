import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

/**
 * Formata data para exibição em gráficos
 */
export function formatChartDate(dateString: string, formatStr = "dd/MM"): string {
  try {
    return format(new Date(dateString), formatStr, { locale: ptBR })
  } catch {
    return dateString
  }
}

/**
 * Formata valor monetário para gráficos
 */
export function formatChartCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value)
}

/**
 * Cores padrão para gráficos
 */
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  danger: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))",
}

/**
 * Configuração padrão de tooltip
 */
export const DEFAULT_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "var(--radius)",
  color: "hsl(var(--popover-foreground))",
}