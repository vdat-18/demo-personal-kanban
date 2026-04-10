## Context

The current project consists of:
- **Frontend**: Vite-based React app with TypeScript, using React Router, Zustand for state management, Tailwind CSS, and shadcn/ui components
- **Server**: Node.js backend server
- **Open-Multi-Agent**: A TypeScript framework for multi-agent orchestration (already in the monorepo at `open-multi-agent/`)

The existing UI includes pages for Home, Mission Control, Task Chat, Planning Screen, Task Summary, and Directory. The frontend communicates with the server and uses Zustand for client-side state management.

We need to create a **separate** Next.JS application that:
1. Preserves the existing UI/UX from the Vite frontend
2. Integrates directly with open-multi-agent framework (no separate server needed - it runs in the same Node process)
3. Adds PostgreSQL for persistent storage
4. Leverages Next.JS SSR/SSG capabilities for better performance

## Goals / Non-Goals

**Goals:**
- Create a standalone Next.JS 16 application in a new directory (e.g., `nextjs-kanban/`)
- Migrate all UI components, pages, and layouts from the Vite frontend
- Integrate open-multi-agent framework directly in Next.JS API routes and server actions
- Set up PostgreSQL with Prisma ORM for data persistence
- Support real-time agent communication via Server-Sent Events (SSE) or streaming
- Maintain feature parity with current Vite frontend while adding server-side capabilities

**Non-Goals:**
- Modifying or replacing the existing Vite frontend (both apps coexist)
- Real-time WebSocket communication (SSE is sufficient for agent streaming)
- Complex authentication/authorization (can be added later as separate capability)
- Multi-tenancy or user management (out of scope for initial version)

## Decisions

### 1. Next.JS App Router vs Pages Router

**Decision**: Use **App Router** (Next.JS 16)

**Rationale**:
- App Router is the recommended approach with better support for React Server Components
- Native support for streaming and SSE via route handlers
- Better integration with server actions for data mutations
- Modern patterns with layouts, loading states, and error boundaries

**Alternatives Considered**:
- Pages Router: More mature but lacks RSC support and streaming capabilities
- Custom server: Defeats the purpose of using Next.JS managed infrastructure

### 2. Database ORM: Prisma vs Drizzle vs Raw SQL

**Decision**: **Prisma ORM**

**Rationale**:
- Type-safe database client with excellent TypeScript integration
- Declarative schema definition with migrations
- Built-in connection pooling and query optimization
- Great developer experience with Prisma Studio
- Works well with Next.JS and serverless environments

**Alternatives Considered**:
- Drizzle: Lighter weight but less mature tooling
- Raw SQL: More control but requires manual type definitions and migrations

### 3. Open-Multi-Agent Integration Strategy

**Decision**: **Direct framework import in API routes and server actions**

**Rationale**:
- Open-multi-agent is a TypeScript framework that runs in Node.js - no separate server needed
- Can be imported directly: `import { OpenMultiAgent } from '@jackchen_me/open-multi-agent'`
- API routes handle agent orchestration and return streaming responses
- Server actions can handle simpler operations
- No additional infrastructure complexity

**Alternatives Considered**:
- Run open-multi-agent as a separate microservice: Adds deployment complexity and network latency
- Call existing Python server: Unnecessary since open-multi-agent is TypeScript-native

### 4. State Management: Zustand vs Server State

**Decision**: **Hybrid approach - Server state with React Query + Zustand for client-only state**

**Rationale**:
- React Query (TanStack Query) for server-state (tasks, projects, conversations)
- Zustand for client-only UI state (modals, temporary form data)
- Leverages Next.JS caching and revalidation strategies
- Reduces client-side complexity and improves data consistency

**Alternatives Considered**:
- Pure Zustand: Works but doesn't leverage Next.JS server capabilities
- Redux: Overkill for this use case
- Pure server state: Some UI state still needs client-side management

### 5. UI Component Migration Strategy

**Decision**: **Incremental migration with shadcn/ui components**

**Rationale**:
- Current frontend uses shadcn/ui which works with Next.JS
- Copy component files directly to Next.JS app structure
- Adjust imports for Next.JS App Router conventions
- Minimal refactoring needed since both use React + Tailwind

**Alternatives Considered**:
- Rewrite from scratch: Time-consuming and error-prone
- Use different component library: Unnecessary learning curve

### 6. Real-time Updates for Agent Communication

**Decision**: **Server-Sent Events (SSE) with streaming route handlers**

**Rationale**:
- Native support in Next.JS App Router via route handlers
- Simpler than WebSockets for server-to-client streaming
- Works well with open-multi-agent's `onProgress` callback
- Can stream agent progress events in real-time

**Alternatives Considered**:
- WebSockets: More complex, requires additional infrastructure
- Polling: Inefficient for real-time agent updates

### 7. Project Structure

**Decision**: **New directory `nextjs-kanban/` at repository root**

**Rationale**:
- Keeps the new app separate from existing frontend
- Clear separation allows both apps to coexist
- Follows monorepo pattern already in use
- Can share types and utilities if needed later

**Structure**:
```
nextjs-kanban/
├── app/                    # Next.JS App Router
│   ├── (routes)/          # Route groups
│   │   ├── chat/[id]/
│   │   ├── planning/[id?]/
│   │   ├── mission-control/[id]/
│   │   ├── summary/[id]/
│   │   └── directory/
│   ├── api/               # API route handlers
│   │   ├── agents/        # Agent orchestration endpoints
│   │   └── tasks/         # Task CRUD operations
│   ├── layout.tsx
│   └── page.tsx
├── components/            # UI components (migrated from frontend)
├── lib/
│   ├── db/               # Prisma client and queries
│   ├── agents/           # Open-multi-agent configurations
│   └── utils.ts
├── prisma/
│   └── schema.prisma
└── package.json
```

## Risks / Trade-offs

### Risk 1: Breaking changes in open-multi-agent API
**Impact**: Medium | **Mitigation**: Pin to specific version, add integration tests, monitor framework updates

### Risk 2: Complex agent state management across server/client
**Impact**: Medium | **Mitigation**: Use SSE for streaming, store conversation state in Postgres, implement proper cleanup

### Risk 3: Database connection pooling in serverless environments
**Impact**: Low | **Mitigation**: Use Prisma's built-in connection pooling, configure appropriate pool size

### Risk 4: UI migration missing edge cases
**Impact**: Low | **Mitigation**: Incremental migration, test each page thoroughly, maintain feature checklist

### Risk 5: Performance with large agent conversations
**Impact**: Medium | **Mitigation**: Implement pagination for conversations, use database indexes, consider archival strategy

### Trade-off 1: Server-side rendering vs client-side interactivity
**Chosen**: Hybrid - SSR for initial load, client for interactions
**Rationale**: Best of both worlds - fast initial load + responsive UI

### Trade-off 2: Simple auth vs complex user management
**Chosen**: No authentication in initial version
**Rationale**: Can be added later without blocking core functionality

## Migration Plan

### Phase 1: Foundation (Week 1)
1. Initialize Next.JS 16 project with TypeScript and Tailwind
2. Set up Prisma with PostgreSQL schema
3. Configure environment variables and database connection
4. Install open-multi-agent and verify integration

### Phase 2: UI Migration (Week 2)
1. Copy UI components from Vite frontend
2. Migrate pages to App Router structure
3. Set up layouts and routing
4. Test each migrated page

### Phase 3: Agent Integration (Week 3)
1. Create API routes for agent orchestration
2. Implement SSE streaming for agent progress
3. Connect UI to agent endpoints
4. Store conversation history in Postgres

### Phase 4: Data Persistence (Week 4)
1. Implement CRUD operations for tasks and projects
2. Add database migrations
3. Implement data seeding if needed
4. Test data integrity

### Phase 5: Testing & Polish (Week 5)
1. End-to-end testing of all features
2. Performance optimization
3. Error handling and edge cases
4. Documentation

**Rollback Strategy**: Since this is a new separate app, no rollback needed - can continue using Vite frontend if issues arise.

## Open Questions

1. **Should we migrate the existing server's functionality or start fresh?**
   - Recommendation: Start fresh in Next.JS API routes, decommission old server later

2. **What data needs to be migrated from the existing system (if any)?**
   - Need to clarify: Is there existing data in the current system that needs migration?

3. **Should agent configurations be stored in the database or code?**
   - Recommendation: Start with code-based configs, can add DB storage later for customization

4. **What's the deployment strategy for the Next.JS app?**
   - Need to clarify: Vercel, Docker, or other platform?

5. **Should we implement rate limiting for agent API calls?**
   - Recommendation: Yes, to prevent abuse and manage API costs
