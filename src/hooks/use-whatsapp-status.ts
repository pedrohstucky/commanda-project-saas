"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

import { logger } from "@/lib/logger";
interface WhatsAppInstance {
  id: string
  status: string
  qr_code: string | null
  phone_number: string | null
  profile_name: string | null
  profile_pic_url: string | null
  updated_at: string
}

export function useWhatsAppStatus() {
  const supabase = createBrowserSupabaseClient()
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadInstance = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single()

      if (profile) {
        const { data, error } = await supabase
          .from("whatsapp_instances")
          .select("id, status, qr_code, phone_number, profile_name, profile_pic_url, updated_at")
          .eq("tenant_id", profile.tenant_id)
          .single()

        if (error) {
          logger.error("Erro ao carregar instância:", error)
          setInstance(null)
        } else {
          setInstance(data)
        }
      }
    } catch (error) {
      logger.error("Erro:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadInstance()

    // Realtime para atualizar status
    const channel = supabase
      .channel("whatsapp-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_instances" },
        () => {
          loadInstance()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, loadInstance])

  const getStatusColor = useCallback(() => {
    if (!instance) return "gray"
    
    switch (instance.status) {
      case "connected":
        return "green"
      case "connecting":
        return "yellow"
      case "disconnected":
        return "red"
      default:
        return "gray"
    }
  }, [instance])

  const getStatusText = useCallback(() => {
    if (!instance) return "Não configurado"
    
    switch (instance.status) {
      case "connected":
        return "Conectado"
      case "connecting":
        return "Aguardando conexão"
      case "disconnected":
        return "Desconectado"
      default:
        return "Desconhecido"
    }
  }, [instance])

  return {
    instance,
    isLoading,
    isConnected: instance?.status === "connected",
    isConnecting: instance?.status === "connecting",
    isDisconnected: instance?.status === "disconnected",
    hasInstance: !!instance,
    statusColor: getStatusColor(),
    statusText: getStatusText(),
    refresh: loadInstance,
  }
}