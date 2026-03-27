import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/server/auth-request";
import { randomUUID } from "crypto";

/**
 * Resolves organization ID from request context
 * 
 * Priority order:
 * 1. User's org from authentication (authenticated routes)
 * 2. x-org-id header (legacy/manual override)
 * 3. Default seeded org (development stub mode)
 * 
 * @param request - Next.js request object
 * @returns organization ID
 * @throws Error if orgId cannot be resolved (unless in dev stub mode)
 */
export async function getOrgId(request: NextRequest): Promise<string> {
  console.log("[DEBUG] getOrgId called");
  
  // 1. Prefer authenticated user's org to avoid cross-org mismatches
  // caused by stale hardcoded x-org-id headers on client pages.
  const authUser = await getAuthUserFromRequest(request);
  console.log("[DEBUG] authUser:", authUser?.orgId);
  if (authUser?.orgId) {
    return authUser.orgId;
  }

  // 2. Fallback to x-org-id header (legacy/manual override)
  const orgIdHeader = request.headers.get("x-org-id");
  console.log("[DEBUG] x-org-id header:", orgIdHeader);
  if (orgIdHeader) {
    return orgIdHeader;
  }

  // 3. Development: no session/header — pick a stable org for local API use
  if (process.env.NODE_ENV !== "production") {
    const fromEnv = process.env.NEXT_PUBLIC_ORG_ID?.trim();
    console.log("[DEBUG] NEXT_PUBLIC_ORG_ID from env:", fromEnv);
    if (fromEnv) {
      try {
        const envOrg = await prisma.org.findUnique({ where: { id: fromEnv } });
        console.log("[DEBUG] Found env org:", envOrg?.id);
        if (envOrg) {
          console.log("Using NEXT_PUBLIC_ORG_ID for development:", envOrg.id);
          return envOrg.id;
        }
      } catch (e) {
        console.error("[DEBUG] Error finding env org:", e);
      }
    }

    try {
      let defaultOrg = await prisma.org.findFirst({
        where: { name: "Demo Workspace" },
      });
      console.log("[DEBUG] Demo Workspace org:", defaultOrg?.id);
      if (!defaultOrg) {
        defaultOrg = await prisma.org.findFirst({
          orderBy: { createdAt: "asc" },
        });
        console.log("[DEBUG] First org found:", defaultOrg?.id);
      }

      if (defaultOrg) {
        console.log("Using default org for development:", defaultOrg.id);
        return defaultOrg.id;
      }
    } catch (e) {
      console.error("[DEBUG] Error finding default org:", e);
    }
  }

  // 3. No org context found - reject request
  throw new Error("Organization context required. Please provide x-org-id header.");
}

/**
 * Middleware-like function to validate org context and return orgId
 * This can be used in any API route to ensure tenant safety
 */
export function withOrgContext<T extends unknown[]>(
  handler: (request: NextRequest, orgId: string, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const requestId = randomUUID();
    const routePath = new URL(request.url).pathname;
    const routeStart = performance.now();
    console.log(`[PERF] ${requestId} ${request.method} ${routePath} ROUTE_START 0.00ms`);
    
    try {
      const orgContextStart = performance.now();
      console.log(`[PERF] ${requestId} ${request.method} ${routePath} ORG_CONTEXT_START ${(orgContextStart - routeStart).toFixed(2)}ms`);
      
      const orgId = await getOrgId(request);
      
      const orgContextDone = performance.now();
      console.log(`[PERF] ${requestId} ${request.method} ${routePath} ORG_CONTEXT_DONE ${(orgContextDone - routeStart).toFixed(2)}ms`);
      
      // Add requestId to request headers for route handlers to use
      const requestWithId = new Request(request, {
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'x-request-id': requestId
        }
      }) as NextRequest;
      
      const response = await handler(requestWithId, orgId, ...args);
      
      const routeEnd = performance.now();
      console.log(`[PERF] ${requestId} ${request.method} ${routePath} ROUTE_DONE ${(routeEnd - routeStart).toFixed(2)}ms`);
      
      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Organization context required")) {
        const routeEnd = performance.now();
        console.log(`[PERF] ${requestId} ${request.method} ${routePath} ROUTE_DONE ${(routeEnd - routeStart).toFixed(2)}ms`);
        
        return new Response(
          JSON.stringify({ 
            error: "Organization context required",
            message: "Please provide x-org-id header"
          }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const message = error instanceof Error ? error.message : String(error);
      console.error("[withOrgContext]", error);
      
      const routeEnd = performance.now();
      console.log(`[PERF] ${requestId} ${request.method} ${routePath} ROUTE_DONE ${(routeEnd - routeStart).toFixed(2)}ms`);
      
      return NextResponse.json(
        {
          error: "Service unavailable",
          ...(process.env.NODE_ENV !== "production"
            ? { details: message }
            : { message: "Database or configuration error. Try again later." }),
        },
        { status: 503 }
      );
    }
  };
}

/**
 * Helper to get orgId and validate user belongs to the org
 * This combines org context resolution with user authorization
 */
export async function getOrgIdForUser(request: NextRequest, userId: string): Promise<string> {
  const orgId = await getOrgId(request);
  
  // Verify user belongs to this organization
  const membership = await prisma.orgMember.findFirst({
    where: {
      orgId,
      userId,
    },
  });
  
  if (!membership) {
    throw new Error("User is not a member of this organization");
  }
  
  return orgId;
}
