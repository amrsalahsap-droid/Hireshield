/**
 * Optional `x-org-id` for browser fetch calls.
 * Set `NEXT_PUBLIC_ORG_ID` in `.env` to match an org row in your DB (see Prisma Studio or seed output).
 * If unset, APIs use your Clerk session org or the server dev fallback — omitting avoids wrong hardcoded IDs.
 */
export function orgFetchHeaders(): Record<string, string> {
  const id = process.env.NEXT_PUBLIC_ORG_ID?.trim();
  return id ? { "x-org-id": id } : {};
}
