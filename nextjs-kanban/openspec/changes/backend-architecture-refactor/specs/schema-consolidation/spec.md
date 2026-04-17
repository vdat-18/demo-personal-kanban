## ADDED Requirements

### Requirement: Single source of truth for all Zod schemas
All Zod schemas used for request validation SHALL be defined in `lib/validations/schemas.ts` and imported by route files. No route file SHALL define its own Zod schema.

#### Scenario: No inline z.object() in route files
- **WHEN** a developer searches all files under `app/api/` for `z.object(`
- **THEN** there SHALL be zero matches (all schemas imported from `lib/validations/schemas.ts`)

#### Scenario: No inline z.enum() in route files
- **WHEN** a developer searches all files under `app/api/` for `z.enum(`
- **THEN** there SHALL be zero matches

### Requirement: Schema type inference used for function signatures
Service and DB layer functions SHALL use `z.infer<typeof schema>` for input parameters instead of manually redeclaring types.

#### Scenario: createTask uses schema inference
- **WHEN** a developer inspects `TaskService.create()` or `lib/db/tasks.ts:createTask()`
- **THEN** the input parameter type SHALL be derived from `z.infer<typeof createTaskSchema>` or equivalent

### Requirement: No `any` type assertions in DB layer
After refactoring, no file in `lib/db/` SHALL contain `as any` or `: any` type annotations. JSON fields (`messages`, `tokenUsage`, `toolCalls`, `mutationActions`) SHALL have explicit typed interfaces.

#### Scenario: conversations.ts has no `any`
- **WHEN** a developer searches `lib/db/conversations.ts` for `any`
- **THEN** there SHALL be zero matches for `as any` or `: any`

#### Scenario: tokenUsage field has a typed interface
- **WHEN** a developer inspects the `tokenUsage` field handling
- **THEN** it SHALL use a `TokenUsage` interface (`{ input: number; output: number }`) instead of `any` or `unknown`

### Requirement: Agent model configuration via environment variable
The AI model name SHALL be read from `process.env.AGENT_MODEL` with a default fallback of `'gpt-4o-mini'`. No agent config file SHALL contain a hardcoded model string.

#### Scenario: Changing the model requires only an env var change
- **WHEN** a developer sets `AGENT_MODEL=gpt-4o` in `.env`
- **THEN** all agent operations SHALL use `gpt-4o` without any code change

#### Scenario: No hardcoded model strings in configs
- **WHEN** a developer searches `lib/agents/configs.ts` for `gpt-`
- **THEN** there SHALL be zero matches
