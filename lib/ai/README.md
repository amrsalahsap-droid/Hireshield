# AI Layer Refactoring - Complete Guide

## Overview

HireShield's AI layer has been completely refactored to provide:
- **Stable development** with mock provider (no API keys required)
- **Production-ready** real providers (OpenRouter, Groq)
- **Unified interface** for all AI operations
- **Comprehensive error handling** and logging
- **Environment-based switching** only

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   AI Service Layer                │
├─────────────────────────────────────────────────────────────┤
│  lib/ai/                                         │
│  ├── types.ts        # Shared interfaces         │
│  ├── config.ts        # Environment config         │
│  ├── errors.ts        # Error handling            │
│  ├── logging.ts       # Structured logging        │
│  ├── service.ts       # Central AI service       │
│  ├── index.ts         # Main exports            │
│  └── providers/      # Provider implementations  │
│      ├── mock.ts      # Mock for development     │
│      ├── openrouter.ts # OpenRouter provider     │
│      ├── groq.ts      # Groq provider          │
│      └── openai.ts    # OpenAI provider (stub)│
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Development (Mock Mode)
```bash
# Default configuration - no API keys needed
LLM_PROVIDER=mock
MOCK_AI_SCENARIO=generic
MOCK_AI_FAILURE_MODE=none
```

### Production (Real Provider)
```bash
# OpenRouter
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here

# Groq
LLM_PROVIDER=groq
GROQ_API_KEY=your-key-here
```

## Available Operations

All AI operations go through the unified `aiService`:

```typescript
import { aiService } from '@/lib/ai';

// JD Analysis
const jdResult = await aiService.analyzeJD({
  jobTitle: 'Senior Developer',
  rawJD: 'Job description...',
  requestId: 'uuid',
  orgId: 'org-id'
});

// Interview Kit
const kitResult = await aiService.generateInterviewKit({
  jobTitle: 'Senior Developer',
  rawJD: 'Job description...',
  extractedSkills: ['React', 'TypeScript'],
  seniorityLevel: 'Senior',
  requestId: 'uuid',
  orgId: 'org-id'
});

// Candidate Signals
const signalsResult = await aiService.generateCandidateSignals({
  candidateProfile: {
    name: 'John Doe',
    resume: 'Resume text...',
    skills: ['React', 'Node.js']
  },
  jobRequirements: {
    title: 'Senior Developer',
    requiredSkills: ['React', 'TypeScript']
  },
  requestId: 'uuid',
  orgId: 'org-id'
});
```

## Development Testing Controls

### Failure Simulation
```bash
# Simulate different failure modes
MOCK_AI_FAILURE_MODE=timeout         # Simulate timeout
MOCK_AI_FAILURE_MODE=invalid_output   # Simulate invalid JSON
MOCK_AI_FAILURE_MODE=rate_limit      # Simulate rate limit
MOCK_AI_FAILURE_MODE=none           # No failures (default)
```

### Latency Simulation
```bash
# Add artificial latency for testing
LLM_SIMULATE_LATENCY_MS=2000        # Add 2 second delay
```

### Random Failures
```bash
# Force X% of requests to fail
LLM_FORCE_FAILURE_RATE=0.1            # 10% failure rate
```

### Debug Mode
```bash
# Enable full request/response logging
LLM_DEBUG_REQUESTS=true
```

## Mock Scenarios

Different mock data scenarios for testing:

```bash
MOCK_AI_SCENARIO=frontend     # Frontend developer role
MOCK_AI_SCENARIO=backend      # Backend developer role  
MOCK_AI_SCENARIO=sales        # Sales representative role
MOCK_AI_SCENARIO=generic      # Generic role (default)
```

## Error Handling

All errors are normalized with structured codes:

```typescript
{
  code: 'AI_TIMEOUT',              // Error code
  message: 'Technical details...',    // Technical message
  userMessage: 'Friendly message...', // User-friendly message
  provider: 'openrouter',          // Which provider failed
  retryable: true,                // Can retry?
  requestId: 'uuid'               // Request tracking
}
```

### Error Codes
- `AI_TIMEOUT` - Request timeout
- `AI_RATE_LIMITED` - Rate limit exceeded
- `AI_PROVIDER_ERROR` - Provider API error
- `AI_PROVIDER_NOT_CONFIGURED` - Missing API key
- `AI_OUTPUT_INVALID` - Invalid response format
- `AI_SCHEMA_VALIDATION_FAILED` - Response doesn't match schema
- `AI_NETWORK_ERROR` - Network connectivity issue

## Logging

Structured logging for all AI operations:

```typescript
// Success logs
🤖 AI Operation Started: analyzeJD { provider: 'mock', requestId: '...' }
✅ AI Operation: analyzeJD { provider: 'mock', duration: 1234 }

// Error logs  
❌ AI Operation: analyzeJD { error: { code: 'AI_TIMEOUT', ... } }
```

Access logs programmatically:
```typescript
import { aiLogger } from '@/lib/ai';

// Get recent logs
const logs = aiLogger.getLogs({ operation: 'analyzeJD', limit: 10 });

// Get errors only
const errors = aiLogger.getLogs({ status: 'error' });

// Clear logs
aiLogger.clearLogs();
```

## Provider Configuration

### Environment Variables

| Variable | Description | Default |
|-----------|-------------|---------|
| `LLM_PROVIDER` | Provider selection | `mock` |
| `LLM_TIMEOUT_MS` | Request timeout | `30000` |
| `LLM_MAX_RETRIES` | Max retry attempts | `2` |

### Mock Provider
| Variable | Options | Default |
|-----------|----------|---------|
| `MOCK_AI_SCENARIO` | `frontend`, `backend`, `sales`, `generic` | `generic` |
| `MOCK_AI_FAILURE_MODE` | `none`, `timeout`, `invalid_output`, `rate_limit` | `none` |

### OpenRouter Provider
| Variable | Description | Default |
|-----------|-------------|---------|
| `OPENROUTER_API_KEY` | API key | Required |
| `OPENROUTER_MODEL` | Model name | `openrouter/free` |
| `OPENROUTER_BASE_URL` | API endpoint | `https://openrouter.ai/api/v1` |

### Groq Provider
| Variable | Description | Default |
|-----------|-------------|---------|
| `GROQ_API_KEY` | API key | Required |
| `GROQ_MODEL` | Model name | `llama3-8b-8192` |

## Migration Guide

### Before (Old Way)
```typescript
import { callLLMAndParseJSON } from '@/lib/server/ai/call';
import { interviewKitGeneratorV1 } from '@/lib/prompts/interview_kit_v1';

const result = await callLLMAndParseJSON({
  promptId: interviewKitGeneratorV1.id,
  system: prompt.system,
  user: prompt.user,
  schema: InterviewKit_v1,
  requestId,
  orgId,
});
```

### After (New Way)
```typescript
import { aiService } from '@/lib/ai';

const result = await aiService.generateInterviewKit({
  jobTitle: 'Senior Developer',
  rawJD: 'Job description...',
  extractedSkills: ['React', 'TypeScript'],
  seniorityLevel: 'Senior',
  requestId,
  orgId,
});
```

## Benefits

✅ **Development Stability** - Mock mode works without API keys  
✅ **Production Ready** - Real providers with proper error handling  
✅ **Unified Interface** - Single way to call AI operations  
✅ **Environment Switching** - Change providers with env vars only  
✅ **Structured Logging** - Comprehensive operation tracking  
✅ **Error Normalization** - Consistent error handling  
✅ **Testing Controls** - Simulate failures and latency  
✅ **Type Safety** - Full TypeScript support  
✅ **Backward Compatible** - Existing routes work unchanged  

## Troubleshooting

### Common Issues

**"Provider not configured" error**
```bash
# Check provider is set
echo $LLM_PROVIDER

# Check API key for real providers
echo $OPENROUTER_API_KEY
echo $GROQ_API_KEY
```

**"Module not found" errors**
```bash
# Restart development server after env changes
npm run dev
```

**Mock responses not working**
```bash
# Ensure mock mode is active
LLM_PROVIDER=mock

# Check scenario
MOCK_AI_SCENARIO=generic
```

### Debug Mode

Enable full debugging:
```bash
LLM_DEBUG_REQUESTS=true
LLM_PROVIDER=mock
```

This will log:
- Full request payloads
- Complete responses  
- Provider configuration
- Error details

## Future Enhancements

- **OpenAI Provider** - Complete implementation (currently stub)
- **More Providers** - Add Claude, Gemini, etc.
- **Cost Tracking** - Token usage and cost monitoring
- **Performance Metrics** - Response time analytics
- **A/B Testing** - Compare provider performance
- **Caching Layer** - Intelligent response caching
- **Rate Limiting** - Per-organization limits

## Support

For issues with the AI layer:
1. Check environment variables
2. Enable debug mode: `LLM_DEBUG_REQUESTS=true`
3. Review logs: `aiLogger.getLogs()`
4. Test with mock mode first: `LLM_PROVIDER=mock`

---

**Status**: ✅ **COMPLETE** - All 7 phases implemented and tested
