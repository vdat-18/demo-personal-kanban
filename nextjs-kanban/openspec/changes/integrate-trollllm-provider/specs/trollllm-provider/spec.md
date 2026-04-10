## ADDED Requirements

### Requirement: TrollLLM provider configuration via environment variables
The system SHALL support TrollLLM as an LLM backend by reading `TROLLLLM_BASE_URL`, `TROLLLLM_API_KEY`, and `TROLLLLM_DEFAULT_MODEL` environment variables at application startup. When `TROLLLLM_BASE_URL` is set, all agent LLM calls SHALL be routed through the TrollLLM proxy instead of the direct Anthropic provider.

#### Scenario: TrollLLM activated when base URL is set
- **WHEN** `TROLLLLM_BASE_URL` is present in the environment
- **THEN** `lib/agents/configs.ts` SHALL return `provider: 'openai'`, `baseURL: TROLLLLM_BASE_URL`, and `apiKey: TROLLLLM_API_KEY` for all agent configurations

#### Scenario: Fallback to Anthropic when TrollLLM is not configured
- **WHEN** `TROLLLLM_BASE_URL` is absent from the environment
- **THEN** all agent configurations SHALL use `provider: 'anthropic'` with `model: 'claude-sonnet-4-6'` as before

#### Scenario: Validation error when API key is missing
- **WHEN** `TROLLLLM_BASE_URL` is set but `TROLLLLM_API_KEY` is absent or empty
- **THEN** the system SHALL log a clear error message at startup and agent runs SHALL throw a configuration error rather than silently failing

### Requirement: TrollLLM model selection via environment variables
The system SHALL use `TROLLLLM_DEFAULT_MODEL` as the model identifier for all agents when TrollLLM is active. Per-agent model overrides SHALL be supported via `TROLLLLM_ARCHITECT_MODEL`, `TROLLLLM_DEVELOPER_MODEL`, and `TROLLLLM_REVIEWER_MODEL`, each falling back to `TROLLLLM_DEFAULT_MODEL` if unset.

#### Scenario: Default model applied to all agents
- **WHEN** `TROLLLLM_BASE_URL` is set and `TROLLLLM_DEFAULT_MODEL` is `gpt-4o`
- **THEN** all three agents (Architect, Developer, Reviewer) SHALL use `model: 'gpt-4o'`

#### Scenario: Per-agent model override takes precedence
- **WHEN** `TROLLLLM_DEFAULT_MODEL` is `gpt-4o` and `TROLLLLM_DEVELOPER_MODEL` is `claude-sonnet-4-6`
- **THEN** the Developer agent SHALL use `model: 'claude-sonnet-4-6'` and Architect/Reviewer SHALL use `model: 'gpt-4o'`

#### Scenario: Missing per-agent override falls back to default
- **WHEN** `TROLLLLM_DEFAULT_MODEL` is `gemini-2.0-flash` and `TROLLLLM_ARCHITECT_MODEL` is unset
- **THEN** the Architect agent SHALL use `model: 'gemini-2.0-flash'`

### Requirement: Orchestrator forwards TrollLLM base URL and API key
The `OpenMultiAgent` instance in `lib/agents/orchestrator.ts` SHALL be initialised with `defaultBaseURL` and `defaultApiKey` from TrollLLM environment variables when TrollLLM is active, ensuring team-level and task-level runs also route through the proxy.

#### Scenario: Orchestrator uses TrollLLM endpoint for team runs
- **WHEN** `TROLLLLM_BASE_URL` is set and `runTeam()` is called
- **THEN** the `OpenMultiAgent` instance SHALL have `defaultBaseURL` set to `TROLLLLM_BASE_URL`

#### Scenario: Orchestrator falls back to direct Anthropic for team runs
- **WHEN** `TROLLLLM_BASE_URL` is absent and `runTeam()` is called
- **THEN** the `OpenMultiAgent` instance SHALL use `defaultProvider: 'anthropic'` without a `defaultBaseURL`

### Requirement: Environment variable documentation in .env.local
The `.env.local` file SHALL include commented-out entries for `TROLLLLM_BASE_URL`, `TROLLLLM_API_KEY`, `TROLLLLM_DEFAULT_MODEL`, and the three per-agent model override vars, with inline comments explaining accepted model name formats and the toggle behaviour.

#### Scenario: Developer can activate TrollLLM by uncommenting env vars
- **WHEN** a developer uncomments `TROLLLLM_BASE_URL` and `TROLLLLM_API_KEY` in `.env.local` and restarts the dev server
- **THEN** all agent requests SHALL route through TrollLLM without any code changes

#### Scenario: Commented-out vars do not affect default behaviour
- **WHEN** `TROLLLLM_BASE_URL` and `TROLLLLM_API_KEY` are commented out in `.env.local`
- **THEN** the app SHALL behave identically to the pre-integration state using direct Anthropic
