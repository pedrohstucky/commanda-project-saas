'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    restaurantName: '',
    email: '',
    password: ''
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta')
      }

      if (data.data?.credentials) {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: data.data.credentials.email,
            password: data.data.credentials.password
          })

        if (signInError) {
          throw new Error(
            'Conta criada, mas não foi possível fazer login automaticamente.'
          )
        }

        await new Promise(resolve => setTimeout(resolve, 500))
      }

      router.push('/onboarding/whatsapp')
      router.refresh()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro inesperado ao criar conta')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-foreground p-12 text-sidebar-foreground">
        <Logo className="text-sidebar-foreground dark" />

        <blockquote className="space-y-2 max-w-md">
          <p className="text-lg leading-relaxed text-muted">
            {'"'}O Platoo revolucionou a forma como gerenciamos nossos pedidos.
            A integração com WhatsApp trouxe muito mais agilidade no atendimento.{'"'}
          </p>
          <footer className="text-sm text-muted/70">
            Maria Santos — Chef e Proprietária, Bistrô Aconchego
          </footer>
        </blockquote>

        <p className="text-xs text-muted/50">
          © 2025 Platoo. Todos os direitos reservados.
        </p>
      </div>

      {/* Form */}
      <div className="flex w-full flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:w-1/2 lg:p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden">
            <Logo />
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Criar sua conta
            </h1>
            <p className="text-muted-foreground">
              Configure seu restaurante em poucos minutos
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Seu nome</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={e =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Nome do restaurante
              </label>
              <input
                type="text"
                required
                value={formData.restaurantName}
                onChange={e =>
                  setFormData({
                    ...formData,
                    restaurantName: e.target.value
                  })
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Senha</label>
              <input
                type="password"
                minLength={8}
                required
                value={formData.password}
                onChange={e =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
