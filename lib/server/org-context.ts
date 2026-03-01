import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Resolves organization ID from request context
 * 
 * Priority order:
 * 1. x-org-id header (production)
 * 2. User's org from authentication (authenticated routes)
 * 3. Default seeded org (development stub mode)
 * 
 * @param request - Next.js request object
 * @returns organization ID
 * @throws Error if orgId cannot be resolved (unless in dev stub mode)
 */
export async function getOrgId(request: NextRequest): Promise<string> {
  // 1. Check for x-org-id header (primary method for API calls)
  const orgIdHeader = request.headers.get("x-org-id");
  if (orgIdHeader) {
    return orgIdHeader;
  }

  // 2. Check if we're in development stub mode
  if (process.env.NODE_ENV !== "production") {
    // Use the default seeded org for development
    const defaultOrg = await prisma.org.findFirst({
      where: { name: "Demo Workspace" },
    });
    
    if (defaultOrg) {
      console.log("Using default demo org for development:", defaultOrg.id);
      return defaultOrg.id;
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
    try {
      const orgId = await getOrgId(request);
      return await handler(request, orgId, ...args);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Organization context required")) {
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
      
      // Re-throw other errors
      throw error;
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
