"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  ClipboardList, 
  Menu as MenuIcon, 
  Settings, 
  LogOut, 
  MessageCircle
} from "lucide-react"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pedidos", href: "/dashboard/orders", icon: ClipboardList },
  { name: "Cardápio", href: "/dashboard/products", icon: MenuIcon },
  { name: "WhatsApp", href: "/onboarding/whatsapp", icon: MessageCircle },
  { name: "Configurações", href: "/dashboard/settings", icon: Settings },
]

interface DashboardSidebarProps {
  isMobileOpen: boolean
  setIsMobileOpen: (open: boolean) => void
}

export function DashboardSidebar({ 
  isMobileOpen, 
  setIsMobileOpen 
}: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createBrowserSupabaseClient()
  const [whatsappStatus, setWhatsappStatus] = useState<{
    status: string
    phone: string | null
  }>({
    status: 'disconnected',
    phone: null
  })

  useEffect(() => {
    loadWhatsAppStatus()

    const channel = supabase
      .channel('whatsapp-sidebar')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_instances'
        },
        (payload) => {
          setWhatsappStatus({
            status: payload.new.status,
            phone: payload.new.phone_number
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadWhatsAppStatus() {
    const { data } = await supabase
      .from('whatsapp_instances')
      .select('status, phone_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setWhatsappStatus({
        status: data.status,
        phone: data.phone_number
      })
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getWhatsAppStatusInfo = () => {
    if (whatsappStatus.status === 'connected') {
      return {
        text: 'Conectado',
        color: 'text-success',
        bgColor: 'bg-success'
      }
    } else if (whatsappStatus.status === 'connecting') {
      return {
        text: 'Conectando...',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-600'
      }
    } else {
      return {
        text: 'Desconectado',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted-foreground'
      }
    }
  }

  const statusInfo = getWhatsAppStatusInfo()

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <Logo className="text-sidebar-foreground dark" />
      </div>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
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
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="lg:hidden">
                {item.name}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <Link href="/onboarding/whatsapp" onClick={() => setIsMobileOpen(false)}>
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-3 cursor-pointer hover:bg-sidebar-accent/70 transition-colors">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${statusInfo.bgColor}`}>
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground">WhatsApp</p>
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
  )

  return (
    <TooltipProvider delayDuration={0}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-64 lg:flex-col bg-sidebar text-sidebar-foreground">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar text-sidebar-foreground">
          <div className="flex h-full flex-col">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}