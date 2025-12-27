/**
 * 📝 Sistema de Logging Profissional
 * 
 * Features:
 * - Logs apenas em desenvolvimento
 * - Estruturado para produção
 * - Integração com Sentry
 * - Tipos seguros
 */

import * as Sentry from "@sentry/nextjs"

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
  environment: string
}

interface LoggerOptions {
  enableInProduction?: boolean
  sendToSentry?: boolean
}

class Logger {
  private isDevelopment: boolean
  private options: LoggerOptions

  constructor(options: LoggerOptions = {}) {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.options = {
      enableInProduction: false,
      sendToSentry: process.env.NODE_ENV === 'production',
      ...options
    }
  }

  /**
   * Formata timestamp no formato ISO
   */
  private getTimestamp(): string {
    return new Date().toISOString()
  }

  /**
   * Cria entrada de log estruturada
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: unknown
  ): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: this.getTimestamp(),
      environment: process.env.NODE_ENV || 'unknown'
    }
  }

  /**
   * Envia log para Sentry
   */
  private sendToSentry(entry: LogEntry): void {
    if (!this.options.sendToSentry) return

    // Apenas erros e warnings vão para Sentry
    if (entry.level === 'error') {
      Sentry.captureException(new Error(entry.message), {
        level: 'error',
        extra: entry.data as Record<string, unknown>,
        tags: {
          timestamp: entry.timestamp,
        }
      })
    } else if (entry.level === 'warn') {
      Sentry.captureMessage(entry.message, {
        level: 'warning',
        extra: entry.data as Record<string, unknown>,
      })
    }
  }

  /**
   * 🔍 DEBUG: Informações detalhadas para desenvolvimento
   * Não aparece em produção
   */
  debug(message: string, data?: unknown): void {
    if (!this.isDevelopment) return

    const entry = this.createLogEntry('debug', message, data)
    
    console.log(
      `🔍 [DEBUG] ${entry.timestamp}`,
      message,
      data ?? ''
    )
  }

  /**
   * ℹ️ INFO: Informações gerais do sistema
   * Aparece em desenvolvimento, opcional em produção
   */
  info(message: string, data?: unknown): void {
    if (!this.isDevelopment && !this.options.enableInProduction) return

    const entry = this.createLogEntry('info', message, data)
    
    console.log(
      `ℹ️ [INFO] ${entry.timestamp}`,
      message,
      data ?? ''
    )
  }

  /**
   * ⚠️ WARN: Avisos que precisam atenção
   * Sempre aparece e envia para Sentry
   */
  warn(message: string, data?: unknown): void {
    const entry = this.createLogEntry('warn', message, data)
    
    console.warn(
      `⚠️ [WARN] ${entry.timestamp}`,
      message,
      data ?? ''
    )

    this.sendToSentry(entry)
  }

  /**
   * ❌ ERROR: Erros críticos
   * Sempre aparece e é enviado para Sentry
   */
  error(message: string, error?: unknown): void {
    const entry = this.createLogEntry('error', message, error)
    
    console.error(
      `❌ [ERROR] ${entry.timestamp}`,
      message,
      error ?? ''
    )

    this.sendToSentry(entry)
  }

  /**
   * 📊 Métricas e performance
   */
  metric(name: string, value: number, unit: string = 'ms'): void {
    if (!this.isDevelopment) return

    console.log(
      `📊 [METRIC] ${this.getTimestamp()}`,
      `${name}: ${value}${unit}`
    )
  }

  /**
   * ⏱️ Timer para medir performance
   */
  startTimer(label: string): () => void {
    if (!this.isDevelopment) {
      return () => {} // Noop em produção
    }

    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.metric(label, Math.round(duration))
    }
  }

  /**
   * 🎯 Log de evento (analytics)
   */
  event(eventName: string, properties?: Record<string, unknown>): void {
    if (!this.isDevelopment && !this.options.enableInProduction) return

    console.log(
      `🎯 [EVENT] ${this.getTimestamp()}`,
      eventName,
      properties || {}
    )
  }

  /**
   * 👤 Identificar usuário no Sentry
   */
  setUser(user: { id: string; email?: string; tenantId?: string }): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    })
    
    Sentry.setTag('tenant_id', user.tenantId || 'unknown')
  }

  /**
   * 🧹 Limpar dados do usuário
   */
  clearUser(): void {
    Sentry.setUser(null)
  }
}

/**
 * Instância global do logger
 */
export const logger = new Logger({
  enableInProduction: false,
  sendToSentry: process.env.NODE_ENV === 'production'
})

/**
 * Helper para logs de API
 */
export const apiLogger = {
  request(method: string, url: string, data?: unknown) {
    logger.debug(`API Request: ${method} ${url}`, data)
  },
  
  response(method: string, url: string, status: number, data?: unknown) {
    if (status >= 400) {
      logger.error(`API Error: ${method} ${url} - ${status}`, data)
    } else {
      logger.debug(`API Response: ${method} ${url} - ${status}`, data)
    }
  },
  
  error(method: string, url: string, error: unknown) {
    logger.error(`API Failed: ${method} ${url}`, error)
  }
}

/**
 * Helper para logs de Realtime
 */
export const realtimeLogger = {
  connect(channel: string) {
    logger.info(`Realtime connected: ${channel}`)
  },
  
  disconnect(channel: string) {
    logger.info(`Realtime disconnected: ${channel}`)
  },
  
  message(channel: string, event: string, payload?: unknown) {
    logger.debug(`Realtime message: ${channel}/${event}`, payload)
  },
  
  error(channel: string, error: unknown) {
    logger.error(`Realtime error: ${channel}`, error)
  }
}