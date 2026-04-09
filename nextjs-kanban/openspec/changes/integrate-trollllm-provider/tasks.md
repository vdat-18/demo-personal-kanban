## 1. Environment Configuration

- [ ] 1.1 Add `TROLLLLM_BASE_URL`, `TROLLLLM_API_KEY`, `TROLLLLM_DEFAULT_MODEL`, `TROLLLLM_ARCHITECT_MODEL`, `TROLLLLM_DEVELOPER_MODEL`, and `TROLLLLM_REVIEWER_MODEL` as commented-out entries in `.env.local` with inline comments explaining accepted values and the toggle behaviour

## 2. Provider Config Helper

- [ ] 2.1 Create a `getLLMConfig(agentModelEnvVar?: string)` helper function in `lib/agents/configs.ts` that reads `TROLLLLM_BASE_URL` and returns `{ provider: 'openai', baseURL, apiKey, model }` when set, or `{ provider: 'anthropic', model: 'claude-sonnet-4-6' }` as fallback
- [ ] 2.2 Add startup validation in the helper: when `TROLLLLM_BASE_URL` is set but `TROLLLLM_API_KEY` is missing or empty, throw a clear `Error` with a descriptive message
- [ ] 2.3 Update each agent config in `agentConfigs` (architect, developer, reviewer) to spread `getLLMConfig('TROLLLLM_<ROLE>_MODEL')` so provider, baseURL, apiKey, and model are driven by the helper

## 3. Orchestrator Update

- [ ] 3.1 Update `getOrchestrator()` in `lib/agents/orchestrator.ts` to read `TROLLLLM_BASE_URL` and `TROLLLLM_API_KEY` at instantiation time and pass `defaultBaseURL` and `defaultApiKey` to `new OpenMultiAgent(...)` when TrollLLM is active
- [ ] 3.2 Update the `defaultProvider` in `new OpenMultiAgent(...)` to `'openai'` when TrollLLM is active, keeping `'anthropic'` as the default otherwise

## 4. Verification

- [ ] 4.1 Set the TrollLLM env vars locally and call the existing `/api/test/agents` endpoint to confirm requests route through TrollLLM and a valid response is returned
- [ ] 4.2 Verify fallback: with `TROLLLLM_BASE_URL` unset, confirm the app still works correctly with the direct Anthropic provider
- [ ] 4.3 Verify the missing-API-key guard: set `TROLLLLM_BASE_URL` without `TROLLLLM_API_KEY` and confirm a clear error is thrown (not a cryptic SDK error)
