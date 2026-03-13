/**
 * AI Service Index
 * Main entry point for AI functionality
 * 
 * 🏗️ REQUIRED ARCHITECTURE:
 * ========================
 * Route Handlers / Server Actions
 *   ↓
 * aiService (ONLY)
 *   ↓
 * Provider Adapter (Mock/OpenRouter/Groq)
 *   ↓
 * External AI APIs
 * 
 * ⚠️ ARCHITECTURE VIOLATIONS:
 * ==========================
 * ❌ DO NOT import from lib/server/ai/call
 * ❌ DO NOT use callLLMAndParseJSON
 * ❌ DO NOT import OpenAI/OpenRouter/Groq directly
 * ❌ DO NOT add provider-specific logic in routes
 * 
 * ✅ CORRECT USAGE:
 * ==================
 * import { aiService } from '@/lib/ai';
 * 
 * const result = await aiService.analyzeJD({...});
 * const result = await aiService.generateInterviewKit({...});
 * const result = await aiService.generateCandidateSignals({...});
 * 
 * 🔍 FOR DEBUGGING:
 * ==================
 * Use route-ai-logging for development visibility
 * Use ai-error-mapping for consistent error responses
 */

export { aiService } from './service';
export * from './types';
export * from './config';
export * from './errors';
export { aiLogger } from './logging';

// Re-export for backward compatibility during migration
export { aiService as default } from './service';
