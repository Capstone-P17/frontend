# Next.js frontend runbook

## Project structure

The frontend now uses a standard Next.js `src` layout:

- `src/app/` — App Router pages and limited Route Handlers
- `src/components/` — UI components
- `src/lib/server/` — server-only backend client and backend error handling
- `src/lib/view-models/` — backend-response-to-UI view models
- `tests/` — Vitest regression and architecture-boundary tests

The previous Python/Streamlit frontend files have been removed from this frontend package.

## Cookie topology

The backend currently sets `access_token` and `github_oauth_state` as HttpOnly host-only cookies unless a deployment adds an explicit cookie Domain. Next.js can only forward cookies that the browser sends to the Next origin.

Supported deployment patterns:

1. Same-origin reverse proxy: route Next and backend under one origin so host-only cookies are sent to Next.
2. Shared parent domain: add backend cookie Domain (for example `.example.com`) and verify Secure/SameSite policy for frontend/backend subdomains.
3. Local dev: backend CORS allows `http://localhost:3000` with credentials, but Secure cookies may require HTTPS or a development `Secure=false` override.

## Route Handler allowlist

Route Handlers are intentionally limited to browser same-origin actions:

- `POST /api/auth/logout`
- `POST /api/analysis/jobs`
- `GET /api/analysis/jobs/[id]`
- `POST /api/analysis/results/[id]/refresh` (optional refresh action)

Do not add generic API proxy endpoints without revisiting the architecture decision.

## Cutover and rollback

The active frontend is the Next.js app. Roll back traffic at the deployment/router layer if OAuth callback/session, cookie delivery, job creation/polling, dashboard/result reads, or legacy redirects fail in staging/production.
