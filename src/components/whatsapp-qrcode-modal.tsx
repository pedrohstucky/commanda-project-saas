"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, RefreshCw, Smartphone, AlertCircle } from "lucide-react"
import Image from "next/image"

interface WhatsAppQRCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  qrCode?: string | null
  onGenerateQRCode: () => Promise<void>
}

export function WhatsAppQRCodeModal({
  open,
  onOpenChange,
  qrCode,
  onGenerateQRCode,
}: WhatsAppQRCodeModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await onGenerateQRCode()
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu celular para conectar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code */}
          {qrCode ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full aspect-square max-w-[300px] border-2 border-primary rounded-lg overflow-hidden bg-white p-4">
                <Image
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Gerar Novo QR Code
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-full aspect-square max-w-[300px] border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                <div className="text-center p-6">
                  <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique no botão abaixo para gerar o QR Code
                  </p>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando QR Code...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Gerar QR Code
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Instruções */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">Como conectar:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Abra o WhatsApp no seu celular</li>
                <li>Toque em <strong>Mais opções</strong> (⋮) ou <strong>Configurações</strong></li>
                <li>Toque em <strong>Aparelhos conectados</strong></li>
                <li>Toque em <strong>Conectar um aparelho</strong></li>
                <li>Aponte seu celular para esta tela para escanear o QR Code</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}