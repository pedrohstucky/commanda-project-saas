import Link from "next/link"
import { Logo } from "@/components/logo"
import { LoginForm } from "@/components/login/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar com Depoimento */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-sidebar p-12 text-sidebar-foreground">
        <Logo className="text-sidebar-foreground dark" />
        <div>
          <blockquote className="space-y-2">
            <p className="text-lg leading-relaxed">
              "O Commanda revolucionou a forma como gerenciamos nossos pedidos. A integração com WhatsApp trouxe muito
              mais agilidade no atendimento."
            </p>
            <footer className="text-sm text-sidebar-foreground/70">
              Maria Santos — Chef e Proprietária, Bistrô Aconchego
            </footer>
          </blockquote>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          © 2025 Commanda. Todos os direitos reservados.
        </p>
      </div>

      {/* Formulário de Login */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>
          
          <div className="space-y-2 items-center justify-center">
            <h1 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h1>
            <p className="text-muted-foreground">
              Entre com suas credenciais para acessar sua conta
            </p>
          </div>

          <LoginForm />

          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem uma conta?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}