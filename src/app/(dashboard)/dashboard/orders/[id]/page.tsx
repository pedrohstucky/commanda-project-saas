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
import { OrderDetailsSkeleton } from "@/components/ui/skeleton-patterns";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ArrowLeft,
  User,
  Phone,
  MessageSquare,
  Calendar,
  Printer,
  MapPin,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import type { OrderWithItems } from "@/lib/types/order";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logger } from "@/lib/logger";

/**
 * Página de detalhes do pedido
 */
export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const supabase = createBrowserSupabaseClient();

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

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
            order_item_extras (
              id,
              extra_id,
              extra_name,
              extra_price
            ),
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
        logger.error("Erro ao carregar pedido:", error);
        toast.error("Erro ao carregar pedido");
        router.push("/dashboard/orders");
        return;
      }

      setOrder(data as OrderWithItems);
    } catch (error) {
      logger.error("Erro ao carregar pedido:", error);
      toast.error("Erro ao carregar pedido");
      router.push("/dashboard/orders");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, orderId, router]);

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

        toast.success("Pedido aceito!");
        loadOrder();
      } catch (error) {
        logger.error("Erro ao aceitar pedido:", error);
        toast.error("Erro ao aceitar pedido");
      } finally {
        setActionLoading(false);
      }
    },
    [loadOrder]
  );

  const handleRejectClick = useCallback(() => {
    setRejectDialog(true);
  }, []);

  const confirmReject = useCallback(async () => {
    if (!order) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/orders/${order.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Recusado pelo atendente" }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao recusar pedido");
      }

      toast.success("Pedido recusado");
      loadOrder();
      setRejectDialog(false);
    } catch (error) {
      logger.error("Erro ao recusar pedido:", error);
      toast.error("Erro ao recusar pedido");
    } finally {
      setActionLoading(false);
    }
  }, [order, loadOrder]);

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

        toast.success("Pedido concluído!");
        loadOrder();
      } catch (error) {
        logger.error("Erro ao completar pedido:", error);
        toast.error("Erro ao completar pedido");
      } finally {
        setActionLoading(false);
      }
    },
    [loadOrder]
  );

  useEffect(() => {
    loadOrder();

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
        loadOrder
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, orderId, loadOrder]);

  if (isLoading) return <OrderDetailsSkeleton />;

  if (!order) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Pedido não encontrado</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/orders")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/orders")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <h1 className="text-xl font-bold sm:text-3xl">
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

      {/* Conteúdo */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Principal */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Itens do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderItemsList items={order.order_items || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline order={order} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.customer_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {order.customer_name}
                </div>
              )}

              {order.customer_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {order.customer_phone}
                </div>
              )}

              <Separator />

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {order.delivery_type === "delivery" ? (
                    <>
                      <MapPin className="h-4 w-4" /> Entrega
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" /> Retirada
                    </>
                  )}
                </div>

                {order.delivery_address && (
                  <p className="pl-6 text-sm text-muted-foreground">
                    {order.delivery_address}
                  </p>
                )}
              </div>

              {order.notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare className="h-4 w-4" />
                      Observações
                    </div>
                    <p className="pl-6 text-sm text-muted-foreground">
                      {order.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Criado {formatDate(order.created_at)}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold sm:text-2xl">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderActions
                orderId={order.id}
                status={order.status}
                onAccept={handleAccept}
                onReject={handleRejectClick}
                onComplete={handleComplete}
                isLoading={actionLoading}
              />

              <ConfirmDialog
                open={rejectDialog}
                onOpenChange={setRejectDialog}
                title="Recusar pedido?"
                description={`Tem certeza que deseja recusar o pedido de ${
                  order.customer_name || "Cliente"
                }?`}
                confirmText="Recusar pedido"
                cancelText="Cancelar"
                onConfirm={confirmReject}
                variant="destructive"
                isLoading={actionLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
