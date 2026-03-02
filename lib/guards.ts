/**
 * Input validation guards for preventing oversized text processing
 * Protects against memory exhaustion and crash scenarios
 */

// Guard error interface
export interface GuardError {
  code: 400;
  message: string;
  type: 'INPUT_TOO_LONG' | 'INPUT_EMPTY' | 'INVALID_INPUT';
  field?: string;
  limit?: number;
  actual?: number;
}

// Custom error class for guard violations
export class GuardViolation extends Error {
  public readonly code: 400;
  public readonly type: GuardError['type'];
  public readonly field?: string;
  public readonly limit?: number;
  public readonly actual?: number;

  constructor(message: string, type: GuardError['type'], field?: string, limit?: number, actual?: number) {
    super(message);
    this.name = 'GuardViolation';
    this.code = 400;
    this.type = type;
    this.field = field;
    this.limit = limit;
    this.actual = actual;
  }

  toJSON(): GuardError {
    return {
      code: this.code,
      message: this.message,
      type: this.type,
      field: this.field,
      limit: this.limit,
      actual: this.actual,
    };
  }
}

/**
 * Asserts that text does not exceed maximum length
 * @param label - Field label for error messages
 * @param text - Text to validate
 * @param max - Maximum allowed characters
 * @throws GuardViolation if text is too long
 */
export function assertMaxLen(label: string, text: string, max: number): void {
  if (typeof text !== 'string') {
    throw new GuardViolation(
      `${label} must be a string`,
      'INVALID_INPUT',
      label
    );
  }

  const length = text.length;
  if (length > max) {
    throw new GuardViolation(
      `${label} is too long (${length} characters). Maximum allowed is ${max} characters.`,
      'INPUT_TOO_LONG',
      label,
      max,
      length
    );
  }
}

/**
 * Asserts that text is not empty (after trimming)
 * @param label - Field label for error messages
 * @param text - Text to validate
 * @throws GuardViolation if text is empty
 */
export function assertNonEmpty(label: string, text: string): void {
  if (typeof text !== 'string') {
    throw new GuardViolation(
      `${label} must be a string`,
      'INVALID_INPUT',
      label
    );
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new GuardViolation(
      `${label} cannot be empty`,
      'INPUT_EMPTY',
      label
    );
  }
}

/**
 * Asserts that text is within length bounds
 * @param label - Field label for error messages
 * @param text - Text to validate
 * @param min - Minimum allowed characters
 * @param max - Maximum allowed characters
 * @throws GuardViolation if text is out of bounds
 */
export function assertLengthBounds(label: string, text: string, min: number, max: number): void {
  if (typeof text !== 'string') {
    throw new GuardViolation(
      `${label} must be a string`,
      'INVALID_INPUT',
      label
    );
  }

  const length = text.length;
  if (length < min) {
    throw new GuardViolation(
      `${label} is too short (${length} characters). Minimum required is ${min} characters.`,
      'INPUT_TOO_LONG',
      label,
      min,
      length
    );
  }

  if (length > max) {
    throw new GuardViolation(
      `${label} is too long (${length} characters). Maximum allowed is ${max} characters.`,
      'INPUT_TOO_LONG',
      label,
      max,
      length
    );
  }
}

/**
 * Asserts that array does not exceed maximum size
 * @param label - Field label for error messages
 * @param array - Array to validate
 * @param max - Maximum allowed items
 * @throws GuardViolation if array is too large
 */
export function assertMaxArraySize(label: string, array: any[], max: number): void {
  if (!Array.isArray(array)) {
    throw new GuardViolation(
      `${label} must be an array`,
      'INVALID_INPUT',
      label
    );
  }

  const length = array.length;
  if (length > max) {
    throw new GuardViolation(
      `${label} has too many items (${length}). Maximum allowed is ${max} items.`,
      'INPUT_TOO_LONG',
      label,
      max,
      length
    );
  }
}

/**
 * Validates JSON string size before parsing
 * @param label - Field label for error messages
 * @param jsonString - JSON string to validate
 * @param maxSizeKB - Maximum size in kilobytes
 * @throws GuardViolation if JSON is too large
 */
export function assertJsonSize(label: string, jsonString: string, maxSizeKB: number): void {
  const sizeBytes = new Blob([jsonString]).size;
  const sizeKB = sizeBytes / 1024;

  if (sizeKB > maxSizeKB) {
    throw new GuardViolation(
      `${label} is too large (${sizeKB.toFixed(2)} KB). Maximum allowed is ${maxSizeKB} KB.`,
      'INPUT_TOO_LONG',
      label,
      maxSizeKB,
      sizeKB
    );
  }
}

/**
 * Validates email format and length
 * @param label - Field label for error messages
 * @param email - Email to validate
 * @throws GuardViolation if email is invalid
 */
export function assertEmail(label: string, email: string): void {
  assertNonEmpty(label, email);
  assertMaxLen(label, email, 254); // RFC 5321 limit

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new GuardViolation(
      `${label} must be a valid email address`,
      'INVALID_INPUT',
      label
    );
  }
}

/**
 * Validates UUID format
 * @param label - Field label for error messages
 * @param uuid - UUID to validate
 * @throws GuardViolation if UUID is invalid
 */
export function assertUUID(label: string, uuid: string): void {
  assertNonEmpty(label, uuid);
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new GuardViolation(
      `${label} must be a valid UUID`,
      'INVALID_INPUT',
      label
    );
  }
}

/**
 * Helper to check if error is a GuardViolation
 * @param error - Error to check
 * @returns True if error is a GuardViolation
 */
export function isGuardViolation(error: unknown): error is GuardViolation {
  return error instanceof GuardViolation;
}

/**
 * Helper to format GuardViolation for API responses
 * @param error - GuardViolation instance
 * @returns Formatted error object for API responses
 */
export function formatGuardError(error: GuardViolation) {
  return {
    error: {
      code: error.code,
      message: error.message,
      type: error.type,
      field: error.field,
      ...(error.limit !== undefined && { limit: error.limit }),
      ...(error.actual !== undefined && { actual: error.actual }),
    },
  };
}
