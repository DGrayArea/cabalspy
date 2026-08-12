import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fixes Vercel multi-lockfile warning and ensures correct dep tracing
  outputFileTracingRoot: path.join(__dirname),

  // Production optimizations
  compress: true,
  poweredByHeader: false,

  // Suppress verbose dev-server request timing logs (GET /api/... 200 in Xms)
  logging: {
    fetches: {
      fullUrl: false,
      hmrRefreshes: false,
    },
  },

  // Explicitly mark OpenTelemetry instrumentation hooks as external packages for Turbopack & Sentry
  serverExternalPackages: ["import-in-the-middle", "require-in-the-middle"],

  compiler: {
    // Strip console.log/info/debug from production builds. Several call sites
    // print wallet objects, balances and trade payloads, which should not land
    // in browser consoles or server logs. error/warn are kept so real failures
    // still surface (and still reach Sentry). Dev builds are untouched.
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  
  // Performance optimizations
  reactStrictMode: true,

  // Tree-shake icon libraries to reduce first-load JS
  experimental: {
    optimizePackageImports: ["lucide-react", "@heroicons/react"],
  },
  
  // Builds fail on real problems. The codebase is currently clean: 0 type
  // errors and 0 ESLint errors (warnings do not fail a build), so leaving
  // these suppressed only risked shipping breakage nobody saw.
  eslint: {
    ignoreDuringBuilds: false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        // Allow http sources (e.g. raw IP:port from pump.fun metadata)
        protocol: 'http',
        hostname: '**',
        port: '*',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: '*.ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
      },
      {
        protocol: 'http',
        hostname: '93.205.10.67',
        port: '4141',
      },
    ],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // Performance headers
          {
            key: 'Connection',
            value: 'keep-alive'
          },
        ],
      },
    ];
  },

  // WebSocket proxy for development (if needed)
  async rewrites() {
    return [];
  },
};

import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
});
