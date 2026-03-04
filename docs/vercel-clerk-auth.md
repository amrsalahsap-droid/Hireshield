# Vercel + Clerk: MIDDLEWARE_INVOCATION_FAILED

## What’s going on

- **With Clerk middleware enabled** (`clerkMiddleware()` in `middleware.ts`): Vercel returns **500 INTERNAL_SERVER_ERROR** with `Code: MIDDLEWARE_INVOCATION_FAILED`. That usually means something in Clerk’s middleware (or its dependencies) is not compatible with Vercel’s Edge runtime.
- **With Clerk middleware disabled**: The app no longer 500s, but `auth()` in Server Components throws because Clerk expects its middleware to run. So after sign-in, the dashboard shows a friendly “We couldn’t verify your session” message instead of the real dashboard.

So you’re in a loop: enable middleware → 500; disable middleware → no server-side auth on Vercel.

## Current setup (to stop the 500 loop)

- **Middleware**: Clerk is **disabled** in `middleware.ts`. The file just does `NextResponse.next()` so the app never hits the failing Clerk middleware on Vercel.
- **Dashboard**: When the server can’t verify the session (e.g. on Vercel), it shows an explanation and a “Sign in again” link instead of crashing.

So: **deployments on Vercel no longer 500**, but the dashboard there won’t show your data until auth works (see below).

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

| Goal                         | Action |
|-----------------------------|--------|
| Stop 500s and get out of the loop | Middleware stays **disabled** (current state). Deploy; no more MIDDLEWARE_INVOCATION_FAILED. |
| Use dashboard “for real”     | Use **local** `npm run dev`, or fix Clerk on Vercel and re-enable `clerkMiddleware()`. |

Once Clerk middleware runs successfully on Vercel, re-enable it in `middleware.ts` and the dashboard will work there too.
