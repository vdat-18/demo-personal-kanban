/**
 * Security utilities for the Next.js kanban application.
 * Provides path sanitization, input sanitization, and security helpers.
 */
import path from 'path'

// ─────────────────────────────────────────────────────────────────────────────
// File Path Sanitization (11.4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Allowed base directories for file operations within agent tools.
 * Any path that resolves outside these directories is rejected.
 */
const ALLOWED_DIRS = [
  process.cwd(), // project root
]

/**
 * Sanitize a file path to prevent directory traversal attacks.
 * Resolves the path and verifies it's within an allowed directory.
 *
 * @throws Error if the path tries to escape allowed directories
 */
export function sanitizeFilePath(unsafePath: string): string {
  if (!unsafePath || typeof unsafePath !== 'string') {
    throw new Error('Invalid file path: must be a non-empty string')
  }

  // Normalize: remove null bytes, trim whitespace
  const cleaned = unsafePath.replace(/\0/g, '').trim()

  if (cleaned.length === 0) {
    throw new Error('Invalid file path: empty after sanitization')
  }

  const resolved = path.resolve(cleaned)

  const isAllowed = ALLOWED_DIRS.some((dir) => {
    const normalizedDir = path.resolve(dir)
    return resolved.startsWith(normalizedDir + path.sep) || resolved === normalizedDir
  })

  if (!isAllowed) {
    throw new Error(`Access denied: path "${resolved}" is outside allowed directories`)
  }

  return resolved
}

// ─────────────────────────────────────────────────────────────────────────────
// Input Sanitization (11.6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize a string for safe inclusion in database queries.
 * Prisma uses parameterized queries so this is a belt-and-suspenders measure.
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return ''
  // Remove null bytes and control characters (except common whitespace)
  return input.replace(/\0/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * Strip HTML tags from user input to prevent XSS if content is ever rendered as HTML.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Validate and sanitize a UUID string.
 * Returns the UUID in lowercase canonical form or throws.
 */
export function sanitizeUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw new Error(`Invalid UUID: "${id}"`)
  }
  return id.toLowerCase()
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Parameter Validation (11.5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that tool parameters conform to expected types before execution.
 * Used as a guard layer on top of the Zod schemas already in the tool definitions.
 */
export function validateToolParams<T extends Record<string, unknown>>(
  params: unknown,
  required: Array<keyof T>
): T {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error('Tool parameters must be an object')
  }

  const p = params as T
  for (const key of required) {
    if (p[key] === undefined || p[key] === null) {
      throw new Error(`Missing required tool parameter: ${String(key)}`)
    }
  }

  return p
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Query Guards (11.6)
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum safe limit for database queries to prevent DoS */
export const MAX_QUERY_LIMIT = 100

/**
 * Ensure the query limit is within safe bounds.
 */
export function clampQueryLimit(limit?: number): number {
  if (limit === undefined || limit === null) return 20
  return Math.max(1, Math.min(limit, MAX_QUERY_LIMIT))
}

/**
 * Whitelist of allowed sort fields per model to prevent arbitrary column injection.
 */
export const ALLOWED_SORT_FIELDS: Record<string, string[]> = {
  tasks: ['createdAt', 'updatedAt', 'title', 'status', 'priority'],
  projects: ['createdAt', 'updatedAt', 'name'],
  conversations: ['createdAt', 'updatedAt'],
}

export function validateSortField(model: string, field: string): string {
  const allowed = ALLOWED_SORT_FIELDS[model]
  if (!allowed || !allowed.includes(field)) {
    // Fall back to safe default instead of throwing
    return 'createdAt'
  }
  return field
}
