"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { OrderItemsList } from "@/components/orders/order-items-list";
import { OrderActions } from "@/components/orders/order-actions";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  User,
  Phone,
  MessageSquare,
  Calendar,
  Loader2,
  Printer,
  MapPin,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import type { OrderWithItems } from "@/lib/types/order";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Página de detalhes do pedido
 *
 * Mostra:
 * - Informações do cliente
 * - Status e timeline
 * - Lista de itens
 * - Ações disponíveis
 * - Histórico de mudanças
 */
export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const supabase = createBrowserSupabaseClient();

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  /**
   * Formata valor monetário
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  /**
   * Formata data relativa
   */
  const formatDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "Data inválida";
    }
  };

  /**
   * Carrega detalhes do pedido
   */
  const loadOrder = useCallback(async () => {
    try {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
        *,
        order_items (
          id,
          quantity,
          product_price,
          product_id,
          product_name,
          variation_id,
          variation_name,
          subtotal,
          products (
            id,
            name,
            description,
            image_url,
            category_id
          )
        )
      `
        )
        .eq("id", orderId)
        .eq("tenant_id", profile.tenant_id)
        .single();

      if (error) {
        console.error("Erro ao carregar pedido:", error);
        toast.error("Erro ao carregar pedido", {
          description: error.message,
        });
        router.push("/dashboard/orders");
        return;
      }

      // ← ADICIONAR LOGS PARA DEBUG
      console.log("📦 Pedido carregado:", data);
      console.log("📦 Order items:", data?.order_items);

      setOrder(data as OrderWithItems);
    } catch (error) {
      console.error("Erro ao carregar pedido:", error);
      toast.error("Erro ao carregar pedido");
      router.push("/dashboard/orders");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, orderId, router]);

  /**
   * Aceita o pedido
   */

  /**
   * Aceita o pedido via API
   */
  const handleAccept = useCallback(
    async (orderId: string) => {
      try {
        setActionLoading(true);

        const response = await fetch(`/api/orders/${orderId}/accept`, {
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Erro ao aceitar pedido");
        }

        toast.success("Pedido aceito!", {
          description: "O pedido está agora em preparo.",
        });

        loadOrder();
      } catch (error) {
        console.error("Erro ao aceitar pedido:", error);
        toast.error("Erro ao aceitar pedido", {
          description:
            error instanceof Error ? error.message : "Tente novamente",
        });
      } finally {
        setActionLoading(false);
      }
    },
    [loadOrder]
  );

  /**
   * Recusa o pedido via API
   */
  const handleReject = useCallback(
    async (orderId: string) => {
      try {
        setActionLoading(true);

        const response = await fetch(`/api/orders/${orderId}/reject`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "Recusado pelo atendente",
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Erro ao recusar pedido");
        }

        toast.success("Pedido recusado", {
          description: "O pedido foi cancelado.",
        });

        loadOrder();
      } catch (error) {
        console.error("Erro ao recusar pedido:", error);
        toast.error("Erro ao recusar pedido", {
          description:
            error instanceof Error ? error.message : "Tente novamente",
        });
      } finally {
        setActionLoading(false);
      }
    },
    [loadOrder]
  );

  /**
   * Completa o pedido via API
   */
  const handleComplete = useCallback(
    async (orderId: string) => {
      try {
        setActionLoading(true);

        const response = await fetch(`/api/orders/${orderId}/complete`, {
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Erro ao completar pedido");
        }

        toast.success("Pedido concluído!", {
          description: "O pedido foi marcado como entregue.",
        });

        loadOrder();
      } catch (error) {
        console.error("Erro ao completar pedido:", error);
        toast.error("Erro ao completar pedido", {
          description:
            error instanceof Error ? error.message : "Tente novamente",
        });
      } finally {
        setActionLoading(false);
      }
    },
    [loadOrder]
  );

  /**
   * Carrega pedido e configura Realtime
   */
  useEffect(() => {
    loadOrder();

    // Realtime - escuta mudanças neste pedido
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          loadOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, orderId, loadOrder]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Pedido não encontrado</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/orders")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para pedidos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/orders")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              Pedido #{order.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-muted-foreground">
              Criado {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Itens do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle>Itens do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderItemsList items={order.order_items || []} />
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Andamento do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline order={order} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informações do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Nome */}
              {order.customer_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{order.customer_name}</span>
                </div>
              )}

              {/* Telefone */}
              {order.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{order.customer_phone}</span>
                </div>
              )}

              <Separator />

              {/* Tipo de Entrega */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {order.delivery_type === "delivery" ? (
                    <>
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Entrega</span>
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Retirada no Local
                      </span>
                    </>
                  )}
                </div>

                {/* Endereço (apenas se for entrega) */}
                {order.delivery_type === "delivery" &&
                  order.delivery_address && (
                    <p className="text-sm text-muted-foreground pl-6">
                      {order.delivery_address}
                    </p>
                  )}
              </div>

              {/* Observações */}
              {order.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Observações</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {order.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Criado:</span>
                <span>{formatDate(order.created_at)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderActions
                orderId={order.id}
                status={order.status}
                onAccept={handleAccept}
                onReject={handleReject}
                onComplete={handleComplete}
                isLoading={actionLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
