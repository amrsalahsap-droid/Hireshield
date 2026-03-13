# **⚠️ DEPRECATED - Legacy AI System**

## **🚨 This Directory is Deprecated**

This directory contains the **old AI system** that has been replaced by the centralized AI architecture.

## **🏗️ New Architecture Location**

The new AI system is located at:
- **Main Service**: `lib/ai/service.ts`
- **Types**: `lib/ai/types.ts`
- **Configuration**: `lib/ai/config.ts`
- **Error Handling**: `lib/ai/errors.ts`
- **Logging**: `lib/ai/logging.ts`
- **Providers**: `lib/ai/providers/`

## **❌ Do Not Use These Files**

- `call.ts` - Use `aiService` instead
- `client.ts` - Providers handle this internally
- `config.ts` - Use `lib/ai/config.ts` instead
- `errors.ts` - Use `lib/ai/errors.ts` instead
- `logging.ts` - Use `lib/ai/logging.ts` instead

## **✅ Migration Required**

If you're importing from this directory, you need to migrate:

### **Before:**
```typescript
import { callLLMAndParseJSON } from '@/lib/server/ai/call';
import { getOpenAiApiKey } from '@/lib/server/ai/config';
```

### **After:**
```typescript
import { aiService } from '@/lib/ai';
// Environment variables are handled automatically
```

## **🗑️ Future Cleanup**

This directory will be removed once all migrations are complete. Do not add new code here.

## **📚 Reference**

See `AI_ARCHITECTURE_GUIDE.md` for the complete migration guide.

---

**Status: DEPRECATED - Use lib/ai instead** ⚠️
