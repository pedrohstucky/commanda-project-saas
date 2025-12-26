import { Check, Clock, ChefHat, PackageCheck, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Order } from "@/lib/types/order"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface OrderTimelineProps {
  order: Order
}

/**
 * Timeline visual do pedido
 * 
 * Mostra o progresso do pedido através dos status:
 * 1. Pedido criado (sempre)
 * 2. Aceito (se accepted_at existe)
 * 3. Concluído/Cancelado (status final)
 * 
 * Usa cores para indicar:
 * - Verde: Etapa concluída
 * - Azul: Etapa atual
 * - Cinza: Etapa futura
 * - Vermelho: Cancelado
 */
export function OrderTimeline({ order }: OrderTimelineProps) {
  
  const formatDate = (date: string | null) => {
    if (!date) return null
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ptBR
      })
    } catch {
      return "Data inválida"
    }
  }

  // Define as etapas baseado no status
  const steps = [
    {
      id: 'created',
      label: 'Pedido Criado',
      icon: Clock,
      status: 'completed' as const,
      timestamp: order.created_at,
      description: `Pedido recebido ${formatDate(order.created_at)}`
    },
    {
      id: 'accepted',
      label: 'Aceito',
      icon: Check,
      status: order.accepted_at ? 'completed' as const : 
              order.status === 'pending' ? 'pending' as const : 
              order.status === 'cancelled' ? 'skipped' as const : 'pending' as const,
      timestamp: order.accepted_at,
      description: order.accepted_at 
        ? `Aceito ${formatDate(order.accepted_at)}`
        : order.status === 'pending' 
          ? 'Aguardando confirmação'
          : 'Não aceito'
    },
    {
      id: 'preparing',
      label: 'Em Preparo',
      icon: ChefHat,
      status: order.status === 'preparing' ? 'current' as const :
              order.status === 'completed' ? 'completed' as const :
              order.status === 'cancelled' ? 'skipped' as const : 'pending' as const,
      timestamp: order.accepted_at,
      description: order.status === 'preparing' 
        ? 'Pedido sendo preparado'
        : order.status === 'completed'
          ? 'Preparação concluída'
          : 'Aguardando preparo'
    },
    {
      id: 'completed',
      label: order.status === 'cancelled' ? 'Cancelado' : 'Concluído',
      icon: order.status === 'cancelled' ? XCircle : PackageCheck,
      status: order.status === 'completed' ? 'completed' as const :
              order.status === 'cancelled' ? 'cancelled' as const : 'pending' as const,
      timestamp: order.completed_at || order.cancelled_at,
      description: order.completed_at 
        ? `Entregue ${formatDate(order.completed_at)}`
        : order.cancelled_at
          ? `Cancelado ${formatDate(order.cancelled_at)}`
          : 'Aguardando conclusão'
    }
  ]

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        const Icon = step.icon

        return (
          <div key={step.id} className="relative flex items-start gap-4">
            {/* Linha conectora */}
            {!isLast && (
              <div 
                className={cn(
                  "absolute left-[19px] top-10 h-[calc(100%+16px)] w-0.5",
                  step.status === 'completed' ? "bg-green-500" :
                  step.status === 'current' ? "bg-blue-500" :
                  step.status === 'cancelled' ? "bg-red-500" :
                  "bg-muted"
                )}
              />
            )}

            {/* Ícone */}
            <div 
              className={cn(
                "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2",
                step.status === 'completed' && "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
                step.status === 'current' && "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                step.status === 'cancelled' && "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
                step.status === 'pending' && "border-muted bg-background text-muted-foreground",
                step.status === 'skipped' && "border-muted bg-muted/50 text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* Conteúdo */}
            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between">
                <h4 
                  className={cn(
                    "font-semibold",
                    step.status === 'completed' && "text-green-700 dark:text-green-300",
                    step.status === 'current' && "text-blue-700 dark:text-blue-300",
                    step.status === 'cancelled' && "text-red-700 dark:text-red-300",
                    (step.status === 'pending' || step.status === 'skipped') && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {step.description}
              </p>
            </div>
          </div>
        )
      })}

      {/* Motivo do cancelamento */}
      {order.status === 'cancelled' && order.cancellation_reason && (
        <div className="ml-14 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm font-medium text-red-900 dark:text-red-200">
            Motivo do cancelamento:
          </p>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {order.cancellation_reason}
          </p>
        </div>
      )}
    </div>
  )
}