import { AIErrorCode } from './errors';

const RATE_LIMIT_LIKE_CODES: AIErrorCode[] = [
  AIErrorCode.RATE_LIMITED,
  AIErrorCode.QUOTA_EXCEEDED,
  AIErrorCode.TIMEOUT,
  AIErrorCode.NETWORK_ERROR,
];

const RATE_LIMIT_LIKE_PATTERNS = [
  'rate limit',
  'rate_limit',
  'too many requests',
  'temporarily unavailable',
  'high demand',
  'quota exceeded',
  'quota_exceeded',
  'insufficient_quota',
  '429',
  'service unavailable',
  'overloaded',
];

/**
 * Detects rate-limit-like failures across structured AIErrors, HTTP status codes,
 * and plain Error messages. Used by the fallback wrapper to decide whether to
 * cascade to the next provider or local fallback.
 */
export function isRateLimitLikeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const e = error as Record<string, unknown>;

  if (typeof e.code === 'string' && RATE_LIMIT_LIKE_CODES.includes(e.code as AIErrorCode)) {
    return true;
  }

  if (typeof e.status === 'number' && (e.status === 429 || e.status === 503)) {
    return true;
  }

  const msg = (typeof e.message === 'string' ? e.message : '').toLowerCase();
  return RATE_LIMIT_LIKE_PATTERNS.some((p) => msg.includes(p));
}
