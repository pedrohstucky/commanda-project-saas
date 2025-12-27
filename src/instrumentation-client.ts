// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mascarar dados sensíveis
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Performance: Reduzir em produção
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Segurança: Desabilitar logs em produção
  enableLogs: process.env.NODE_ENV === 'development',

  // Replay: Apenas erros em produção
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Segurança: NUNCA enviar PII
  sendDefaultPii: false,

  // Ambiente
  environment: process.env.NODE_ENV,

  // Filtrar dados sensíveis
  beforeSend(event) {
    if (event.request?.cookies) {
      event.request.cookies = {}
    }

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

    // Filtrar URLs com tokens
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]*/gi, 'token=REDACTED')
      event.request.url = event.request.url.replace(/api[_-]?key=[^&]*/gi, 'apikey=REDACTED')
    }

    // Filtrar breadcrumbs sensíveis
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data?.url) {
          breadcrumb.data.url = breadcrumb.data.url.replace(/token=[^&]*/gi, 'token=REDACTED')
        }
        return breadcrumb
      })
    }

    return event
  },

  // Ignorar erros comuns
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'chrome-extension://',
    'moz-extension://',
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;