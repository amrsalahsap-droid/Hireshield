/**
 * Route-Level AI Logging
 * Integrates AI logging layer with route-specific context for development visibility
 */

import { aiLogger } from "@/lib/ai/logging";
import { AIError } from "@/lib/ai/errors";

// Route-specific logging context
interface RouteAILogContext {
  routeName: string;
  operation: 'analyzeJD' | 'generateInterviewKit' | 'generateCandidateSignals';
  requestId: string;
  orgId: string;
  startTime: number;
}

// Safe payload logging (filters sensitive information)
function sanitizePayload(payload: any): any {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const sanitized = { ...payload };
  
  // Filter out potentially sensitive fields
  const sensitiveFields = [
    'apiKey', 'api_key', 'token', 'secret', 'password',
    'authorization', 'auth', 'credential', 'key'
  ];
  
  const filterSensitive = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(filterSensitive);
    }
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
      
      if (isSensitive) {
        result[key] = '***';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = filterSensitive(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };
  
  return filterSensitive(sanitized);
}

// Log route-specific AI operation start
export function logRouteAIStart(context: RouteAILogContext, input?: any): void {
  // Only log in development
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const providerInfo = getProviderInfo();
  
  console.log(`🚀 Route AI Operation Started: ${context.routeName}`, {
    operation: context.operation,
    provider: providerInfo.name,
    model: providerInfo.model,
    requestId: context.requestId,
    orgId: context.orgId,
    route: context.routeName,
    input: input ? sanitizePayload(input) : undefined,
  });
}

// Log route-specific AI operation success
export function logRouteAISuccess(
  context: RouteAILogContext, 
  result?: any,
  persistenceSuccess?: boolean
): void {
  const duration = Date.now() - context.startTime;
  const providerInfo = getProviderInfo();
  
  // Log to AI logger (always)
  aiLogger.logSuccess({
    requestId: context.requestId,
    orgId: context.orgId,
    operation: `${context.routeName}:${context.operation}`,
    provider: providerInfo.name,
    model: providerInfo.model,
    duration,
    // Add route-specific metadata
  });
  
  // Additional route logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Route AI Operation Success: ${context.routeName}`, {
      operation: context.operation,
      provider: providerInfo.name,
      model: providerInfo.model,
      requestId: context.requestId,
      orgId: context.orgId,
      route: context.routeName,
      duration: `${duration}ms`,
      persistenceSuccess,
      result: result ? sanitizePayload(result) : undefined,
    });
  }
}

// Log route-specific AI operation error
export function logRouteAIError(
  context: RouteAILogContext, 
  error: unknown,
  persistenceSuccess?: boolean
): void {
  const duration = Date.now() - context.startTime;
  const providerInfo = getProviderInfo();
  
  // Handle AI errors specifically
  if (error && typeof error === 'object' && 'code' in error) {
    const aiError = error as AIError;
    
    // Log to AI logger (always)
    aiLogger.logError({
      requestId: context.requestId,
      orgId: context.orgId,
      operation: `${context.routeName}:${context.operation}`,
      provider: providerInfo.name,
      model: providerInfo.model,
      duration,
      // Add route-specific metadata
    }, aiError);
  } else {
    // Log non-AI errors
    const genericError = new Error(error instanceof Error ? error.message : 'Unknown error') as AIError;
    genericError.code = 'ROUTE_ERROR';
    genericError.userMessage = 'An error occurred in the route layer.';
    
    aiLogger.logError({
      requestId: context.requestId,
      orgId: context.orgId,
      operation: `${context.routeName}:${context.operation}`,
      provider: providerInfo.name,
      model: providerInfo.model,
      duration,
    }, genericError);
  }
  
  // Additional route logging in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`❌ Route AI Operation Error: ${context.routeName}`, {
      operation: context.operation,
      provider: providerInfo.name,
      model: providerInfo.model,
      requestId: context.requestId,
      orgId: context.orgId,
      route: context.routeName,
      duration: `${duration}ms`,
      persistenceSuccess,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
    });
  }
}

// Log route-specific persistence issues
export function logRoutePersistenceIssue(
  context: RouteAILogContext,
  operation: 'save' | 'update' | 'status',
  details: any
): void {
  // Only log in development
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  console.warn(`⚠️ Route Persistence Issue: ${context.routeName}`, {
    operation: `${context.operation}:${operation}`,
    requestId: context.requestId,
    orgId: context.orgId,
    route: context.routeName,
    details: sanitizePayload(details),
  });
}

// Helper to get current provider info
function getProviderInfo(): { name: string; model?: string } {
  const provider = process.env.LLM_PROVIDER || 'mock';
  const model = process.env[`${provider.toUpperCase()}_MODEL`] || undefined;
  
  return {
    name: provider,
    model,
  };
}

// Helper to create route logging context
export function createRouteLogContext(
  routeName: string,
  operation: 'analyzeJD' | 'generateInterviewKit' | 'generateCandidateSignals',
  requestId: string,
  orgId: string
): RouteAILogContext {
  return {
    routeName,
    operation,
    requestId,
    orgId,
    startTime: Date.now(),
  };
}

// Development-only helper to get recent AI logs
export function getDevAILogs(requestId?: string, orgId?: string) {
  if (process.env.NODE_ENV !== 'development') {
    return [];
  }
  
  if (requestId) {
    return aiLogger.getLogsByRequestId(requestId);
  }
  
  if (orgId) {
    return aiLogger.getLogsByOrgId(orgId, 50);
  }
  
  return aiLogger.getLogs(50);
}
