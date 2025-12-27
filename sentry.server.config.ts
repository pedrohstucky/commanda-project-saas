// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: Reduzir em produção
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Segurança: Desabilitar logs em produção
  enableLogs: process.env.NODE_ENV === 'development',

  // Segurança: NUNCA enviar PII
  sendDefaultPii: false,

  // Ambiente
  environment: process.env.NODE_ENV,

  // Filtrar dados sensíveis
  beforeSend(event) {
    // Remover headers sensíveis
    if (event.request?.headers) {
      const headers = event.request.headers as Record<string, string>
      delete headers['authorization']
      delete headers['Authorization']
      delete headers['cookie']
      delete headers['Cookie']
      delete headers['x-api-key']
      delete headers['x-instance-token']
    }

    // Remover query params sensíveis
    if (event.request?.query_string) {
      // query_string pode ser string ou array
      if (typeof event.request.query_string === 'string') {
        event.request.query_string = event.request.query_string.replace(
          /token=[^&]*/gi,
          'token=REDACTED'
        )
      }
    }

    // Filtrar URL
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]*/gi, 'token=REDACTED')
    }

    return event
  },

  // Ignorar rotas de healthcheck
  ignoreTransactions: [
    '/api/health',
    '/api/ping',
  ],
});