# Next.js frontend runbook

## Project structure

The frontend uses a standard Next.js `src` layout:

- `src/app/` — App Router pages. These pages are static shells that delegate runtime auth/data loading to Client Components.
- `src/components/` — UI and page-level Client Components.
- `src/lib/client/` — browser-side backend client. It sends credentialed requests to the deployed backend origin.
- `src/lib/server/` — legacy server-only backend client kept for architecture tests/backward compatibility, but authenticated pages must not depend on it for deployed Vercel/static flows.
- `src/lib/view-models/` — backend-response-to-UI view models shared by client-rendered pages.
- `tests/` — Vitest regression and architecture-boundary tests.

The previous Python/Streamlit frontend files have been removed from this frontend package.

## Static deployment constraints

The current deployment target behaves like a static frontend. Do not rely on Next.js server runtime features for app functionality:

- No `/app/api` or `/pages/api` route handlers.
- No SSR-based authentication checks.
- No Server Actions.
- No runtime-only environment variables for browser-visible configuration.

`pnpm build` should show the app routes as static (`○`) and should not list `/api/*` routes.

## Backend URL configuration

Use the Next.js public build-time environment variable:

```env
NEXT_PUBLIC_BACKEND_BASE_URL=https://p17api.iosif.dev
```

This is intentionally `NEXT_PUBLIC_*` because the browser must know the backend origin for GitHub login, auth checks, job creation, polling, logout, and result loading.

Do not reintroduce `BACKEND_BASE_URL` for browser-visible backend links. It is not a Next.js public env convention and will not be available to Client Components unless separately exposed.

## Auth and cookie topology

Current production topology:

```text
Frontend: https://frontend-nu-jet-90.vercel.app
Backend:  https://p17api.iosif.dev
Cookie:   p17_auth on p17api.iosif.dev
```

The backend sets an HttpOnly cookie similar to:

```http
Set-Cookie: p17_auth=...; HttpOnly; Max-Age=3600; Path=/; SameSite=None; Secure
```

Because the cookie belongs to `p17api.iosif.dev`, the Vercel/Next server for `frontend-nu-jet-90.vercel.app` cannot read it with `cookies()` or `headers()`. Therefore authenticated pages must not call `/auth/me` from Server Components.

The supported deployed flow is:

1. Browser opens `${NEXT_PUBLIC_BACKEND_BASE_URL}/auth/github`.
2. Backend completes GitHub OAuth and sets the HttpOnly `p17_auth` cookie on the backend domain.
3. Backend redirects to the frontend callback/home URL.
4. Frontend Client Components call backend APIs directly with:

```ts
fetch(`${NEXT_PUBLIC_BACKEND_BASE_URL}/auth/me`, {
  credentials: 'include',
  cache: 'no-store',
});
```

Browser JavaScript still must never read, store, or expose the JWT value. It only sends credentialed requests; the HttpOnly cookie remains inaccessible to JS.

## Required backend production settings

For the deployed split-origin setup, backend settings must align with the frontend domain:

```env
FRONTEND_AUTH_CALLBACK_URL=https://frontend-nu-jet-90.vercel.app/?auth=success
GITHUB_REDIRECT_URI=https://p17api.iosif.dev/auth/github/callback
AUTH_COOKIE_NAME=p17_auth
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=none
```

Backend CORS must allow credentialed browser requests from the frontend origin:

```text
Access-Control-Allow-Origin: https://frontend-nu-jet-90.vercel.app
Access-Control-Allow-Credentials: true
```

Do not use `Access-Control-Allow-Origin: *` with credentials.

## Client data flow

Authenticated app routes are static wrappers that render Client Components:

- `/` → `HomeClient`
- `/login` → `LoginClient`
- `/auth/callback` → `AuthCallbackClient`
- `/loading` → `LoadingPageClient` + `LoadingClient`
- `/dashboard` → `DashboardClient`
- `/analysis` → `AnalysisClient`

The browser-side backend client lives in `src/lib/client/backend.ts` and calls the backend with `credentials: 'include'` and `cache: 'no-store'`.

Repository analysis flow:

1. `/loading?repo=...` checks `/auth/me` from the browser.
2. It starts a job with `POST /analyze/repository/jobs`.
3. It redirects internally to `/loading?repo=...&job_id=...`.
4. `LoadingClient` polls `GET /analyze/jobs/{job_id}` every 2 seconds.
5. On success, it navigates to `/dashboard?repo=...&analysis_id=...`.
6. Dashboard/detail pages fetch `GET /result/{analysis_id}` and `GET /results` from the browser.

## Route Handler policy

There are currently no Next.js Route Handlers under `/app/api`.

Do not add generic API proxy/BFF endpoints. If a server runtime is intentionally reintroduced later, document the deployment topology first and update the architecture tests.

## Local development notes

For local HTTP development, use matching origins and cookie settings that browsers will accept. Example:

```env
# frontend/.env
NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8000

# backend/.env
FRONTEND_AUTH_CALLBACK_URL=http://localhost:3000/?auth=success
GITHUB_REDIRECT_URI=http://localhost:8000/auth/github/callback
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAMESITE=lax
```

If testing with IP addresses such as `http://10.8.0.4:3000`, keep frontend, backend, OAuth callback, and GitHub OAuth app URLs consistent with those hosts.

## Troubleshooting auth

If login reaches GitHub but the frontend shows an authentication error:

1. In DevTools Network, inspect `https://p17api.iosif.dev/auth/github/callback`.
2. Confirm `Set-Cookie: p17_auth=...; HttpOnly; SameSite=None; Secure` is present.
3. In DevTools Application, check cookies for `https://p17api.iosif.dev`, not the Vercel frontend domain.
4. If the cookie is blocked, check the browser blocked reason, `SameSite=None`, `Secure`, and CORS credentials settings.
5. If the cookie exists but API calls fail, confirm frontend requests use `credentials: 'include'` and `NEXT_PUBLIC_BACKEND_BASE_URL` points at the deployed backend.

## Cutover and rollback

The active frontend is the Next.js app. Roll back traffic at the deployment/router layer if OAuth callback/session, cookie delivery, job creation/polling, dashboard/result reads, or legacy redirects fail in staging/production.
