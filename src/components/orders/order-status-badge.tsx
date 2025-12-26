import { Badge } from "@/components/ui/badge"
import { Clock, ChefHat, CheckCircle2, XCircle } from "lucide-react"
import type { OrderStatus } from "@/lib/types/order"

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

/**
 * Badge visual para status do pedido
 * 
 * Mostra cor, ícone e texto apropriados para cada status
 * Cores seguem padrão de UI/UX:
 * - Amarelo: Ação necessária (pending)
 * - Azul: Em progresso (preparing)
 * - Verde: Sucesso (completed)
 * - Vermelho: Erro/cancelado (cancelled)
 */
export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = {
    pending: {
      label: "Aguardando",
      icon: Clock,
      className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800"
    },
    preparing: {
      label: "Em Preparo",
      icon: ChefHat,
      className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800"
    },
    completed: {
      label: "Concluído",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800"
    },
    cancelled: {
      label: "Cancelado",
      icon: XCircle,
      className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800"
    }
  }

  const { label, icon: Icon, className: statusClassName } = config[status]

  return (
    <Badge 
      variant="outline" 
      className={`${statusClassName} ${className} flex items-center gap-1.5 font-medium`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  )
}