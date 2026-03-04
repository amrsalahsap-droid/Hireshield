# Vercel + Clerk: MIDDLEWARE_INVOCATION_FAILED

## What’s going on

- **With Clerk middleware enabled** (`clerkMiddleware()` in `middleware.ts`): Vercel returns **500 INTERNAL_SERVER_ERROR** with `Code: MIDDLEWARE_INVOCATION_FAILED`. That usually means something in Clerk’s middleware (or its dependencies) is not compatible with Vercel’s Edge runtime.
- **With Clerk middleware disabled**: The app no longer 500s, but `auth()` in Server Components throws because Clerk expects its middleware to run.

So: enable middleware → 500; disable middleware → we use **request-based auth** instead (see below).

## Request-based auth (no middleware)

The dashboard and `/api/me` do **not** use Clerk’s Next.js middleware. They use **request-based auth** via the Clerk Backend SDK:

- **`GET /api/dashboard`** and **`GET /api/me`** call `getAuthUserFromRequest(request)` in [lib/server/auth-request.ts](lib/server/auth-request.ts).
- That uses Clerk’s `authenticateRequest(request)` to read the session from cookies and verify the JWT. No `clerkMiddleware()` is required, so the app works on Vercel without the Edge 500.

### Env vars that affect request-based auth

| Variable | Required | Description |
|----------|----------|-------------|
| `CLERK_SECRET_KEY` | Yes | Clerk secret key from Dashboard → API Keys. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key. |
| `VERCEL_URL` | No (auto) | Set by Vercel; used to build allowed origins for JWT `azp` check. |
| `NEXT_PUBLIC_APP_URL` | No | Your app’s canonical URL (e.g. `https://hireshield-xi.vercel.app`). If set, added to allowed origins. |
| `CLERK_JWT_KEY` | No | PEM public key from Clerk Dashboard → API Keys → “JWT public key”. Enables networkless verification; recommended for reliability. |

### Troubleshooting “We couldn’t verify your session”

If the dashboard still shows “We couldn’t verify your session” after sign-in:

1. **Check Vercel function logs**  
   When auth fails, the API logs `Clerk auth failed: <reason> <message>`. Look for that line to see whether the failure is e.g. `session-token-missing`, an authorized-party mismatch, or something else.

2. **Allowed origins**  
   Ensure your app’s URL is allowed by Clerk. The code allows: request origin, `https://${VERCEL_URL}`, `https://${VERCEL_BRANCH_URL}`, and `NEXT_PUBLIC_APP_URL`. If you use a custom domain, set `NEXT_PUBLIC_APP_URL` to that URL (e.g. `https://app.example.com`).

3. **Clerk Dashboard**  
   In Clerk Dashboard, confirm your production (and preview) domains are in the allowed redirect/origin settings for the application.

## Current setup (middleware disabled)

- **Middleware**: Clerk is **disabled** in `middleware.ts`. The file just does `NextResponse.next()` so the app never hits the failing Clerk middleware on Vercel.
- **Dashboard**: Loads data via `GET /api/dashboard`, which uses request-based auth. If the session cookie is valid and allowed origins match, the dashboard shows data; otherwise it shows “Sign in again”.

## How to get out of the loop

Pick one of these directions.

### 1. Run the app locally (works today)

With middleware **disabled**, server-side `auth()` still fails on Vercel, but it can work locally:

```bash
npm run dev
```

Use the app at `http://localhost:3000`. Sign in and use the dashboard as normal. No 500, no loop.

### 2. Fix Clerk middleware on Vercel (best long-term)

Goal: get `clerkMiddleware()` running on Vercel without `MIDDLEWARE_INVOCATION_FAILED`.

- **Env vars**  
  In the Vercel project, set:
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`  
  Redeploy after changing env vars.

- **Clerk / Next.js versions**  
  Upgrade to supported versions and try again:
  - [Clerk Next.js docs](https://clerk.com/docs/references/nextjs/overview)
  - [Next.js middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

- **Ask Clerk / Vercel**  
  If it still 500s, share:
  - Full error: `500 INTERNAL_SERVER_ERROR`, `Code: MIDDLEWARE_INVOCATION_FAILED`, and the `ID` (e.g. `fra1::...`).
  - That Clerk middleware runs on the **Edge** runtime and fails only on Vercel.  
  Clerk: [Discord](https://clerk.com/discord) or [Support](https://clerk.com/support).  
  Vercel: check the deployment’s **Functions** tab for the failing middleware and any stack trace.

- **Re-enable middleware after it works**  
  When Clerk/Vercel confirm a fix (or you find a version/config that works), switch `middleware.ts` back to `clerkMiddleware()` and redeploy. Then the dashboard on Vercel should work with `auth()`.

### 3. Use a different host for the app (optional)

If you need the dashboard in production and can’t fix Edge yet, run the app on a Node server instead of Vercel Edge (e.g. Vercel with Node runtime for the app, or another host). Middleware may behave differently there; we’ve only seen the failure on Vercel Edge.

## Summary

| Goal | Action |
|------|--------|
| Stop 500s | Middleware stays **disabled**. Deploy; no more MIDDLEWARE_INVOCATION_FAILED. |
| Use dashboard on Vercel | Request-based auth is used: `/api/dashboard` and `/api/me` verify the session via `authenticateRequest(request)`. Set env vars above; ensure allowed origins match where users sign in. |
| Use dashboard locally | Run `npm run dev`; same request-based auth applies. |
| Re-enable middleware later | If you get Clerk middleware working on Vercel Edge, switch `middleware.ts` back to `clerkMiddleware()` and the dashboard will continue to work (server components could use `auth()` again if desired). |
