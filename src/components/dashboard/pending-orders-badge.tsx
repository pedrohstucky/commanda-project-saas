"use client"

import { useOrderNotification } from "@/hooks/use-order-notification"
import { cn } from "@/lib/utils"

interface PendingOrdersBadgeProps {
  className?: string
}

/**
 * Badge que mostra quantidade de pedidos pending
 * Atualiza em tempo real via Supabase
 */
export function PendingOrdersBadge({ className }: PendingOrdersBadgeProps) {
  const { pendingCount, isLoading } = useOrderNotification({
    enabled: true,
    soundEnabled: true,
    desktopEnabled: true
  })

  if (isLoading) {
    return (
      <span className={cn(
        "ml-auto h-5 w-5 rounded-full bg-muted animate-pulse",
        className
      )} />
    )
  }

  if (pendingCount === 0) {
    return null
  }

  return (
    <span className={cn(
      "ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-medium text-white",
      pendingCount > 9 && "w-6",
      className
    )}>
      {pendingCount > 99 ? '99+' : pendingCount}
    </span>
  )
}