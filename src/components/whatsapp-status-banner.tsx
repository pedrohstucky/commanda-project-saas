"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { 
  WifiOff, 
  Smartphone, 
  Loader2,
  AlertTriangle 
} from "lucide-react"
import { useWhatsAppStatus } from "@/hooks/use-whatsapp-status"
import { WhatsAppQRCodeModal } from "./whatsapp-qrcode-modal"
import { useRouter } from "next/navigation"

import { logger } from "@/lib/logger";
export function WhatsAppStatusBanner() {
  const router = useRouter()
  const { instance, isConnected, isConnecting, isDisconnected, isLoading } = useWhatsAppStatus()
  const [showQRModal, setShowQRModal] = useState(false)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)

  const handleGenerateQRCode = async () => {
    setIsGeneratingQR(true)
    try {
      const response = await fetch("/api/whatsapp/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao gerar QR Code")
      }

      // Recarregar após gerar QR Code
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      logger.error("Erro:", error)
      alert(error instanceof Error ? error.message : "Erro ao gerar QR Code")
    } finally {
      setIsGeneratingQR(false)
    }
  }

  if (isLoading) return null

  // Se conectado, não mostrar nada (já está na sidebar)
  if (isConnected) {
    return null
  }

  // Conectando - aguardando scan
  if (isConnecting) {
    return (
      <>
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <Loader2 className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-spin" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
            Aguardando Conexão
          </AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            <div className="flex items-center justify-between">
              <span>Escaneie o QR Code com seu WhatsApp para conectar</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQRModal(true)}
                className="ml-4"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Ver QR Code
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <WhatsAppQRCodeModal
          open={showQRModal}
          onOpenChange={setShowQRModal}
          qrCode={instance?.qr_code}
          onGenerateQRCode={handleGenerateQRCode}
        />
      </>
    )
  }

  // Desconectado - ação necessária
  if (isDisconnected) {
    return (
      <>
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>WhatsApp Desconectado</AlertTitle>
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Conecte seu WhatsApp para receber pedidos automaticamente</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQRModal(true)}
                disabled={isGeneratingQR}
                className="ml-4"
              >
                {isGeneratingQR ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Reconectar Agora
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <WhatsAppQRCodeModal
          open={showQRModal}
          onOpenChange={setShowQRModal}
          qrCode={instance?.qr_code}
          onGenerateQRCode={handleGenerateQRCode}
        />
      </>
    )
  }

  // Sem instância
  return (
    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertTitle className="text-orange-800 dark:text-orange-200">
        WhatsApp Não Configurado
      </AlertTitle>
      <AlertDescription className="text-orange-700 dark:text-orange-300">
        <div className="flex items-center justify-between">
          <span>Configure sua conexão com WhatsApp para começar a receber pedidos</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/onboarding/whatsapp")}
            className="ml-4"
          >
            Configurar
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}