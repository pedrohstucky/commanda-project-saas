import Link from "next/link"
import { Logo } from "@/components/logo"
import { LoginForm } from "@/components/login/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* LEFT SIDE (DESKTOP ONLY) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-foreground p-12 text-sidebar-foreground">
        <Logo className="text-sidebar-foreground dark" />

        <blockquote className="space-y-2 max-w-md">
          <p className="text-lg leading-relaxed text-muted">
            &ldquo;O Platoo revolucionou a forma como gerenciamos nossos pedidos.
            A integração com WhatsApp trouxe muito mais agilidade no atendimento.&rdquo;
          </p>
          <footer className="text-sm text-muted/70">
            Maria Santos — Chef e Proprietária, Bistrô Aconchego
          </footer>
        </blockquote>

        <p className="text-xs text-muted/50">
          © 2025 Platoo. Todos os direitos reservados.
        </p>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex w-full flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:w-1/2 lg:p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden">
            <Logo />
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Bem-vindo de volta
            </h1>
            <p className="text-muted-foreground">
              Entre com suas credenciais para acessar sua conta
            </p>
          </div>

          {/* Form */}
          <LoginForm />

          {/* Footer link */}
          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem uma conta?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
