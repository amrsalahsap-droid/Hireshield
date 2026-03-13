# **🛡️ Route-Level AI Error Mapping Implementation**

## **📁 Files Changed**

### **1. `lib/server/ai-error-mapping.ts` (NEW)**
- ✅ **Created**: Comprehensive AI error mapping utility
- ✅ **Features**: Safe, structured error responses for frontend

### **2. `app/api/jobs/[id]/route.ts`**
- ✅ **Added**: `import { handleAIRouteError } from "@/lib/server/ai-error-mapping";`
- ✅ **Updated**: JD Analysis error handling to use standardized mapping
- ✅ **Updated**: Interview Kit error handling to use standardized mapping

### **3. `app/api/evaluations/[id]/route.ts`**
- ✅ **Added**: `import { handleAIRouteError } from "@/lib/server/ai-error-mapping";`
- ✅ **Updated**: Candidate Signals error handling to use standardized mapping

## **🔄 Route Response Contract**

### **Standardized Error Response Structure:**
```typescript
interface RouteAIErrorResponse {
  error: string;           // Operation-specific error message
  code?: string;          // AI error code (e.g., "AI_RATE_LIMITED")
  message?: string;       // User-friendly, actionable message
  retryable?: boolean;    // Whether the user should retry
  requestId?: string;     // Request tracking ID
  details?: string;      // Safe, filtered error details (dev only)
}
```

### **HTTP Status Code Mapping:**
| **AI Error Code** | **HTTP Status** | **User Message** |
|------------------|----------------|------------------|
| `PROVIDER_NOT_CONFIGURED` | 503 | "AI service is not configured. Please contact your administrator." |
| `TIMEOUT` | 504 | "Job Description Analysis is taking too long to respond. Please try again." |
| `RATE_LIMITED` | 429 | "Job Description Analysis is temporarily unavailable due to high demand. Please wait a moment and try again." |
| `QUOTA_EXCEEDED` | 402 | "Job Description Analysis quota has been exceeded. Please contact your administrator." |
| `MODEL_NOT_AVAILABLE` | 503 | "Job Description Analysis is temporarily unavailable. Please try again later." |
| `NETWORK_ERROR` | 502 | "Job Description Analysis is currently unavailable. Please check your connection and try again." |
| `OUTPUT_INVALID` | 500 | "Job Description Analysis failed due to an unexpected response. Please try again." |
| `INPUT_VALIDATION_FAILED` | 400 | "Invalid input provided for job description analysis. Please check your data and try again." |
| `UNKNOWN_ERROR` | 500 | "Job Description Analysis failed. Please try again." |

## **🔒 Security & Safety Features**

### **✅ Information Leakage Prevention:**
- **No Provider Names**: Never exposes "OpenRouter", "Groq", etc.
- **No API Keys**: Filters out any "api-key", "token", "secret", "password"
- **No Stack Traces**: Internal errors filtered in production
- **No Raw Provider Errors**: Translated to user-friendly messages

### **✅ Safe Detail Filtering:**
```typescript
// Example: Raw provider error
"OpenRouter API error: Invalid API key sk-or-v1-abc123"

// Becomes safe detail:
"*** API error: Invalid *** ***-v1-***"

// Or completely filtered if too sensitive:
undefined
```

## **🎯 Operation-Specific Messaging**

### **JD Analysis Errors:**
- `"Job Description Analysis service is not configured. Please contact your administrator."`
- `"Job Description Analysis is taking too long to respond. Please try again."`
- `"Job Description Analysis failed due to an unexpected response. Please try again."`

### **Interview Kit Errors:**
- `"Interview Kit Generation service is not configured. Please contact your administrator."`
- `"Interview Kit Generation is taking too long to respond. Please try again."`
- `"Interview Kit Generation failed due to an unexpected response. Please try again."`

### **Candidate Signals Errors:**
- `"Candidate Signal Analysis service is not configured. Please contact your administrator."`
- `"Candidate Signal Analysis is taking too long to respond. Please try again."`
- `"Candidate Signal Analysis failed due to an unexpected response. Please try again."`

## **🛠️ Implementation Details**

### **Error Mapping Function:**
```typescript
export function handleAIRouteError(
  error: unknown,
  operation: 'jd-analysis' | 'interview-kit' | 'candidate-signals',
  requestId?: string
): NextResponse<RouteAIErrorResponse>
```

### **Usage in Routes:**
```typescript
// Before (manual error handling)
if (error && typeof error === 'object' && 'code' in error) {
  const aiError = error as any;
  const statusCode = aiError.code === 'AI_RATE_LIMITED' ? 429 : 500;
  return NextResponse.json({
    error: "AI analysis failed",
    details: aiError.message,
    code: aiError.code,
    requestId,
  }, { status: statusCode });
}

// After (standardized mapping)
return handleAIRouteError(error, 'jd-analysis', requestId);
```

## **📊 Response Examples**

### **Rate Limit Error:**
```json
{
  "error": "Job Description Analysis failed",
  "code": "AI_RATE_LIMITED",
  "message": "Job Description Analysis is temporarily unavailable due to high demand. Please wait a moment and try again.",
  "retryable": true,
  "requestId": "uuid-1234"
}
```
**HTTP Status:** 429

### **Configuration Error:**
```json
{
  "error": "Interview Kit Generation failed",
  "code": "AI_PROVIDER_NOT_CONFIGURED",
  "message": "Interview Kit Generation service is not configured. Please contact your administrator.",
  "retryable": false,
  "requestId": "uuid-5678"
}
```
**HTTP Status:** 503

### **Timeout Error:**
```json
{
  "error": "Candidate Signal Analysis failed",
  "code": "AI_TIMEOUT",
  "message": "Candidate Signal Analysis is taking too long to respond. Please try again.",
  "retryable": true,
  "requestId": "uuid-9012"
}
```
**HTTP Status:** 504

## **🎯 Benefits Achieved**

### **✅ Consistency:**
- All AI endpoints return the same error structure
- Predictable error handling for frontend developers
- Standardized HTTP status codes

### **✅ Security:**
- No sensitive information leakage
- Safe error detail filtering
- Professional user-facing messages

### **✅ Usability:**
- Actionable error messages
- Clear retry guidance
- Request tracking for debugging

### **✅ Maintainability:**
- Centralized error mapping logic
- Easy to update messages globally
- Single source of truth for error handling

## **🚀 Production Ready**

**The route-level AI error mapping is now fully implemented and provides:**

- ✅ **Safe, structured responses** for all AI endpoints
- ✅ **Consistent error contracts** for frontend integration
- ✅ **Security-hardened** error information filtering
- ✅ **User-friendly** actionable error messages
- ✅ **Developer-friendly** request tracking and debugging

**All AI routes now return professional, safe, and consistent error responses!** 🎉

---

*Generated on: 2026-03-12*
*Status: IMPLEMENTATION COMPLETE* ✅
