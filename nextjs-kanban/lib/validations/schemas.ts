/**
 * Centralised Zod validation schemas for all API inputs.
 * Import from here rather than duplicating schemas across route files.
 */
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid('Must be a valid UUID')

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

// ─────────────────────────────────────────────────────────────────────────────
// Task schemas
// ─────────────────────────────────────────────────────────────────────────────

export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'])
export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  status: taskStatusSchema.default('TODO'),
  priority: taskPrioritySchema.default('MEDIUM'),
  projectId: uuidSchema.optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  projectId: uuidSchema.optional().nullable(),
})

export const taskQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  projectId: uuidSchema.optional(),
  ...paginationSchema.shape,
})

// ─────────────────────────────────────────────────────────────────────────────
// Project schemas
// ─────────────────────────────────────────────────────────────────────────────

export const projectDomainSchema = z.enum([
  'SOFTWARE_ENGINEERING',
  'MARKETING',
  'SALES',
  'LOGISTICS',
])

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  domain: projectDomainSchema.default('SOFTWARE_ENGINEERING'),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.string().max(50).optional().nullable(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Conversation schemas
// ─────────────────────────────────────────────────────────────────────────────

export const conversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(50000),
  timestamp: z.union([z.string().datetime(), z.date()]).optional(),
  toolCalls: z.unknown().optional(),
})

export const createConversationSchema = z.object({
  taskId: uuidSchema.optional(),
  messages: z.array(conversationMessageSchema).min(1, 'At least one message required'),
  result: z.string().max(50000).optional().nullable(),
  tokenUsage: z
    .object({
      input: z.number().int().nonnegative(),
      output: z.number().int().nonnegative(),
    })
    .optional()
    .nullable(),
})

export const conversationQuerySchema = z.object({
  taskId: uuidSchema.optional(),
  ...paginationSchema.shape,
})

// ─────────────────────────────────────────────────────────────────────────────
// Agent schemas
// ─────────────────────────────────────────────────────────────────────────────

export const agentRoleSchema = z.enum(['architect', 'developer', 'reviewer'])

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

export const chatStreamSchema = z.object({
  role: agentRoleSchema,
  userMessage: z.string().min(1).max(10000),
  taskId: uuidSchema,
  messages: z.array(chatMessageSchema).optional(),
})

export const planRequestSchema = z.object({
  projectId: uuidSchema,
  userMessage: z.string().min(1).max(10000),
})

export const runAgentSchema = z.object({
  role: agentRoleSchema,
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long'),
})

export const streamAgentSchema = z.object({
  role: agentRoleSchema,
  prompt: z.string().min(1).max(10000),
  taskId: uuidSchema.optional(),
})

export const teamAgentSchema = z.object({
  goal: z.string().min(1).max(10000),
  agents: z.array(agentRoleSchema).min(1, 'At least one agent required'),
})

export const runTasksItemSchema = z.object({
  agent: agentRoleSchema,
  prompt: z.string().min(1, 'Prompt is required'),
  dependencies: z.array(z.string()).optional(),
})

export const runTasksSchema = z.object({
  tasks: z.array(runTasksItemSchema).min(1, 'At least one task is required'),
})

export const taskPipelineSchema = z.object({
  taskId: uuidSchema,
  agents: z.array(agentRoleSchema).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Mutation action schema (for planning message mutations)
// ─────────────────────────────────────────────────────────────────────────────

export const mutationActionSchema = z.object({
  mutationIndex: z.number().int().min(0),
  action: z.enum(['approved', 'dismissed']),
})

// ─────────────────────────────────────────────────────────────────────────────
// Generate-tasks schema
// ─────────────────────────────────────────────────────────────────────────────

export const generateTasksMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(50000),
})

export const generateTasksSchema = z.object({
  projectId: uuidSchema,
  messages: z
    .array(generateTasksMessageSchema)
    .min(1, 'At least one message is required'),
})

// ─────────────────────────────────────────────────────────────────────────────
// Planning Thread / Message schemas
// ─────────────────────────────────────────────────────────────────────────────

export const planningMessageRoleSchema = z.enum(['user', 'assistant', 'system'])

export const createPlanningThreadSchema = z.object({
  projectId: uuidSchema,
  title: z.string().max(200, 'Title too long').optional(),
})

export const planningThreadQuerySchema = z.object({
  projectId: uuidSchema,
})

export const planningPhaseSchema = z.enum(['discovery', 'blueprint', 'task_mapping'])

export const sendPlanningMessageSchema = z.object({
  content: z.string().min(1, 'Message is required').max(10000, 'Message too long'),
})

export const updatePlanningThreadSchema = z.object({
  title: z.string().max(200).optional(),
  phase: planningPhaseSchema.optional(),
  visionDocument: z.string().max(20000).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Environment validation (called on startup)
// ─────────────────────────────────────────────────────────────────────────────

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', 'Invalid Anthropic API key').optional(),
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OpenAI API key').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AGENT_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AGNO_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  AGENT_BACKEND: z.enum(['agno', 'multi-agent']).default('agno'),
})

export type EnvConfig = z.infer<typeof envSchema>

/**
 * Validate environment variables. Returns validated env or throws with details.
 * Call once at startup (e.g., in instrumentation.ts or layout.tsx).
 */
export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  return result.data
}

/**
 * Returns the configured AI model name from AGENT_MODEL env var,
 * defaulting to 'gpt-4o-mini'.
 */
export function getAgentModel(): string {
  return process.env.AGENT_MODEL || 'gpt-4o-mini'
}
