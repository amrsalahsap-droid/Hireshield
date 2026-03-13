# **🏗️ HireShield AI Architecture Guide**

## **📋 Required Architecture**

```
Route Handlers / Server Actions
  ↓
aiService (ONLY)
  ↓
Provider Adapter (Mock/OpenRouter/Groq)
  ↓
External AI APIs
```

## **✅ Correct Usage**

### **Imports:**
```typescript
// ✅ CORRECT - Use centralized AI service
import { aiService } from '@/lib/ai';

// ❌ WRONG - Direct provider imports
import { OpenAI } from 'openai';
import { callLLMAndParseJSON } from '@/lib/server/ai/call';
```

### **AI Operations:**
```typescript
// ✅ CORRECT - Use aiService methods
const jdResult = await aiService.analyzeJD({
  jobTitle: job.title,
  rawJD: job.rawJD,
  requestId,
  orgId
});

const interviewResult = await aiService.generateInterviewKit({
  jobTitle: job.title,
  rawJD: job.rawJD,
  extractedSkills: skills,
  requestId,
  orgId
});

const signalsResult = await aiService.generateCandidateSignals({
  candidateProfile: { fullName, rawCVText },
  jobRequirements: { title, description, requiredSkills },
  requestId,
  orgId
});

// ❌ WRONG - Direct provider calls
const result = await callLLMAndParseJSON({...});
const openai = new OpenAI({ apiKey: '...' });
```

### **Error Handling:**
```typescript
// ✅ CORRECT - Use standardized error mapping
import { handleAIRouteError } from '@/lib/server/ai-error-mapping';

try {
  const result = await aiService.analyzeJD({...});
  return NextResponse.json(result);
} catch (error) {
  return handleAIRouteError(error, 'jd-analysis', requestId);
}

// ❌ WRONG - Manual error handling
try {
  const result = await callLLMAndParseJSON({...});
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }
}
```

### **Logging:**
```typescript
// ✅ CORRECT - Use route logging
import { createRouteLogContext, logRouteAIStart, logRouteAISuccess } from '@/lib/server/route-ai-logging';

const logContext = createRouteLogContext('POST /api/jobs/[id]/analyze-jd', 'analyzeJD', requestId, orgId);
logRouteAIStart(logContext, input);
logRouteAISuccess(logContext, result, true);

// ❌ WRONG - Manual console logging
console.log('AI operation started', { provider, model });
```

## **⚠️ Architecture Violations**

### **❌ NEVER Do This:**
```typescript
// Direct imports from old AI system
import { callLLMAndParseJSON } from '@/lib/server/ai/call';

// Direct provider imports in routes
import OpenAI from 'openai';
import { OpenAI } from 'openai';

// Direct provider usage
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({...});

// Direct LLM calls
const result = await callLLMAndParseJSON({
  promptId: 'jd-analyzer-v1',
  system: 'You are...',
  user: 'Analyze this JD...',
  schema: JDExtraction_v1,
  requestId,
  orgId,
});

// Provider-specific logic in routes
if (process.env.LLM_PROVIDER === 'openai') {
  // OpenAI-specific code
} else if (process.env.LLM_PROVIDER === 'groq') {
  // Groq-specific code
}
```

## **🔍 Development Tools**

### **Architecture Compliance Checker:**
```bash
# Run the architecture checker
node scripts/check-ai-architecture.js

# Add to package.json scripts
{
  "scripts": {
    "check-ai-architecture": "node scripts/check-ai-architecture.js",
    "pre-commit": "npm run check-ai-architecture"
  }
}
```

### **What the Checker Finds:**
- ❌ Direct imports from `lib/server/ai/call`
- ❌ Usage of `callLLMAndParseJSON`
- ❌ Direct provider imports (OpenAI, OpenRouter, Groq)
- ❌ Direct provider instantiation

## **🛠️ Migration Examples**

### **Before (Old Architecture):**
```typescript
import { callLLMAndParseJSON } from '@/lib/server/ai/call';
import { JDExtraction_v1 } from '@/lib/schemas/jd-extraction';
import { jdAnalyzerV1 } from '@/lib/prompts/jd_analyzer_v1';

const prompt = jdAnalyzerV1.build({ jobTitle, rawJD });
const result = await callLLMAndParseJSON({
  promptId: jdAnalyzerV1.id,
  system: prompt.system,
  user: prompt.user,
  schema: JDExtraction_v1,
  requestId,
  orgId,
});
```

### **After (New Architecture):**
```typescript
import { aiService } from '@/lib/ai';

const result = await aiService.analyzeJD({
  jobTitle,
  rawJD,
  requestId,
  orgId
});
```

## **📚 File Locations**

### **✅ Use These:**
- `lib/ai/index.ts` - Main AI service exports
- `lib/ai/service.ts` - Centralized AI service
- `lib/server/ai-error-mapping.ts` - Error handling
- `lib/server/route-ai-logging.ts` - Development logging

### **⚠️ Avoid These:**
- `lib/server/ai/call.ts` - Legacy LLM utility
- `lib/server/ai/client.ts` - Legacy OpenAI client
- `lib/server/ai/config.ts` - Legacy configuration
- Direct provider imports in routes

## **🎯 Benefits of This Architecture**

### **✅ Consistency:**
- All AI operations go through the same interface
- Consistent error handling across all routes
- Standardized logging and monitoring

### **✅ Maintainability:**
- Single place to update AI logic
- Easy to add new providers
- Centralized configuration and testing

### **✅ Security:**
- No API keys in route code
- No provider-specific logic exposure
- Consistent error message filtering

### **✅ Development:**
- Mock provider works without API keys
- Development logging for debugging
- Architecture violations are obvious

## **🚀 Quick Reference**

### **Import Statement:**
```typescript
import { aiService } from '@/lib/ai';
```

### **Available Methods:**
```typescript
aiService.analyzeJD(input)
aiService.generateInterviewKit(input)
aiService.generateCandidateSignals(input)
```

### **Error Handling:**
```typescript
import { handleAIRouteError } from '@/lib/server/ai-error-mapping';
handleAIRouteError(error, 'operation-type', requestId);
```

### **Logging:**
```typescript
import { createRouteLogContext, logRouteAIStart, logRouteAISuccess } from '@/lib/server/route-ai-logging';
```

---

**🎉 By following this architecture, you ensure:**
- ✅ Consistent AI behavior across the application
- ✅ Easy provider switching and testing
- ✅ Secure and maintainable code
- ✅ Great developer experience

**When in doubt, check `lib/ai/index.ts` for guidance!** 📖
