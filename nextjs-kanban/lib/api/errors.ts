/**
 * Custom error classes for API error handling.
 * Used with withErrorHandler() to produce consistent error responses.
 */

export class NotFoundError extends Error {
  readonly entity: string
  readonly entityId: string

  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`)
    this.name = 'NotFoundError'
    this.entity = entity
    this.entityId = id
  }
}
