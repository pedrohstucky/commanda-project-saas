import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { randomBytes } from 'crypto'

/**
 * Merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gera API Key única para tenant
 */
export function generateApiKey(tenantId: string): string {
  const prefix = tenantId.slice(0, 8)
  const random = randomBytes(16).toString('hex')
  return `tenant_${prefix}_${random}`
}

/**
 * Formata valores monetários
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formata número de telefone
 */
export function formatPhone(phone: string): string {
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '')
  
  // Formato: +55 11 99999-9999
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
  }
  
  return phone
}

/**
 * Gera token único para instância Uazapi
 */
export function generateInstanceToken(): string {
    return randomBytes(32).toString('hex')
  }
  
  /**
   * Gera nome de instância baseado no tenant
   */
  export function generateInstanceName(tenantId: string): string {
    // Formato: restaurant_abc12345
    const shortId = tenantId.slice(0, 8).toLowerCase()
    return `restaurant_${shortId}`
  }