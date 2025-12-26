"use client"

import { Button } from "@/components/ui/button"
import { Check, X, PackageCheck, Loader2 } from "lucide-react"
import type { OrderStatus } from "@/lib/types/order"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from "react"

interface OrderActionsProps {
  orderId: string
  status: OrderStatus
  onAccept?: (orderId: string) => void | Promise<void>
  onReject?: (orderId: string) => void | Promise<void>
  onComplete?: (orderId: string) => void | Promise<void>
  isLoading?: boolean
  size?: "default" | "sm" | "lg"
  variant?: "default" | "outline"
}

/**
 * Botões de ação para pedidos
 * 
 * Mostra botões baseado no status atual:
 * - pending: [Aceitar] [Recusar]
 * - preparing: [Confirmar Entrega]
 * - completed/cancelled: Nenhuma ação
 * 
 * Inclui confirmação para ação de recusar
 */
export function OrderActions({
  orderId,
  status,
  onAccept,
  onReject,
  onComplete,
  isLoading = false,
  size = "default",
  variant = "default"
}: OrderActionsProps) {
  
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)

  const handleAccept = () => {
    onAccept?.(orderId)
  }

  const handleRejectConfirm = () => {
    setShowRejectConfirm(false)
    onReject?.(orderId)
  }

  const handleComplete = () => {
    onComplete?.(orderId)
  }

  // Pedidos concluídos ou cancelados não têm ações
  if (status === 'completed' || status === 'cancelled') {
    return null
  }

  return (
    <>
      <div className="flex gap-2">
        {/* PENDING: Aceitar e Recusar */}
        {status === 'pending' && (
          <>
            <Button
              variant={variant}
              size={size}
              className="flex-1"
              onClick={handleAccept}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Aceitar
            </Button>
            <Button
              variant="outline"
              size={size}
              className="flex-1"
              onClick={() => setShowRejectConfirm(true)}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Recusar
            </Button>
          </>
        )}

        {/* PREPARING: Confirmar Entrega */}
        {status === 'preparing' && (
          <Button
            variant={variant}
            size={size}
            className="w-full"
            onClick={handleComplete}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PackageCheck className="h-4 w-4 mr-2" />
            )}
            Confirmar Entrega
          </Button>
        )}
      </div>

      {/* Dialog de confirmação para recusar */}
      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja recusar este pedido? O cliente será notificado
              sobre o cancelamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm}>
              Sim, recusar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}