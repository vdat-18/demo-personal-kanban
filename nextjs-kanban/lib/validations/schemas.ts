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

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
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

export const taskPipelineSchema = z.object({
  taskId: uuidSchema,
  agents: z.array(agentRoleSchema).optional(),
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
// Environment validation (called on startup)
// ─────────────────────────────────────────────────────────────────────────────

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', 'Invalid Anthropic API key').optional(),
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OpenAI API key').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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
