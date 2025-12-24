"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

interface OrderRow {
  id: string
  total_amount: number
  status: "pending" | "paid" | "cancelled"
  created_at: string
}

export function RecentOrders() {
  const supabase = createBrowserSupabaseClient()
  const [orders, setOrders] = useState<OrderRow[]>([])

  const loadRecentOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, total_amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) {
      console.error("Erro ao carregar pedidos recentes:", error)
      return
    }

    setOrders(data ?? [])
  }, [supabase])

  useEffect(() => {
    loadRecentOrders()

    const channel = supabase
      .channel("recent-orders")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        () => {
          loadRecentOrders()
        }
      )

      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime RecentOrders conectado")
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadRecentOrders, supabase])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

  const getStatusBadge = (status: OrderRow["status"]) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }

    const labels = {
      pending: "Pendente",
      paid: "Pago",
      cancelled: "Cancelado",
    }

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[status]
        }`}
      >
        {labels[status]}
      </span>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos Pedidos</CardTitle>
      </CardHeader>

      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum pedido ainda
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="font-medium">
                    {formatCurrency(order.total_amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.created_at)}
                  </p>
                </div>
                {getStatusBadge(order.status)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
