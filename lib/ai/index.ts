/**
 * AI Service Index
 * Main entry point for AI functionality
 */

export { aiService } from './service';
export * from './types';
export * from './config';
export * from './errors';
export { aiLogger } from './logging';

// Re-export for backward compatibility during migration
export { aiService as default } from './service';
