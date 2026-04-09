## Context

The app uses `@jackchen_me/open-multi-agent` v1.0.1 as its agent orchestration layer. All three agents (Architect, Developer, Reviewer) in `lib/agents/configs.ts` are hardcoded to `provider: 'anthropic'` and `model: 'claude-sonnet-4-6'`. The `OpenMultiAgent` instance in `lib/agents/orchestrator.ts` also defaults to `defaultProvider: 'anthropic'`.

TrollLLM is an OpenAI-compatible proxy that exposes Claude, Gemini, and GPT models behind a single base URL and API key. The SDK already supports custom base URLs via `AgentConfig.baseURL` and `OrchestratorConfig.defaultBaseURL` — no library changes are needed.

## Goals / Non-Goals

**Goals:**
- Support TrollLLM as a drop-in LLM backend via environment variable configuration
- Allow individual agents to target different models (e.g., GPT-4o for Developer, Gemini for Reviewer) through TrollLLM
- Zero-downtime toggle: switching between direct Anthropic and TrollLLM requires only env var changes, no code redeploys
- Surface TrollLLM configuration in `.env.local` with clear documentation

**Non-Goals:**
- Building a UI for provider selection at runtime
- Supporting TrollLLM alongside direct providers simultaneously (one active at a time)
- Modifying the `@jackchen_me/open-multi-agent` library itself
- Per-request model overrides from the API layer

## Decisions

### Decision 1: Use `provider: 'openai'` + `baseURL` override for TrollLLM

TrollLLM exposes an OpenAI-compatible API. The SDK's `AgentConfig` already supports `baseURL` for "OpenAI-compatible APIs (Ollama, vLLM, LM Studio, etc.)". Setting `provider: 'openai'` with `baseURL: process.env.TROLLLLM_BASE_URL` and `apiKey: process.env.TROLLLLM_API_KEY` is the correct and documented path.

**Alternative considered**: Treating TrollLLM as a new named provider requiring SDK changes — rejected because it's unnecessary and increases maintenance burden.

### Decision 2: Env-var-driven provider factory in `lib/agents/configs.ts`

Introduce a `getLLMConfig()` helper that reads `TROLLLLM_BASE_URL`, `TROLLLLM_API_KEY`, and a new `TROLLLLM_DEFAULT_MODEL` env var at module load time. If TrollLLM vars are present, it returns `{ provider: 'openai', baseURL, apiKey, model }`. Otherwise it falls back to current Anthropic defaults.

Each agent config calls `getLLMConfig(agentSpecificModelOverride?)` so the provider decision is centralised.

**Alternative considered**: Separate config files per environment — rejected as over-engineering for a single env-var toggle.

### Decision 3: `TROLLLLM_DEFAULT_MODEL` maps to a provider-agnostic model name

TrollLLM proxies multiple model families. The env var `TROLLLLM_DEFAULT_MODEL` (e.g., `gpt-4o`, `gemini-2.0-flash`, `claude-sonnet-4-6`) is passed as-is to the SDK's `model` field. Per-agent overrides can use separate env vars (`TROLLLLM_ARCHITECT_MODEL`, `TROLLLLM_DEVELOPER_MODEL`, `TROLLLLM_REVIEWER_MODEL`) with `TROLLLLM_DEFAULT_MODEL` as fallback.

### Decision 4: Reset `orchestratorInstance` when provider config changes

The orchestrator singleton in `lib/agents/orchestrator.ts` currently caches the `OpenMultiAgent` instance. Since provider config is read at instantiation time, `resetOrchestrator()` already exists and is sufficient. The `getOrchestrator()` factory just needs to pass `defaultBaseURL` and `defaultApiKey` when TrollLLM is active.

## Risks / Trade-offs

- **TrollLLM API compatibility**: The proxy must correctly implement the OpenAI Chat Completions API including tool/function calling. If tool_use blocks behave differently, agent tool invocations may silently fail. → Mitigation: integration test with a simple tool call in the test suite (`app/api/test/agents/`).
- **Model name strings**: TrollLLM model identifiers may differ from native provider names. Misconfigured `TROLLLLM_DEFAULT_MODEL` will produce a 400/404 from the proxy at runtime rather than a startup error. → Mitigation: document supported model names in `.env.local` comments.
- **Singleton caching**: If `TROLLLLM_BASE_URL` is changed at runtime (e.g., in tests), the cached orchestrator instance will use stale config. → Mitigation: the existing `resetOrchestrator()` call covers this; document it.
- **API key placeholder**: The OpenAI SDK requires a non-empty `apiKey` even for local/proxy endpoints. If `TROLLLLM_API_KEY` is unset, the SDK will throw at init. → Mitigation: validate presence of `TROLLLLM_API_KEY` when `TROLLLLM_BASE_URL` is set and log a clear error.

## Migration Plan

1. Add `TROLLLLM_BASE_URL`, `TROLLLLM_API_KEY`, and `TROLLLLM_DEFAULT_MODEL` to `.env.local` (commented out by default)
2. Update `lib/agents/configs.ts` to use `getLLMConfig()` helper
3. Update `lib/agents/orchestrator.ts` to forward `defaultBaseURL`/`defaultApiKey` when TrollLLM is active
4. Test with the existing `/api/test/agents` endpoint
5. No DB migrations, no UI changes, no downtime

**Rollback**: Unset `TROLLLLM_BASE_URL` — the app reverts to direct Anthropic automatically.

## Open Questions

- Does TrollLLM support all tool-calling formats used by the SDK's `openai` adapter? Needs empirical testing with `bashTool`, `fileReadTool`, etc.
- Are there per-agent model preferences the team wants baked in, or is a single `TROLLLLM_DEFAULT_MODEL` sufficient for the initial integration?
