## Why

The app currently hardcodes Anthropic as the sole LLM provider in `lib/agents/configs.ts` and `lib/agents/orchestrator.ts`, requiring direct API keys for each model vendor. TrollLLM is a unified proxy that routes requests to Claude, Gemini, and GPT models through a single endpoint and API key, reducing credential management overhead and enabling easy model switching across providers.

## What Changes

- Add a `trollllm` provider option alongside the existing `anthropic` provider in agent configurations
- Introduce a `TROLLLLM_BASE_URL` and `TROLLLLM_API_KEY` environment variable for the proxy endpoint
- Update `orchestrator.ts` to instantiate an `OpenMultiAgent` with TrollLLM as the default provider when configured
- Update `lib/agents/configs.ts` to allow agents to target any TrollLLM-supported model (e.g. `gpt-4o`, `gemini-2.0-flash`, `claude-sonnet-4-6`) via the `trollllm` provider
- Update agent-related API routes to pass through the active provider configuration
- Provide a provider selection mechanism (env-based) so the app can switch between direct providers and TrollLLM without code changes

## Capabilities

### New Capabilities

- `trollllm-provider`: Integration with TrollLLM proxy — configuring the `@jackchen_me/open-multi-agent` SDK to use TrollLLM as its LLM backend, supporting Claude, Gemini, and GPT model families through a single base URL and API key

### Modified Capabilities

<!-- No existing spec-level requirements are changing — this is a new provider option layered on top of the existing agent infrastructure -->

## Impact

- **`lib/agents/configs.ts`**: Agent `provider` field may be set to `'trollllm'`; model names can be any TrollLLM-supported model string
- **`lib/agents/orchestrator.ts`**: `OpenMultiAgent` instantiation reads provider config from environment at startup
- **`.env.local` / environment**: New vars `TROLLLLM_BASE_URL` and `TROLLLLM_API_KEY`; existing `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` remain optional when TrollLLM is active
- **`@jackchen_me/open-multi-agent`**: Must support custom base URL configuration — needs verification against installed version (`^1.0.1`)
- **No UI changes** required; provider switching is configuration-driven
