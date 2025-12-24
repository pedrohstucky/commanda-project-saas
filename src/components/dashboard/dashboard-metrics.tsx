"use client"

import { useEffect, useState } from "react"
import { ShoppingBag, DollarSign, Clock, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

interface Metrics {
  todayOrders: number
  yesterdayOrders: number
  todayRevenue: number
  yesterdayRevenue: number
  pendingOrders: number
  avgTicket: number
  lastWeekAvgTicket: number
}

export function DashboardMetrics() {
  const supabase = createBrowserSupabaseClient()
  const [metrics, setMetrics] = useState<Metrics>({
    todayOrders: 0,
    yesterdayOrders: 0,
    todayRevenue: 0,
    yesterdayRevenue: 0,
    pendingOrders: 0,
    avgTicket: 0,
    lastWeekAvgTicket: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
    const cleanup = setupRealtimeListeners()
    return cleanup
  }, [])

  function setupRealtimeListeners() {
    console.log('📊 [Métricas] Configurando Realtime...')

    const channel = supabase
      .channel('metrics-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📊 [Realtime Métricas] Novo pedido:', payload.new)
          loadMetrics()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📊 [Realtime Métricas] Pedido atualizado:', payload.new)
          loadMetrics()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('📊 [Realtime Métricas] Pagamento registrado:', payload.new)
          loadMetrics()
        }
      )
      .subscribe((status, err) => {
        console.log('📡 [Realtime Métricas] Status:', status)
        
        if (err) {
          console.error('❌ [Realtime Métricas] Erro:', err)
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime Métricas] Conectado!')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Realtime Métricas] Erro no canal')
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ [Realtime Métricas] Timeout')
        } else if (status === 'CLOSED') {
          console.log('🔒 [Realtime Métricas] Canal fechado')
        }
      })

    return () => {
      console.log('🧹 [Métricas] Limpando canal Realtime')
      supabase.removeChannel(channel)
    }
  }

  async function loadMetrics() {
    try {
      const now = new Date()
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)

      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const lastWeek = new Date(today)
      lastWeek.setDate(lastWeek.getDate() - 7)

      // 1. PEDIDOS DE HOJE
      const { count: todayOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // 2. PEDIDOS DE ONTEM
      const { count: yesterdayOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())

      // 3. RECEITA DE HOJE
      const { data: todayPaidOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', today.toISOString())
        .eq('status', 'paid')

      const todayRevenue = todayPaidOrders?.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      ) || 0

      // 4. RECEITA DE ONTEM
      const { data: yesterdayPaidOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())
        .eq('status', 'paid')

      const yesterdayRevenue = yesterdayPaidOrders?.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      ) || 0

      // 5. PEDIDOS PENDENTES
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // 6. TICKET MÉDIO DE HOJE
      const avgTicket = todayOrdersCount && todayOrdersCount > 0
        ? todayRevenue / todayOrdersCount
        : 0

      // 7. TICKET MÉDIO DA SEMANA PASSADA
      const { data: lastWeekOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', lastWeek.toISOString())
        .lt('created_at', today.toISOString())
        .eq('status', 'paid')

      const lastWeekRevenue = lastWeekOrders?.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      ) || 0

      const lastWeekAvgTicket = lastWeekOrders && lastWeekOrders.length > 0
        ? lastWeekRevenue / lastWeekOrders.length
        : 0

      setMetrics({
        todayOrders: todayOrdersCount || 0,
        yesterdayOrders: yesterdayOrdersCount || 0,
        todayRevenue,
        yesterdayRevenue,
        pendingOrders: pendingCount || 0,
        avgTicket,
        lastWeekAvgTicket
      })
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const calculatePercentChange = (current: number, previous: number): string => {
    if (previous === 0) {
      return current > 0 ? '+100%' : '0%'
    }
    const change = ((current - previous) / previous) * 100
    return `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`
  }

  const metricsData = [
    {
      title: "Pedidos hoje",
      value: isLoading ? "..." : metrics.todayOrders.toString(),
      change: isLoading 
        ? "..." 
        : `${calculatePercentChange(metrics.todayOrders, metrics.yesterdayOrders)} vs ontem`,
      icon: ShoppingBag,
      trend: metrics.todayOrders >= metrics.yesterdayOrders ? "up" : "down",
    },
    {
      title: "Faturamento do dia",
      value: isLoading ? "..." : formatCurrency(metrics.todayRevenue),
      change: isLoading 
        ? "..." 
        : `${calculatePercentChange(metrics.todayRevenue, metrics.yesterdayRevenue)} vs ontem`,
      icon: DollarSign,
      trend: metrics.todayRevenue >= metrics.yesterdayRevenue ? "up" : "down",
    },
    {
      title: "Pedidos pendentes",
      value: isLoading ? "..." : metrics.pendingOrders.toString(),
      change: "Em preparo",
      icon: Clock,
      trend: "neutral",
    },
    {
      title: "Ticket médio",
      value: isLoading ? "..." : formatCurrency(metrics.avgTicket),
      change: isLoading 
        ? "..." 
        : `${calculatePercentChange(metrics.avgTicket, metrics.lastWeekAvgTicket)} vs semana`,
      icon: TrendingUp,
      trend: metrics.avgTicket >= metrics.lastWeekAvgTicket ? "up" : "down",
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {metricsData.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p
              className={`text-xs ${
                metric.trend === "up"
                  ? "text-success"
                  : metric.trend === "down"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {metric.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}