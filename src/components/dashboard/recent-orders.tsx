"use client"

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { ArrowRight, PackageX } from "lucide-react";
import { EmptyStateCompact } from "../ui/empty-state";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/lib/types/order";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { RecentOrdersSkeleton } from "../ui/skeleton-patterns";

interface OrderRow {
  id: string;
  customer_name: string | null;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
}

function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function RecentOrders() {
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecentOrders = useCallback(async () => {
    try {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_name, total_amount, status, created_at")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        logger.error("Erro ao carregar pedidos recentes:", error);
        return;
      }

      setOrders(data ?? []);
    } catch (error) {
      logger.error("Erro ao carregar pedidos recentes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadRecentOrders();

    const channel = supabase
      .channel("recent-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadRecentOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRecentOrders, supabase]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Data inválida";
    }
  };

  const handleOrderClick = useCallback(
    (orderId: string) => {
      if (!isValidUUID(orderId)) {
        logger.error("ID de pedido inválido", { orderId });
        toast.error("ID de pedido inválido");
        return;
      }
      router.push(`/dashboard/orders/${orderId}`);
    },
    [router]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Últimos Pedidos</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/orders")}
        >
          Ver todos
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <RecentOrdersSkeleton />
        ) : orders.length === 0 ? (
          <EmptyStateCompact
            icon={PackageX}
            title="Nenhum pedido recente"
            description="Seus pedidos aparecerão aqui assim que chegarem"
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleOrderClick(order.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">
                      {order.customer_name || "Cliente não identificado"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {formatCurrency(order.total_amount)}
                    </span>
                    <span>•</span>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
