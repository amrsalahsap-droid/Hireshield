export interface ParsedApiError {
  code?: string;
  message: string;
}

/**
 * Safely extract error information from a non-OK fetch response.
 * Falls back to status text if the body isn't JSON.
 */
export async function parseApiError(response: Response): Promise<ParsedApiError> {
  try {
    const body = await response.json();
    return {
      code: body.code ?? undefined,
      message: body.error ?? body.message ?? response.statusText,
    };
  } catch {
    return { message: response.statusText || "Unknown error" };
  }
}

export function isDbUnreachableResponse(parsed: ParsedApiError): boolean {
  return parsed.code === "DB_UNREACHABLE";
}
