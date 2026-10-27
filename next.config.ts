import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Origins the browser may talk to directly. Supabase is called from the browser
// only with the publishable key under RLS; LiveKit and the sports provider are
// added here when those phases land.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const connectSrc = ["'self'", supabaseUrl, supabaseUrl.replace(/^http/, "ws")]
  .filter(Boolean)
  .join(" ");

// Static CSP without nonces so pages can still be prerendered with Cache
// Components. 'unsafe-inline' for scripts is a documented residual risk
// (docs/architecture/threat-model.md); revisit with SRI hash-based CSP.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${supabaseUrl}`.trim(),
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Microphone is needed for audio spaces (Phase 4) on our own origin only.
    value: "camera=(), geolocation=(), microphone=(self), payment=()",
  },
  ...(isDev
    ? []
    : [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // A stray lockfile in the home directory confuses root detection; pin it.
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
