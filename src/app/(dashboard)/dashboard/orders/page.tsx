"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Download, FileText } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/utils/export";
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
import { Loader2, PackageX } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  Order,
  OrderFilters as OrderFiltersType,
} from "@/lib/types/order";

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
    pageSize: 9,
    total: 0,
  });

  const [orderCounts, setOrderCounts] = useState({
    all: 0,
    pending: 0,
    preparing: 0,
    completed: 0,
    cancelled: 0,
  });

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

      if (!profile) return;

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
            products (
              id,
              name,
              image_url
            )
          )
        `,
          { count: "exact" }
        )
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.search && filters.search.trim().length > 0) {
        const searchTerm = `%${filters.search.trim()}%`;
        query = query.or(
          `customer_name.ilike.${searchTerm},customer_phone.ilike.${searchTerm}`
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
        console.error("Erro ao carregar pedidos:", error);
        toast.error("Erro ao carregar pedidos", {
          description: error.message,
        });
        return;
      }

      setOrders(data as Order[]);
      setPagination((prev) => ({
        ...prev,
        total: count || 0,
      }));

      await loadOrderCounts(profile.tenant_id);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filters, pagination.page, pagination.pageSize]);

  const loadOrderCounts = useCallback(
    async (tenantId: string) => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("status")
          .eq("tenant_id", tenantId);

        if (error || !data) return;

        const counts = {
          all: data.length,
          pending: data.filter((o) => o.status === "pending").length,
          preparing: data.filter((o) => o.status === "preparing").length,
          completed: data.filter((o) => o.status === "completed").length,
          cancelled: data.filter((o) => o.status === "cancelled").length,
        };

        setOrderCounts(counts);
      } catch (error) {
        console.error("Erro ao carregar contadores:", error);
      }
    },
    [supabase]
  );

  const handleAccept = useCallback(
    async (orderId: string) => {
      try {
        setActionLoading(orderId);

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

        loadOrders();
      } catch (error) {
        console.error("Erro ao aceitar pedido:", error);
        toast.error("Erro ao aceitar pedido", {
          description:
            error instanceof Error ? error.message : "Tente novamente",
        });
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

        loadOrders();
      } catch (error) {
        console.error("Erro ao recusar pedido:", error);
        toast.error("Erro ao recusar pedido", {
          description:
            error instanceof Error ? error.message : "Tente novamente",
        });
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

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Erro ao completar pedido");
        }

        toast.success("Pedido concluído!", {
          description: "O pedido foi marcado como entregue.",
        });

        loadOrders();
      } catch (error) {
        console.error("Erro ao completar pedido:", error);
        toast.error("Erro ao completar pedido", {
          description:
            error instanceof Error ? error.message : "Tente novamente",
        });
      } finally {
        setActionLoading(null);
      }
    },
    [loadOrders]
  );

  const handleExportCSV = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const filename = `pedidos-${today}.csv`;
    exportToCSV(orders, filename);
    toast.success("Exportado!", {
      description: `${orders.length} pedido(s) exportado(s) para CSV`,
    });
  }, [orders]);

  const handleExportPDF = useCallback(() => {
    exportToPDF(orders);
  }, [orders]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [filters]);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadOrders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Pedidos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie todos os pedidos do seu restaurante
          </p>
        </div>

        {/* Botão de exportação */}
        {orders.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full sm:w-auto"
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
      <OrderFilters
        filters={filters}
        onFiltersChange={setFilters}
        orderCounts={orderCounts}
      />

      {/* Lista de pedidos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <PackageX className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Nenhum pedido encontrado
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {filters.status !== "all" || filters.search
              ? "Tente ajustar os filtros de busca"
              : "Aguardando novos pedidos..."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={handleAccept}
                onReject={handleReject}
                onComplete={handleComplete}
                onClick={(id) => router.push(`/dashboard/orders/${id}`)}
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
        </>
      )}
    </div>
  );
}
