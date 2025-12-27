"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, PackageX } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { exportToCSV, exportToPDF } from "@/lib/utils/export";
import { logger } from "@/lib/logger";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { OrderCard } from "@/components/orders/order-card";
import { OrderFilters } from "@/components/orders/order-filters";
import { OrderPagination } from "@/components/orders/order-pagination";
import { OrdersGridSkeleton } from "@/components/ui/skeleton-patterns";
import { toast } from "sonner";
import type {
  Order,
  OrderFilters as OrderFiltersType,
} from "@/lib/types/order";

/**
 * Valida UUID
 */
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export default function OrdersPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [filters, setFilters] = useState<OrderFiltersType>({
    status: "all",
    search: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    total: 0,
  });

  const [orderCounts, setOrderCounts] = useState({
    all: 0,
    pending: 0,
    preparing: 0,
    completed: 0,
    cancelled: 0,
  });

  /**
   * Carrega contadores por status
   */
  const loadOrderCounts = useCallback(
    async (tenantId: string) => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("status")
          .eq("tenant_id", tenantId);

        if (error || !data) return;

        setOrderCounts({
          all: data.length,
          pending: data.filter((o) => o.status === "pending").length,
          preparing: data.filter((o) => o.status === "preparing").length,
          completed: data.filter((o) => o.status === "completed").length,
          cancelled: data.filter((o) => o.status === "cancelled").length,
        });
      } catch (error) {
        logger.error("Erro ao carregar contadores de pedidos", error);
      }
    },
    [supabase]
  );

  /**
   * Carrega pedidos
   */
  const loadOrders = useCallback(async () => {
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

      if (!profile?.tenant_id) return;

      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      let query = supabase
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
            )
          )
        `,
          { count: "exact" }
        )
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.search?.trim()) {
        const term = `%${filters.search.trim()}%`;
        query = query.or(
          `customer_name.ilike.${term},customer_phone.ilike.${term}`
        );
      }

      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      if (filters.minAmount !== undefined) {
        query = query.gte("total_amount", filters.minAmount);
      }

      if (filters.maxAmount !== undefined) {
        query = query.lte("total_amount", filters.maxAmount);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error("Erro ao carregar pedidos", error);
        toast.error("Erro ao carregar pedidos", {
          description: error.message,
        });
        return;
      }

      setOrders((data ?? []) as Order[]);
      setPagination((prev) => ({ ...prev, total: count ?? 0 }));

      await loadOrderCounts(profile.tenant_id);
    } catch (error) {
      logger.error("Erro inesperado ao carregar pedidos", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    supabase,
    filters,
    pagination.page,
    pagination.pageSize,
    loadOrderCounts,
  ]);

  /**
   * Ações do pedido
   */
  const handleAccept = useCallback(
    async (orderId: string) => {
      try {
        setActionLoading(orderId);

        const response = await fetch(`/api/orders/${orderId}/accept`, {
          method: "POST",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error);
        }

        toast.success("Pedido aceito!", {
          description: "O pedido está agora em preparo.",
        });

        loadOrders();
      } catch (error) {
        logger.error("Erro ao aceitar pedido", error);
        toast.error("Erro ao aceitar pedido");
      } finally {
        setActionLoading(null);
      }
    },
    [loadOrders]
  );

  const handleReject = useCallback(
    async (orderId: string) => {
      try {
        setActionLoading(orderId);

        const response = await fetch(`/api/orders/${orderId}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Recusado pelo atendente" }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error);
        }

        toast.success("Pedido recusado", {
          description: "O pedido foi cancelado.",
        });

        loadOrders();
      } catch (error) {
        logger.error("Erro ao recusar pedido", error);
        toast.error("Erro ao recusar pedido");
      } finally {
        setActionLoading(null);
      }
    },
    [loadOrders]
  );

  const handleComplete = useCallback(
    async (orderId: string) => {
      try {
        setActionLoading(orderId);

        const response = await fetch(`/api/orders/${orderId}/complete`, {
          method: "POST",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error);
        }

        toast.success("Pedido concluído!", {
          description: "O pedido foi marcado como entregue.",
        });

        loadOrders();
      } catch (error) {
        logger.error("Erro ao concluir pedido", error);
        toast.error("Erro ao concluir pedido");
      } finally {
        setActionLoading(null);
      }
    },
    [loadOrders]
  );

  /**
   * Exportações
   */
  const handleExportCSV = useCallback(() => {
    const date = new Date().toISOString().split("T")[0];
    exportToCSV(orders, `pedidos-${date}.csv`);
    toast.success("Exportação concluída", {
      description: `${orders.length} pedido(s) exportado(s)`,
    });
  }, [orders]);

  const handleExportPDF = useCallback(() => {
    exportToPDF(orders);
  }, [orders]);

  /**
   * Reset de página ao mudar filtros
   */
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [filters]);

  /**
   * Load inicial + realtime
   */
  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        loadOrders
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadOrders]);

  /**
   * Navegação para pedido
   */
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold sm:text-3xl">Pedidos</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Gerencie todos os pedidos do seu restaurante
          </p>
        </div>

        {/* Exportação */}
        {orders.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex w-full items-center gap-2 sm:w-auto"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                <FileText className="h-4 w-4" />
                Exportar CSV
                <span className="ml-auto text-xs text-muted-foreground">
                  {orders.length} pedido(s)
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                <FileText className="h-4 w-4" />
                Exportar PDF
                <span className="ml-auto text-xs text-muted-foreground">
                  {orders.length} pedido(s)
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Filtros */}
      <div className="space-y-4">
        <OrderFilters
          filters={filters}
          onFiltersChange={setFilters}
          orderCounts={orderCounts}
        />
      </div>

      {/* Conteúdo */}
      {/* Conteúdo */}
      {isLoading ? (
        // ✅ NOVO: Skeleton ao invés de spinner
        <OrdersGridSkeleton count={9} />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageX className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">
            Nenhum pedido encontrado
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {filters.status !== "all" || filters.search
              ? "Tente ajustar os filtros de busca"
              : "Aguardando novos pedidos..."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Lista */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={handleAccept}
                onReject={handleReject}
                onComplete={handleComplete}
                onClick={handleOrderClick}
                isLoading={actionLoading === order.id}
              />
            ))}
          </div>

          {/* Paginação */}
          <OrderPagination
            currentPage={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={(page) =>
              setPagination((prev) => ({ ...prev, page }))
            }
          />
        </div>
      )}
    </div>
  );
}
