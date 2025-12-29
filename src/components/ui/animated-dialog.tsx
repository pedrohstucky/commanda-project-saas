"use client"

import { ScaleIn } from "@/components/ui/animations"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ReactNode } from "react"

interface AnimatedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
  showCloseButton?: boolean
}

export function AnimatedDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  showCloseButton = true,
}: AnimatedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className} showCloseButton={showCloseButton}>
        <ScaleIn>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
        </ScaleIn>
      </DialogContent>
    </Dialog>
  )
}