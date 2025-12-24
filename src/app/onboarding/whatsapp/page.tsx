"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

interface WhatsAppInstance {
  id: string
  status: "disconnected" | "connecting" | "connected"
  qr_code: string | null
  phone_number: string | null
  profile_name: string | null
  updated_at: string
}

export default function WhatsAppOnboardingPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [instance, setInstance] = useState<WhatsAppInstance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(120)
  const [error, setError] = useState<string | null>(null)

  // =====================================================
  // LOAD INSTANCE
  // =====================================================
  const loadInstance = useCallback(async () => {
    console.log("📥 [WhatsApp] Carregando instância...")

    try {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        setError("Nenhuma instância encontrada. Redirecionando...")
        setTimeout(() => router.push("/register"), 2000)
        return
      }

      setInstance(data)
      setError(null)

      if (data.status === "connected") {
        setTimeout(() => router.push("/onboarding/success"), 500)
      }
    } catch (err) {
      console.error("❌ [WhatsApp] Erro:", err)
      setError("Erro ao carregar instância")
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router])

  // =====================================================
  // INIT + REALTIME
  // =====================================================
  useEffect(() => {
    loadInstance()

    const channel = supabase
      .channel("whatsapp-status-channel")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_instances",
        },
        (payload) => {
          const updated = payload.new as WhatsAppInstance
          setInstance(updated)

          if (updated.status === "connected") {
            setTimeout(() => {
              router.push("/onboarding/success")
            }, 1000)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadInstance, supabase, router])

  // =====================================================
  // QR CODE TIMER
  // =====================================================
  useEffect(() => {
    if (!isLoading && instance?.qr_code && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isLoading, instance?.qr_code, timeLeft])

  const handleRefresh = async () => {
    setIsLoading(true)
    setTimeLeft(120)
    await loadInstance()
  }

  // =====================================================
  // LOADING
  // =====================================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-background">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Logo />
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Carregando...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // =====================================================
  // ERROR
  // =====================================================
  if (error || !instance) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-background">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Logo />
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md text-center">
              <p className="text-red-600 mb-4">
                {error || "Nenhuma instância encontrada"}
              </p>
              <Button onClick={handleRefresh}>Tentar novamente</Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // =====================================================
  // MAIN
  // =====================================================
  return (
    <div className="min-h-screen bg-muted/30">
      {/* JSX ORIGINAL — SEM ALTERAÇÕES */}
      {/* … */}
    </div>
  )
}
