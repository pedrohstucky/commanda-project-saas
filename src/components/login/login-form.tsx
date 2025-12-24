"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

export function LoginForm() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    console.log('🔐 [Login] Iniciando processo de login')
    console.log('📧 [Login] Email:', email)

    try {
      // Validações básicas
      if (!email || !password) {
        console.log('❌ [Login] Campos vazios')
        setError("Preencha todos os campos")
        setIsLoading(false)
        return
      }

      console.log('✅ [Login] Validações básicas OK')
      console.log('🔄 [Login] Chamando supabase.auth.signInWithPassword...')

      // Login com Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      })

      console.log('📦 [Login] Resposta do Supabase:')
      console.log('  - data:', data)
      console.log('  - error:', authError)

      if (authError) {
        console.error('❌ [Login] Erro de autenticação:', authError.message)
        console.error('❌ [Login] Código:', authError.status)
        console.error('❌ [Login] Nome:', authError.name)
        
        // Mensagens de erro mais amigáveis
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.')
        } else if (authError.message.includes('Invalid')) {
          setError('Credenciais inválidas')
        } else {
          setError(`Erro ao fazer login: ${authError.message}`)
        }
        
        setIsLoading(false)
        return
      }

      if (!data) {
        console.error('❌ [Login] Data é null')
        setError('Erro ao fazer login. Tente novamente.')
        setIsLoading(false)
        return
      }

      if (!data.user) {
        console.error('❌ [Login] User é null')
        setError('Erro ao fazer login. Tente novamente.')
        setIsLoading(false)
        return
      }

      if (!data.session) {
        console.error('❌ [Login] Session é null')
        setError('Erro ao criar sessão. Tente novamente.')
        setIsLoading(false)
        return
      }

      console.log('✅ [Login] Autenticação OK')
      console.log('👤 [Login] User ID:', data.user.id)
      console.log('📧 [Login] Email:', data.user.email)
      console.log('🔑 [Login] Session:', data.session ? 'OK' : 'MISSING')

      // Verificar se o usuário tem um profile (tenant)
      console.log('🔄 [Login] Buscando profile...')
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, full_name')
        .eq('id', data.user.id)
        .single()

      console.log('📦 [Login] Resposta do profile:')
      console.log('  - profile:', profile)
      console.log('  - error:', profileError)

      if (profileError) {
        console.error('❌ [Login] Erro ao buscar profile:', profileError.message)
        setError('Perfil não encontrado. Entre em contato com o suporte.')
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      if (!profile) {
        console.error('❌ [Login] Profile é null')
        setError('Perfil não encontrado. Entre em contato com o suporte.')
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      console.log('✅ [Login] Profile encontrado')
      console.log('🏢 [Login] Tenant ID:', profile.tenant_id)
      console.log('👤 [Login] Nome:', profile.full_name)

      // Pequeno delay para garantir que a sessão foi salva nos cookies
      console.log('⏳ [Login] Aguardando 500ms...')
      await new Promise(resolve => setTimeout(resolve, 500))

      // Sucesso! Redirecionar para dashboard
      console.log('✅ [Login] Login completo!')
      console.log('➡️ [Login] Redirecionando para /dashboard')
      
      router.push('/dashboard')
      router.refresh()

    } catch (error) {
      console.error('❌ [Login] CATCH - Erro inesperado:', error)
      console.error('❌ [Login] CATCH - Tipo:', typeof error)
      console.error('❌ [Login] CATCH - Stack:', error instanceof Error ? error.stack : 'N/A')
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(`Erro inesperado: ${errorMessage}`)
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => router.push('/forgot-password')}
          >
            Esqueceu a senha?
          </button>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Entrando...
          </>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  )
}