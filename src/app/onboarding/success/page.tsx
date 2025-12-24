"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, MessageCircle, ArrowRight, Loader2 } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

interface WhatsAppInstance {
  phone_number: string | null
  profile_name: string | null
}

export default function WhatsAppSuccessPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadInstance()
  }, [])

  async function loadInstance() {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('phone_number, profile_name')
        .eq('status', 'connected')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Erro ao carregar instância:', error)
      } else if (data) {
        setInstance(data)
      }
    } catch (error) {
      console.error('Erro ao carregar instância:', error)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Formata número de telefone
   * Exemplo: 554599367177 → +55 45 99367-177
   */
  const formatPhone = (phone: string | null | undefined): string => {
    // Se não tem telefone, retorna placeholder
    if (!phone) {
      return '+55 (--) ----------'
    }
    
    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '')
    
    // Formato brasileiro com DDD (13 dígitos: 55 + DDD + número)
    if (cleaned.length === 13) {
      const countryCode = cleaned.slice(0, 2)   // 55
      const areaCode = cleaned.slice(2, 4)      // 45
      const firstPart = cleaned.slice(4, 9)     // 99367
      const secondPart = cleaned.slice(9)       // 177
      
      return `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`
    }
    
    // Formato com 11 dígitos (DDD + número)
    if (cleaned.length === 11) {
      const areaCode = cleaned.slice(0, 2)
      const firstPart = cleaned.slice(2, 7)
      const secondPart = cleaned.slice(7)
      
      return `+55 (${areaCode}) ${firstPart}-${secondPart}`
    }
    
    // Se não conseguir formatar, retorna o valor original
    return phone
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-background">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Logo />
          </div>
        </header>

        <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Logo />
        </div>
      </header>

      <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8 text-center">
            {/* Success Icon */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>

            {/* Title */}
            <h1 className="mt-6 text-2xl font-bold tracking-tight">
              WhatsApp conectado com sucesso!
            </h1>
            
            {/* Description */}
            <p className="mt-2 text-muted-foreground">
              Tudo pronto! Seu restaurante já pode receber pedidos pelo WhatsApp.
            </p>

            {/* Phone Number Card */}
            <div className="mt-6 flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3 w-full">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success">
                <MessageCircle className="h-5 w-5 text-success-foreground" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium">Número conectado</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {formatPhone(instance?.phone_number)}
                </p>
              </div>
            </div>

            {/* Profile Name (se disponível) */}
            {instance?.profile_name && (
              <div className="mt-3 rounded-lg bg-accent/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Perfil: </span>
                <span className="font-medium text-foreground">
                  {instance.profile_name}
                </span>
              </div>
            )}

            {/* CTA Button */}
            <Button 
              className="mt-8 w-full" 
              onClick={() => router.push("/dashboard")}
            >
              Ir para o Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {/* Secondary Action */}
            <Button
              variant="ghost"
              className="mt-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => router.push("/onboarding/whatsapp")}
            >
              Ver detalhes da conexão
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}