// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
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
});