# 0004 — Cache Components on; static CSP without nonces

- Status: accepted
- Date: 2026-10-27

## Context

Next.js 16 scaffolds with `cacheComponents` and `partialPrefetching` enabled. With these, reading cookies or request-time URL data outside `<Suspense>` is a build error. Nonce-based CSP requires fully dynamic rendering, which is incompatible with prerendered static shells.

## Decision

- Keep Cache Components on. Layouts and pages render a static shell; session-dependent parts (`requireViewer()`, `usePathname()` on dynamic routes, `useSearchParams()`) stream in behind `<Suspense>` with skeleton fallbacks.
- Use a static CSP from `next.config.ts` headers: `script-src 'self' 'unsafe-inline'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, and `connect-src` limited to self and Supabase.

## Consequences

- Fast first paint and instant navigations for the app shell.
- Inline scripts are allowed by CSP. This is a residual XSS-hardening gap, mitigated by React escaping and no raw HTML rendering. Evaluate experimental SRI hash-based CSP before launch.
- New external origins (LiveKit, the sports CDN) must be added to `connect-src`/`media-src` explicitly.
