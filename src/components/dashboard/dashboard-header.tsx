"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Menu as MenuIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface DashboardHeaderProps {
  restaurantName?: string;
  userName?: string;
  onMenuClick?: () => void;
}

/**
 * Header do dashboard
 *
 * Mostra:
 * - Nome do restaurante
 * - Menu mobile (hamburger)
 * - Avatar e menu do usuário
 */
export function DashboardHeader({
  restaurantName,
  userName,
  onMenuClick,
}: DashboardHeaderProps) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [userData, setUserData] = useState({
    restaurantName: restaurantName || "Carregando...",
    userName: userName || "Usuário",
  });

  /**
   * Carrega dados do usuário e restaurante
   */
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

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  /**
   * Logout
   */
  const handleSignOut = () => {
    supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="fixed top-0 right-0 z-50 h-16 flex items-center justify-between px-4 left-0 lg:left-64 bg-background">
      {/* Nome do restaurante + menu mobile */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold truncate">
          {userData.restaurantName}
        </h2>
      </div>
  
      {/* Avatar e menu do usuário */}
      <div className="flex items-center gap-2">
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
              <span className="hidden sm:inline">
                {userData.userName}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-secondary text-secondary-foreground"
          >
            <DropdownMenuItem
              onClick={() => router.push('/dashboard/settings')}
            >
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive"
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}