"use client"

import Link from "next/link"
import { useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import {
  MessageSquare,
  Smartphone,
  BarChart3,
  Zap,
  CheckCircle2,
  ArrowRight,
  UtensilsCrossed,
  Clock,
  Users,
} from "lucide-react"

export default function LandingPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  // =====================================================
  // CHECK AUTH (REDIRECT SE LOGADO)
  // =====================================================
  const checkAuth = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        router.replace("/dashboard")
      }
    } catch (error) {
      console.error("Erro ao verificar auth:", error)
    }
  }, [router, supabase])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Recursos
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
              Como funciona
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Preços
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent via-background to-background" />
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm">
              <Zap className="h-4 w-4 text-primary" />
              <span>Pedidos via WhatsApp simplificados</span>
            </div>
            <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Gerencie pedidos do seu restaurante com{" "}
              <span className="text-green-700">WhatsApp</span>
            </h1>
            <p className="mb-8 text-pretty text-lg text-muted-foreground md:text-xl">
              Receba pedidos diretamente no WhatsApp do seu restaurante,
              gerencie tudo em um painel intuitivo e aumente suas vendas.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">
                  Começar gratuitamente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#how-it-works">Ver demonstração</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Sem cartão de crédito. Teste grátis por 14 dias.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "500+", label: "Restaurantes ativos" },
              { value: "50mil", label: "Pedidos processados" },
              { value: "98%", label: "Taxa de satisfação" },
              { value: "3min", label: "Tempo médio de resposta" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Tudo que você precisa para gerenciar pedidos
            </h2>
            <p className="text-muted-foreground">
              Uma plataforma completa para receber, organizar e acompanhar todos
              os pedidos do seu restaurante.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: MessageSquare,
                title: "Integração WhatsApp",
                description:
                  "Conecte seu WhatsApp Business e receba pedidos automaticamente pelo aplicativo que seus clientes já usam.",
              },
              {
                icon: UtensilsCrossed,
                title: "Kanban de Pedidos",
                description:
                  "Visualize e gerencie pedidos em um quadro intuitivo: novos, em preparo, prontos e finalizados.",
              },
              {
                icon: BarChart3,
                title: "Métricas em Tempo Real",
                description:
                  "Acompanhe vendas, pedidos mais populares e performance do seu restaurante em dashboards claros.",
              },
              {
                icon: Smartphone,
                title: "Cardápio Digital",
                description:
                  "Crie e gerencie seu cardápio digital com categorias, preços e disponibilidade em tempo real.",
              },
              {
                icon: Users,
                title: "Gestão de Equipe",
                description:
                  "Adicione usuários com diferentes níveis de acesso: administradores, gerentes e atendentes.",
              },
              {
                icon: Clock,
                title: "Histórico Completo",
                description:
                  "Acesse o histórico de todos os pedidos, clientes e interações para melhorar seu atendimento.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border bg-card p-6 transition-colors hover:border-primary/50"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-muted/30 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Comece em 3 passos simples
            </h2>
            <p className="text-muted-foreground">
              Configure sua conta e comece a receber pedidos em minutos.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Crie sua conta",
                description:
                  "Cadastre seu restaurante com informações básicas e escolha seu plano.",
              },
              {
                step: "02",
                title: "Conecte o WhatsApp",
                description:
                  "Escaneie o QR Code para vincular seu WhatsApp Business à plataforma.",
              },
              {
                step: "03",
                title: "Receba pedidos",
                description:
                  "Pronto! Seus clientes podem fazer pedidos pelo WhatsApp e você gerencia tudo no painel.",
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                {index < 2 && (
                  <div className="absolute left-1/2 top-12 hidden h-px w-full bg-border md:block" />
                )}
                <div className="relative flex flex-col items-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Planos simples e transparentes
            </h2>
            <p className="text-muted-foreground">
              Escolha o plano ideal para o tamanho do seu negócio.
            </p>
          </div>

          {/* GRID RESPONSIVO */}
          <div className="mx-auto grid max-w-6xl gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Starter Plan */}
            <div className="rounded-xl border bg-card p-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Starter</h3>
                <p className="text-sm text-muted-foreground">
                  Para pequenos restaurantes
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">R$ 57</span>
                <span className="text-muted-foreground">/mês</span>
              </div>

              <ul className="mb-8 space-y-3">
                {[
                  "Até 80 pedidos/mês",
                  "Usuário adicional",
                  "Integração WhatsApp",
                  "Cardápio digital",
                  "Métricas Básicas",
                  "Suporte por email",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                className="w-full bg-transparent"
                asChild
              >
                <Link href="/register">Começar teste grátis</Link>
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-xl border-2 border-primary bg-card p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                Mais popular
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold">Pro</h3>
                <p className="text-sm text-muted-foreground">
                  Para restaurantes em crescimento
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">R$ 127</span>
                <span className="text-muted-foreground">/mês</span>
              </div>

              <ul className="mb-8 space-y-3">
                {[
                  "Até 200 pedidos/mês",
                  "5 usuários",
                  "Integração WhatsApp",
                  "Cardápio digital",
                  "Métricas avançadas",
                  "Suporte por WhatsApp",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button className="w-full" asChild>
                <Link href="/register">Começar teste grátis</Link>
              </Button>
            </div>

            {/* Premium Plan */}
            <div className="relative rounded-xl border-2 bg-card p-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Premium</h3>
                <p className="text-sm text-muted-foreground">
                  Para restaurantes de grande porte
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">R$ 297</span>
                <span className="text-muted-foreground">/mês</span>
              </div>

              <ul className="mb-8 space-y-3">
                {[
                  "Pedidos ilimitados",
                  "10 usuários",
                  "Integração WhatsApp",
                  "Cardápio digital",
                  "Métricas Completas",
                  "Suporte prioritário",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                className="w-full bg-transparent"
                asChild
              >
                <Link href="/register">Começar teste grátis</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Pronto para transformar seu restaurante?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
            Junte-se a centenas de restaurantes que já usam o Commanda para
            gerenciar pedidos de forma mais eficiente.
          </p>
          <Button size="lg" asChild>
            <Link href="/register">
              Criar conta gratuita
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Logo />
            <nav className="flex flex-wrap items-center justify-center gap-6">
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Termos de uso
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Privacidade
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Contato
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              © 2025 Commanda. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
