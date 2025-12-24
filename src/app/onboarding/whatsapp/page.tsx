"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { QrCode, RefreshCw, Loader2, Smartphone } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import Image from "next/image"

interface WhatsAppInstance {
  id: string
  status: 'disconnected' | 'connecting' | 'connected'
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
  // CARREGAR INSTÂNCIA
  // =====================================================
  const loadInstance = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setTimeLeft(120)

    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setError("Nenhuma instância encontrada. Redirecionando...")
        setTimeout(() => router.push("/register"), 2000)
        return
      }

      setInstance(data)

      if (data.status === 'connected') {
        setTimeout(() => router.push('/onboarding/success'), 500)
      }
    } catch (err) {
      console.error('❌ [WhatsApp] Erro:', err)
      setError('Erro ao carregar instância')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router])

  // =====================================================
  // REALTIME WHATSAPP
  // =====================================================
  useEffect(() => {
    loadInstance()

    const channel = supabase
      .channel('whatsapp-status-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_instances',
        },
        (payload) => {
          const updated = payload.new as WhatsAppInstance
          setInstance(updated)

          if (updated.status === 'connected') {
            setTimeout(() => router.push('/onboarding/success'), 1000)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadInstance, supabase, router])

  // =====================================================
  // TIMER DE EXPIRAÇÃO DO QR CODE
  // =====================================================
  useEffect(() => {
    if (!isLoading && instance?.qr_code && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
      return () => clearInterval(timer)
    }
  }, [isLoading, instance?.qr_code, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleRefresh = async () => {
    await loadInstance()
  }

  // =====================================================
  // LOADING STATE
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
  // ERROR STATE
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
              <p className="text-red-600 mb-4">{error || 'Nenhuma instância encontrada'}</p>
              <Button onClick={handleRefresh}>Tentar novamente</Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Logo />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Instruções */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Conecte o WhatsApp do seu restaurante
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Siga os passos abaixo para conectar seu WhatsApp e começar a receber pedidos automaticamente.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    1
                  </span>
                  <div>
                    <p className="font-medium">Abra o WhatsApp no celular</p>
                    <p className="text-sm text-muted-foreground">
                      Use o celular que será conectado ao Commanda
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    2
                  </span>
                  <div>
                    <p className="font-medium">Vá em Aparelhos Conectados</p>
                    <p className="text-sm text-muted-foreground">
                      Toque em Menu (⋮) ou Ajustes {">"} Aparelhos Conectados
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    3
                  </span>
                  <div>
                    <p className="font-medium">Escaneie o QR Code</p>
                    <p className="text-sm text-muted-foreground">
                      Aponte a câmera do celular para o QR Code ao lado
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-accent/50 p-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Dica</p>
                    <p className="text-sm text-muted-foreground">
                      Recomendamos usar um número dedicado para o restaurante
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center">
              <Card className="w-full max-w-sm">
                <CardContent className="flex flex-col items-center p-8">
                  {instance.qr_code ? (
                    <>
                      <div className="relative flex h-64 w-64 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-4">
                        <Image
                          src={instance.qr_code}
                          alt="QR Code WhatsApp"
                          width={256}
                          height={256}
                          className="rounded"
                          priority
                        />
                      </div>
                      <p className="mt-4 text-sm text-muted-foreground">
                        QR Code expira em{" "}
                        <span className="font-medium text-foreground">
                          {formatTime(timeLeft)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <div className="flex h-64 w-64 items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                        <p className="mt-4 text-sm text-muted-foreground">
                          Gerando QR Code...
                        </p>
                      </div>
                    </div>
                  )}

                  {timeLeft === 0 && (
                    <Button
                      variant="outline"
                      className="mt-4 bg-transparent"
                      onClick={handleRefresh}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Gerar novo QR Code
                    </Button>
                  )}
                </CardContent>
              </Card>

              <div className="mt-6 text-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
                  <p>Aguardando conexão...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
