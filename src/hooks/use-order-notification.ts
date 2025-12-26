"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface UseOrderNotificationOptions {
  enabled?: boolean
  soundEnabled?: boolean
  desktopEnabled?: boolean
}

/**
 * Hook para notificações de novos pedidos
 * 
 * Features:
 * - Som quando pedido pending chega
 * - Desktop notification (se permitido)
 * - Toast visual
 * - Realtime via Supabase
 */
export function useOrderNotification(options: UseOrderNotificationOptions = {}) {
  const {
    enabled = true,
    soundEnabled = true,
    desktopEnabled = false
  } = options

  const supabase = createBrowserSupabaseClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)

  /**
   * Inicializa áudio
   */
  useEffect(() => {
    if (soundEnabled && typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/new-order.mp3')
      audioRef.current.volume = 0.7
    }
  }, [soundEnabled])

  /**
   * Toca som de notificação
   */
  const playSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(err => {
        console.warn('Não foi possível tocar som:', err)
      })
    }
  }, [soundEnabled])

  /**
   * Mostra desktop notification
   */
  const showDesktopNotification = useCallback((orderData: {
    customer_name: string | null
    total_amount: number
  }) => {
    if (!desktopEnabled) return

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 Novo Pedido!', {
        body: `${orderData.customer_name || 'Cliente'} - R$ ${orderData.total_amount.toFixed(2)}`,
        icon: '/logo.png',
        tag: 'new-order',
        requireInteraction: false
      })
    }
  }, [desktopEnabled])

  /**
   * Carrega tenant_id e contagem inicial
   */
  useEffect(() => {
    if (!enabled) return

    const loadInitialData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (!profile) {
          setIsLoading(false)
          return
        }

        setTenantId(profile.tenant_id)

        // Carregar contagem inicial
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', profile.tenant_id)
          .eq('status', 'pending')

        setPendingCount(count || 0)
        console.log(`📊 Contagem inicial de pedidos pending: ${count || 0}`)
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [supabase, enabled])

  /**
   * Escuta novos pedidos e mudanças via Realtime
   */
  useEffect(() => {
    if (!enabled || !tenantId) return

    console.log(`🔌 Conectando Realtime para tenant: ${tenantId}`)

    const channel = supabase
      .channel(`orders-notification-${tenantId}`)
      // Escuta INSERTs (novos pedidos)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const newOrder = payload.new as {
            id: string
            status: string
            customer_name: string | null
            total_amount: number
          }

          console.log('🆕 Novo pedido detectado:', newOrder)

          // Só notifica se for pending
          if (newOrder.status === 'pending') {
            console.log('🔔 Novo pedido PENDING - incrementando contador')

            // Incrementar contador
            setPendingCount(prev => {
              const newCount = prev + 1
              console.log(`📊 Contador atualizado: ${prev} → ${newCount}`)
              return newCount
            })

            // Tocar som
            playSound()

            // Desktop notification
            showDesktopNotification(newOrder)

            // Toast visual
            toast.success('🔔 Novo Pedido!', {
              description: `${newOrder.customer_name || 'Cliente'} - R$ ${newOrder.total_amount.toFixed(2)}`,
              duration: 5000,
              action: {
                label: 'Ver',
                onClick: () => {
                  window.location.href = `/dashboard/orders/${newOrder.id}`
                }
              }
            })
          }
        }
      )
      // Escuta UPDATEs (mudanças de status)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const updatedOrder = payload.new as { id: string, status: string }
          const oldOrder = payload.old as { id: string, status: string }

          console.log('🔄 Pedido atualizado:', {
            id: updatedOrder.id,
            oldStatus: oldOrder.status,
            newStatus: updatedOrder.status
          })

          // Se saiu de pending, decrementar
          if (oldOrder.status === 'pending' && updatedOrder.status !== 'pending') {
            console.log('📉 Pedido saiu de pending - decrementando contador')
            setPendingCount(prev => {
              const newCount = Math.max(0, prev - 1)
              console.log(`📊 Contador atualizado: ${prev} → ${newCount}`)
              return newCount
            })
          }
          // Se entrou em pending, incrementar
          else if (oldOrder.status !== 'pending' && updatedOrder.status === 'pending') {
            console.log('📈 Pedido entrou em pending - incrementando contador')
            setPendingCount(prev => {
              const newCount = prev + 1
              console.log(`📊 Contador atualizado: ${prev} → ${newCount}`)
              return newCount
            })
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Realtime status: ${status}`)
      })

    return () => {
      console.log('🔌 Desconectando Realtime')
      supabase.removeChannel(channel)
    }
  }, [supabase, enabled, tenantId, playSound, showDesktopNotification])

  /**
   * Solicita permissão para desktop notifications
   */
  const requestDesktopPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }

  return {
    pendingCount,
    isLoading,
    requestDesktopPermission,
    hasDesktopPermission: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  }
}