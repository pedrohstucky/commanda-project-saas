import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gutrloszuclhrlrpfhyo.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

// Configuração Sentry
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Apenas logs em CI
  silent: !process.env.CI,

  // Upload de source maps
  widenClientFileUpload: true,

  // Tunnel para contornar ad-blockers
  tunnelRoute: "/monitoring",

  webpack: {
    // Monitores Vercel Cron
    automaticVercelMonitors: true,

    // Tree-shaking para reduzir bundle
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

// Aplicar Sentry apenas se DSN estiver configurado
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;