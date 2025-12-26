"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Bell, BellOff, Volume2, VolumeX } from "lucide-react"
import { toast } from "sonner"

/**
 * Componente para configurar notificações
 * 
 * Permite habilitar/desabilitar:
 * - Desktop notifications
 * - Som de notificação
 */
export function NotificationSettings() {
  const [desktopEnabled, setDesktopEnabled] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    // Carregar preferências salvas
    const savedSound = localStorage.getItem("notificationSound")
    if (savedSound !== null) {
      setSoundEnabled(savedSound === "true")
    }

    // Verificar permissão de notificações
    if ("Notification" in window) {
      setPermission(Notification.permission)
      setDesktopEnabled(Notification.permission === "granted")
    }
  }, [])

  /**
   * Solicita permissão para desktop notifications
   */
  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Notificações não suportadas", {
        description: "Seu navegador não suporta notificações desktop"
      })
      return
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === "granted") {
        setDesktopEnabled(true)
        
        // Enviar notificação de teste
        new Notification("🎉 Notificações Ativadas!", {
          body: "Você receberá alertas quando novos pedidos chegarem",
          icon: "/logo.png",
          badge: "/logo.png"
        })

        toast.success("Notificações ativadas!", {
          description: "Você receberá alertas de novos pedidos"
        })
      } else if (result === "denied") {
        toast.error("Permissão negada", {
          description: "Você bloqueou as notificações. Ative nas configurações do navegador."
        })
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error)
      toast.error("Erro ao ativar notificações")
    }
  }

  /**
   * Desabilita desktop notifications
   */
  const disableNotifications = () => {
    setDesktopEnabled(false)
    toast.info("Notificações desativadas", {
      description: "Você não receberá mais alertas desktop"
    })
  }

  /**
   * Toggle som
   */
  const toggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled)
    localStorage.setItem("notificationSound", String(enabled))
    
    toast.success(enabled ? "Som ativado" : "Som desativado", {
      description: enabled 
        ? "Você ouvirá um alerta sonoro para novos pedidos" 
        : "Alertas sonoros foram desativados"
    })
  }

  /**
   * Envia notificação de teste
   */
  const sendTestNotification = () => {
    if (Notification.permission === "granted") {
      new Notification("🧪 Notificação de Teste", {
        body: "Esta é uma notificação de exemplo para novos pedidos",
        icon: "/logo.png",
        badge: "/logo.png",
        tag: "test-notification",
        requireInteraction: false
      })

      toast.success("Notificação enviada!")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>
          Configure como você deseja ser notificado sobre novos pedidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Desktop Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações Desktop
            </Label>
            <p className="text-sm text-muted-foreground">
              Receba alertas do navegador quando novos pedidos chegarem
            </p>
          </div>
          <div className="flex items-center gap-2">
            {permission === "granted" ? (
              <>
                <Switch
                  checked={desktopEnabled}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setDesktopEnabled(true)
                    } else {
                      disableNotifications()
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestNotification}
                >
                  Testar
                </Button>
              </>
            ) : permission === "denied" ? (
              <p className="text-xs text-muted-foreground">
                Bloqueado. Ative nas configurações do navegador.
              </p>
            ) : (
              <Button onClick={requestPermission} size="sm">
                Ativar
              </Button>
            )}
          </div>
        </div>

        {/* Sound Notifications */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="space-y-0.5">
            <Label className="text-base flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              Som de Notificação
            </Label>
            <p className="text-sm text-muted-foreground">
              Tocar som quando novos pedidos chegarem
            </p>
          </div>
          <Switch
            checked={soundEnabled}
            onCheckedChange={toggleSound}
          />
        </div>

        {/* Info sobre notificações */}
        {!("Notification" in window) && (
          <div className="rounded-lg bg-muted p-3">
            <div className="flex gap-2">
              <BellOff className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Notificações não suportadas
                </p>
                <p className="text-xs text-muted-foreground">
                  Seu navegador não suporta notificações desktop. 
                  Tente usar Chrome, Firefox, Edge ou Safari.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}