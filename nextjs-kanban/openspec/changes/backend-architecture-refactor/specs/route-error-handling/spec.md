## ADDED Requirements

### Requirement: All routes use a shared error handler wrapper
Every API route handler (GET, POST, PUT, DELETE) SHALL be wrapped with `withErrorHandler()` from `lib/api/error-handler.ts`. The wrapper SHALL catch and format errors consistently.

#### Scenario: Zod validation error returns 400
- **WHEN** a route receives a request body that fails Zod parsing
- **THEN** the response SHALL have status `400`
- **AND** the response body SHALL match `{ error: "Validation error", details: <ZodError.flatten()> }`

#### Scenario: Not found error returns 404
- **WHEN** a service throws a `NotFoundError`
- **THEN** the response SHALL have status `404`
- **AND** the response body SHALL match `{ error: "<message>" }`

#### Scenario: Invalid transition error returns 422
- **WHEN** a service throws an `InvalidTransitionError`
- **THEN** the response SHALL have status `422`
- **AND** the response body SHALL match `{ error: "<message>", from: "<status>", to: "<status>", allowed: ["<status>", ...] }`

#### Scenario: Unexpected error returns 500
- **WHEN** a route throws an unrecognized error
- **THEN** the response SHALL have status `500`
- **AND** the response body SHALL match `{ error: "Internal server error" }`
- **AND** the error SHALL be logged to the console

### Requirement: Consistent error response shape
All error responses from all routes SHALL use the shape `{ error: string, details?: object }`. No route SHALL return a different error structure.

#### Scenario: No route returns bare string errors
- **WHEN** a developer greps all route files for `NextResponse.json.*error`
- **THEN** every match SHALL be inside the `withErrorHandler` wrapper or use the standard shape

### Requirement: NotFoundError class exists
A `NotFoundError` class SHALL be exported from `lib/api/errors.ts` that extends `Error` and includes the entity type and ID for debugging.

#### Scenario: Creating a NotFoundError
- **WHEN** a service cannot find a requested entity
- **THEN** it SHALL throw `new NotFoundError('Task', id)` which produces the message `"Task not found: <id>"`
