"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";
import {
  Bell,
  ChevronDown,
  Package,
  DollarSign,
  Volume2,
  VolumeX,
  Menu as MenuIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface OrderRow {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Notification {
  id: string;
  type: "new_order" | "paid_order";
  title: string;
  message: string;
  order_id: string;
  created_at: string;
}

interface DashboardHeaderProps {
  restaurantName?: string;
  userName?: string;
  onMenuClick?: () => void;
}

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export function DashboardHeader({
  restaurantName,
  userName,
  onMenuClick,
}: DashboardHeaderProps) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [userData, setUserData] = useState({
    restaurantName: restaurantName || "Carregando...",
    userName: userName || "Usuário",
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  /* -------------------------------------------------------------------------- */
  /*                               HELPERS                                      */
  /* -------------------------------------------------------------------------- */

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;

    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        if ("vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      });
    } catch (err) {
      console.error("Erro ao tocar som:", err);
    }
  }, [soundEnabled]);

  /* -------------------------------------------------------------------------- */
  /*                               DATA LOAD                                    */
  /* -------------------------------------------------------------------------- */

  const loadUserData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", profile.tenant_id)
      .single();

    setUserData({
      restaurantName: tenant?.name || "Restaurante",
      userName: profile.full_name || user.email?.split("@")[0] || "Usuário",
    });
  }, [supabase]);

  const loadInitialNotifications = useCallback(async () => {
    const since = new Date();
    since.setMinutes(since.getMinutes() - 30);

    const { data } = await supabase
      .from("orders")
      .select("id, total_amount, status, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (!data) return;

    const mapped: Notification[] = data.map((order) => {
      const type: Notification["type"] =
        order.status === "paid" ? "paid_order" : "new_order";

      return {
        id: `order-${order.id}`,
        type,
        title: type === "paid_order" ? "✅ Pedido Pago" : "🆕 Novo Pedido",
        message:
          type === "paid_order"
            ? `Pagamento de ${formatCurrency(order.total_amount)} confirmado`
            : `Novo pedido de ${formatCurrency(order.total_amount)} recebido`,
        order_id: order.id,
        created_at: order.created_at,
      };
    });

    setNotifications(mapped);
    setUnreadCount(mapped.length);
  }, [supabase, formatCurrency]);

  /* -------------------------------------------------------------------------- */
  /*                             REALTIME                                       */
  /* -------------------------------------------------------------------------- */

  const setupRealtimeListeners = useCallback(() => {
    const channel = supabase
      .channel("orders-notifications")

      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: RealtimePostgresInsertPayload<OrderRow>) => {
          const order = payload.new;

          const notification: Notification = {
            id: `order-${order.id}`,
            type: "new_order",
            title: "🆕 Novo Pedido",
            message: `Novo pedido de ${formatCurrency(
              order.total_amount
            )} recebido`,
            order_id: order.id,
            created_at: order.created_at,
          };

          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          playNotificationSound();
        }
      )

      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload: RealtimePostgresUpdatePayload<OrderRow>) => {
          if (
            payload.old?.status !== "paid" &&
            payload.new.status === "paid"
          ) {
            const notification: Notification = {
              id: `paid-${payload.new.id}-${Date.now()}`,
              type: "paid_order",
              title: "✅ Pedido Pago",
              message: `Pagamento de ${formatCurrency(
                payload.new.total_amount
              )} confirmado`,
              order_id: payload.new.id,
              created_at: new Date().toISOString(),
            };

            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, formatCurrency, playNotificationSound]);

  /* -------------------------------------------------------------------------- */
  /*                               EFFECTS                                      */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 0.5;

    loadUserData();
    loadInitialNotifications();
    const cleanup = setupRealtimeListeners();

    const saved = localStorage.getItem("notificationSound");
    if (saved !== null) setSoundEnabled(saved === "true");

    return () => {
      cleanup();
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [loadUserData, loadInitialNotifications, setupRealtimeListeners]);

  useEffect(() => {
    if (isPopoverOpen) setUnreadCount(0);
  }, [isPopoverOpen]);

  /* -------------------------------------------------------------------------- */
  /*                                   UI                                       */
  /* -------------------------------------------------------------------------- */

  function handleSignOut() {
    supabase.auth.signOut();
    router.push("/");
  }

  function toggleSound() {
    const value = !soundEnabled;
    setSoundEnabled(value);
    localStorage.setItem("notificationSound", String(value));
  }

  function getNotificationIcon(type: Notification["type"]) {
    return type === "paid_order" ? (
      <DollarSign className="h-4 w-4" />
    ) : (
      <Package className="h-4 w-4" />
    );
  }

  /* -------------------------------------------------------------------------- */

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
          <MenuIcon className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold truncate">{userData.restaurantName}</h2>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleSound}>
          {soundEnabled ? <Volume2 /> : <VolumeX />}
        </Button>

        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-xs text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            {notifications.map((n) => (
              <div key={n.id} className="flex gap-2 p-2">
                {getNotificationIcon(n.type)}
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </div>
              </div>
            ))}
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage
                  src={`https://ui-avatars.com/api/?name=${userData.userName}`}
                />
                <AvatarFallback>
                  {userData.userName[0]}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}