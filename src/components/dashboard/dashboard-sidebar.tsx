"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Menu as MenuIcon,
  Settings,
  LogOut,
  MessageCircle,
  FolderOpen,
  TrendingUp,
  Globe,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { PendingOrdersBadge } from "./pending-orders-badge";
import { logger } from "@/lib/logger";

interface DashboardSidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface ProfileData {
  tenants: {
    subscription_plan: string;
  } | null;
}

interface WhatsAppInstanceRow {
  id: string;
  status: "connected" | "connecting" | "disconnected";
  phone_number: string | null;
  created_at: string;
}

export function DashboardSidebar({
  isMobileOpen,
  setIsMobileOpen,
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserSupabaseClient();

  const [whatsappStatus, setWhatsappStatus] = useState<{
    status: string;
    phone: string | null;
  }>({
    status: "disconnected",
    phone: null,
  });

  const [tier, setTier] = useState<"trial" | "basic" | "pro" | "premium">(
    "basic"
  );

  // ✅ Navigation movido para DENTRO do componente
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    {
      name: "Pedidos",
      href: "/dashboard/orders",
      icon: ClipboardList,
      showBadge: true,
    },
    { name: "Cardápio", href: "/dashboard/products", icon: MenuIcon },
    {
      name: "Categorias",
      href: "/dashboard/products/categories",
      icon: FolderOpen,
    },
    { name: "Cardápio Digital", href: "/dashboard/menu", icon: Globe },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: TrendingUp,
      badge: tier === "trial" || tier === "basic" ? "Pro" : undefined,
    },
    { name: "WhatsApp", href: "/onboarding/whatsapp", icon: MessageCircle },
    { name: "Configurações", href: "/dashboard/settings", icon: Settings },
  ];

  const loadWhatsAppStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from("whatsapp_instances")
      .select("status, phone_number")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error("Erro ao carregar WhatsApp status:", error);
      return;
    }

    if (data) {
      setWhatsappStatus({
        status: data.status,
        phone: data.phone_number,
      });
    }
  }, [supabase]);

  const loadTier = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenants(subscription_plan)")
        .eq("id", user.id)
        .single();

      if (profile) {
        const typedProfile = profile as unknown as ProfileData;
        const subscriptionPlan =
          typedProfile.tenants?.subscription_plan || "basic";

        setTier(subscriptionPlan as "trial" | "basic" | "pro" | "premium");
      }
    } catch (error) {
      logger.error("Erro ao carregar tier:", error);
    }
  }, [supabase]);

  useEffect(() => {
    loadWhatsAppStatus();
    loadTier();

    const channel = supabase
      .channel("whatsapp-sidebar")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_instances",
        },
        (payload) => {
          const updated = payload.new as WhatsAppInstanceRow;

          setWhatsappStatus({
            status: updated.status,
            phone: updated.phone_number,
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          logger.debug("✅ Realtime WhatsApp Sidebar conectado");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadWhatsAppStatus, loadTier, supabase]);

  // ... resto do código continua igual

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const getWhatsAppStatusInfo = () => {
    if (whatsappStatus.status === "connected") {
      return {
        text: "Conectado",
        color: "text-success",
        bgColor: "bg-success",
      };
    } else if (whatsappStatus.status === "connecting") {
      return {
        text: "Conectando...",
        color: "text-yellow-600",
        bgColor: "bg-yellow-600",
      };
    } else {
      return {
        text: "Desconectado",
        color: "text-muted-foreground",
        bgColor: "bg-muted-foreground",
      };
    }
  };

  const statusInfo = getWhatsAppStatusInfo();

  const SidebarContent = () => (
    <>
      <div className="flex top-0 flex h-16 items-center bg-foreground-sidebar px-4">
        <Logo className="text-sidebar-foreground" />
      </div>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto py-10">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-white-300"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {/* Badge de pedidos pending */}
                  {item.showBadge && <PendingOrdersBadge />}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="lg:hidden">
                {item.name}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
      <div className="p-4">
        <Link
          href="/onboarding/whatsapp"
          onClick={() => setIsMobileOpen(false)}
        >
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-3 cursor-pointer hover:bg-sidebar-accent/70 transition-colors">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${statusInfo.bgColor}`}
            >
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground">
                WhatsApp
              </p>
              <p className={`text-xs ${statusInfo.color} truncate`}>
                {statusInfo.text}
              </p>
            </div>
          </div>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Sair</span>
        </Button>
      </div>
    </>
  );

  return (
    <TooltipProvider delayDuration={0}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-64 lg:flex-col bg-sidebar text-sidebar-foreground">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent
          side="left"
          className="p-0 w-64 bg-sidebar text-sidebar-foreground"
        >
          <div className="flex h-full flex-col">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
