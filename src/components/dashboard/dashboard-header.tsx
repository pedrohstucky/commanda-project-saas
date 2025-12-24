"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Bell, 
  ChevronDown, 
  Package, 
  DollarSign, 
  Volume2, 
  VolumeX,
  Menu as MenuIcon
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

interface DashboardHeaderProps {
  restaurantName?: string
  userName?: string
  onMenuClick?: () => void
}

interface Notification {
  id: string
  type: 'new_order' | 'paid_order'
  title: string
  message: string
  order_id: string
  created_at: string
}

interface Order {
  id: string
  total_amount: number
  status: string
  created_at: string
}

export function DashboardHeader({
  restaurantName,
  userName,
  onMenuClick,
}: DashboardHeaderProps) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUnlockedRef = useRef<boolean>(false)
  
  const [userData, setUserData] = useState({
    restaurantName: restaurantName || "Carregando...",
    userName: userName || "Usuário"
  })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    // Criar áudio
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.volume = 0.5
    audioRef.current.preload = 'auto'
    
    // Desbloquear áudio em mobile na primeira interação
    // unlockAudioOnInteraction()
    
    loadUserData()
    loadInitialNotifications()
    
    const cleanup = setupRealtimeListeners()
    
    const savedSoundPref = localStorage.getItem('notificationSound')
    if (savedSoundPref !== null) {
      setSoundEnabled(savedSoundPref === 'true')
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (isPopoverOpen) {
      markAllAsRead()
    }
  }, [isPopoverOpen])

/* function unlockAudioOnInteraction() {
    // Lista de eventos de interação do usuário
    const events = ['touchstart', 'touchend', 'mousedown', 'click']
    
    const unlockAudio = () => {
      if (audioUnlockedRef.current || !audioRef.current) return
      
      // Tentar reproduzir e pausar imediatamente
      const playPromise = audioRef.current.play()
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Sucesso! Áudio desbloqueado
            audioRef.current?.pause()
            audioRef.current!.currentTime = 0
            audioUnlockedRef.current = true
            console.log('🔓 [Som] Áudio desbloqueado no mobile')
            
            // Remover listeners após desbloquear
            events.forEach(event => {
              document.removeEventListener(event, unlockAudio)
            })
          })
          .catch(() => {
            // Ainda bloqueado, tentar na próxima interação
            console.log('🔒 [Som] Aguardando interação para desbloquear áudio')
          })
      }
    }
    
    // Adicionar listeners para primeira interação
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: false, passive: true })
    })
  } */

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, tenant_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', profile.tenant_id)
            .single()

          setUserData({
            restaurantName: tenant?.name || "Restaurante",
            userName: profile.full_name || user.email?.split('@')[0] || "Usuário"
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error)
    }
  }

  async function loadInitialNotifications() {
    try {
      const thirtyMinutesAgo = new Date()
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)

      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .gte('created_at', thirtyMinutesAgo.toISOString())
        .order('created_at', { ascending: false })

      if (recentOrders) {
        const notifs: Notification[] = recentOrders.map(order => ({
          id: `order-${order.id}`,
          type: order.status === 'paid' ? 'paid_order' : 'new_order',
          title: order.status === 'paid' ? '✅ Pedido Pago' : '🆕 Novo Pedido',
          message: order.status === 'paid' 
            ? `Pagamento de ${formatCurrency(order.total_amount)} confirmado`
            : `Novo pedido de ${formatCurrency(order.total_amount)} recebido`,
          order_id: order.id,
          created_at: order.created_at
        }))

        setNotifications(notifs)
        setUnreadCount(notifs.length)
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    }
  }

  function setupRealtimeListeners() {
    console.log('🔔 [Notificações] Configurando Realtime...')

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload: any) => {
          console.log('🆕 [Realtime] Novo pedido recebido:', payload.new)
          
          const newNotification: Notification = {
            id: `order-${payload.new.id}`,
            type: 'new_order',
            title: '🆕 Novo Pedido',
            message: `Novo pedido de ${formatCurrency(payload.new.total_amount)} recebido`,
            order_id: payload.new.id,
            created_at: payload.new.created_at
          }

          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
          playNotificationSound()
          
          console.log('✅ [Realtime] Notificação adicionada')
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload: any) => {
          console.log('🔄 [Realtime] Pedido atualizado:', payload.new)
          
          const oldStatus = payload.old && 'status' in payload.old ? payload.old.status : null
          const newStatus = payload.new.status
          
          if (newStatus === 'paid' && oldStatus !== 'paid') {
            console.log('💰 [Realtime] Pedido pago detectado!')
            
            const newNotification: Notification = {
              id: `paid-${payload.new.id}-${Date.now()}`,
              type: 'paid_order',
              title: '✅ Pedido Pago',
              message: `Pagamento de ${formatCurrency(payload.new.total_amount)} confirmado`,
              order_id: payload.new.id,
              created_at: new Date().toISOString()
            }

            setNotifications(prev => [newNotification, ...prev])
            setUnreadCount(prev => prev + 1)
            playNotificationSound()
            
            console.log('✅ [Realtime] Notificação de pagamento adicionada')
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 [Realtime Notificações] Status:', status)
        
        if (err) {
          console.error('❌ [Realtime Notificações] Erro:', err)
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime Notificações] Conectado com sucesso!')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Realtime Notificações] Erro no canal')
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ [Realtime Notificações] Timeout')
        } else if (status === 'CLOSED') {
          console.log('🔒 [Realtime Notificações] Canal fechado')
        }
      })

    return () => {
      console.log('🧹 [Notificações] Limpando canal Realtime')
      supabase.removeChannel(channel)
    }
  }

  function playNotificationSound() {
    if (!soundEnabled || !audioRef.current) {
      console.log('🔇 [Som] Som desabilitado ou áudio não inicializado')
      return
    }

    // Verificar se áudio foi desbloqueado (especialmente em mobile)
    if (!audioUnlockedRef.current) {
      console.log('🔒 [Som] Áudio ainda bloqueado. Use vibração como fallback.')
      
      // Fallback: Usar vibração em mobile
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]) // Vibrar 200ms, pausa 100ms, vibrar 200ms
        console.log('📳 [Som] Vibração ativada como fallback')
      }
      
      return
    }

    try {
      audioRef.current.currentTime = 0
      const playPromise = audioRef.current.play()
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🔊 [Som] Reproduzindo notification.mp3')
          })
          .catch((error) => {
            console.log('⚠️ [Som] Não foi possível tocar (bloqueado pelo navegador):', error.message)
            
            // Fallback: vibração
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200])
              console.log('📳 [Som] Usando vibração como alternativa')
            }
          })
      }
    } catch (error) {
      console.error('❌ [Som] Erro ao tentar tocar:', error)
    }
  }

  function toggleSound() {
    const newState = !soundEnabled
    setSoundEnabled(newState)
    localStorage.setItem('notificationSound', newState.toString())
    
    console.log(`🔊 [Som] ${newState ? 'Ativado' : 'Desativado'}`)
    
    // Tocar som de teste ao ativar (e desbloquear áudio mobile)
    if (newState) {
      playNotificationSound()
    }
  }

  function markAllAsRead() {
    setUnreadCount(0)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  function formatNotificationTime(date: string) {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}m atrás`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h atrás`
    
    return notifDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  function getNotificationIcon(type: string) {
    if (type === 'paid_order') {
      return <DollarSign className="h-4 w-4" />
    }
    return <Package className="h-4 w-4" />
  }

  function getNotificationColor(type: string) {
    if (type === 'paid_order') {
      return 'bg-success/10 border-success/20'
    }
    return 'bg-primary/10 border-primary/20'
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile Menu + Restaurant Name */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <MenuIcon className="h-5 w-5" />
        </Button>

        {/* Restaurant Name */}
        <h2 className="text-base sm:text-lg font-semibold truncate max-w-[150px] sm:max-w-none">
          {userData.restaurantName}
        </h2>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Sound Toggle */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleSound}
          title={soundEnabled ? 'Desativar som/vibração' : 'Ativar som/vibração'}
          className="hidden sm:flex"
        >
          {soundEnabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 sm:w-96" align="end">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Notificações</h3>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setNotifications([])}
                >
                  Limpar tudo
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${getNotificationColor(notif.type)}`}
                    onClick={() => {
                      setIsPopoverOpen(false)
                      router.push('/dashboard/orders')
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        notif.type === 'paid_order' ? 'bg-success/20' : 'bg-primary/20'
                      }`}>
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatNotificationTime(notif.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-1">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarImage 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userData.userName)}&background=0ea5e9&color=fff&size=128`}
                  alt={userData.userName}
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {userData.userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline-block text-sm font-medium max-w-[100px] md:max-w-none truncate">
                {userData.userName}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}