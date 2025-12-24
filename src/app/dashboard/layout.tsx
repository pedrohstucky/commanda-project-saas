"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [isLoading, setIsLoading] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // =====================================================
  // CHECK AUTH + PROFILE + TENANT
  // =====================================================
  const checkUser = useCallback(async () => {
    try {
      // 1. Verificar sessão
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        router.replace("/login")
        return
      }

      // 2. Verificar profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", session.user.id)
        .single()

      if (profileError || !profile?.tenant_id) {
        console.error("Profile inválido:", profileError)
        await supabase.auth.signOut()
        router.replace("/login")
        return
      }

      // 3. Tudo OK
      setIsLoading(false)
    } catch (error) {
      console.error("Erro ao verificar usuário:", error)
      router.replace("/login")
    }
  }, [router, supabase])

  // =====================================================
  // EFFECT
  // =====================================================
  useEffect(() => {
    checkUser()
  }, [checkUser])

  // =====================================================
  // LOADING
  // =====================================================
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardSidebar
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      <div className="lg:pl-64">
        <DashboardHeader
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
