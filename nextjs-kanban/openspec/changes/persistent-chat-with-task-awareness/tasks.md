## 1. Database Schema & Migration

- [x] 1.1 Add `PlanningThread` model to `prisma/schema.prisma` with fields: `id` (UUID), `projectId` (FK to Project), `title` (String), `createdAt`, `updatedAt`; add relation to Project model
- [x] 1.2 Add `PlanningMessage` model to `prisma/schema.prisma` with fields: `id` (UUID), `threadId` (FK to PlanningThread), `role` (enum: user/assistant/system), `content` (Text), `tokenUsage` (Json?), `createdAt`; add cascade delete on thread
- [x] 1.3 Run `prisma migrate dev` to generate and apply the migration
- [x] 1.4 Run `prisma generate` to regenerate the Prisma client

## 2. Database Access Layer

- [x] 2.1 Create `lib/db/planning-threads.ts` with functions: `getThreadsByProject(projectId)`, `getThread(id)`, `createThread(projectId, title?)`, `deleteThread(id)`
- [x] 2.2 Create `lib/db/planning-messages.ts` with functions: `getMessagesByThread(threadId)`, `createMessage(threadId, role, content, tokenUsage?)`, `getRecentMessages(threadId, limit)`
- [x] 2.3 Add Zod validation schemas for planning thread/message inputs to `lib/validations/schemas.ts`

## 3. API Routes

- [x] 3.1 Create `app/api/planning-threads/route.ts` — `GET` (list threads by projectId query param) and `POST` (create thread with projectId)
- [x] 3.2 Create `app/api/planning-threads/[id]/route.ts` — `GET` (get single thread) and `DELETE` (delete thread with cascade)
- [x] 3.3 Create `app/api/planning-threads/[id]/messages/route.ts` — `GET` (list messages for thread) and `POST` (send user message, call AI, persist both user + assistant messages, return response)

## 4. Enhanced AI Prompt with Task Awareness

- [x] 4.1 Update `buildPlanPrompt` in `lib/agents/prompts.ts` to accept and include the full project task list (title, status, priority, description) in the prompt context, limited to 50 most recent tasks
- [x] 4.2 Add task-mutation instruction block to the planning prompt — instruct the AI it can propose add/update/delete actions using a `task-mutations` fenced code block format
- [x] 4.3 Update `buildPlanPrompt` to accept conversation history (last 20 messages) and include them in the prompt for conversational continuity
- [x] 4.4 Update the `POST /api/planning-threads/[id]/messages` route to call the enhanced `buildPlanPrompt` with task list and thread history

## 5. Frontend — Thread List Sidebar

- [x] 5.1 Create `components/planning/ThreadListSidebar.tsx` — displays all threads for the project, sorted by most recently updated, with title and timestamp; highlights active thread
- [x] 5.2 Add "New Thread" button to the sidebar that calls `POST /api/planning-threads` and switches to the new thread
- [x] 5.3 Add thread delete action (with confirmation dialog) that calls `DELETE /api/planning-threads/[id]` and switches to the most recent remaining thread
- [x] 5.4 Create `lib/hooks/usePlanningThreads.ts` — React Query hook for fetching, creating, and deleting threads

## 6. Frontend — Persistent Chat Panel

- [x] 6.1 Rewrite `PlanningClient.tsx` to use the three-panel layout: `[ThreadList | Chat | Tasks]`
- [x] 6.2 Replace in-memory message state with data fetched from `GET /api/planning-threads/[id]/messages`; send messages via `POST /api/planning-threads/[id]/messages`
- [x] 6.3 Create `lib/hooks/usePlanningMessages.ts` — React Query hook for fetching messages and sending new messages (with optimistic update for user message)
- [x] 6.4 Implement auto-create first thread on page load when project has no threads (call create thread, then select it)
- [x] 6.5 Update the planning page server component `app/(routes)/planning/[id]/page.tsx` to prefetch threads for the project and pass them as initial data

## 7. Frontend — Task Mutation Cards

- [x] 7.1 Create a `parseTaskMutations(content: string)` utility that extracts `task-mutations` JSON blocks from AI markdown responses
- [x] 7.2 Create `components/planning/TaskMutationCard.tsx` — renders a single proposed mutation (add/update/delete) with Approve and Dismiss buttons
- [x] 7.3 Integrate `TaskMutationCard` into the chat message renderer — when an assistant message contains parsed mutations, render them inline below the markdown content
- [x] 7.4 Wire Approve button to call the appropriate API (`POST /api/tasks`, `PUT /api/tasks/[id]`, or `DELETE /api/tasks/[id]`) and refresh the task panel
- [x] 7.5 Wire Dismiss button to visually mark the card as dismissed (local state, no API call)

## 8. Frontend — Always-Visible Task Panel

- [x] 8.1 Extract the task panel from the current `PlanningClient.tsx` into a standalone `components/planning/TaskPanel.tsx` component
- [x] 8.2 Ensure the task panel fetches tasks independently (via React Query) and re-fetches when mutations are approved from chat
- [x] 8.3 Keep the existing "Generate Tasks" and "Add Task" buttons functional in the new task panel
- [x] 8.4 Add the "Start Execution →" button at the bottom of the task panel (carried over from current implementation)

## 9. Integration & Polish

- [x] 9.1 Update the welcome message in new threads to mention that the AI can see and manage tasks
- [x] 9.2 Add loading states for thread list, message loading, and message sending
- [x] 9.3 Handle error states — API failures for thread/message operations with user-visible error banners
- [ ] 9.4 Test the full flow: create project → open planning → chat → AI suggests tasks → approve → see tasks in panel → create new thread → switch back → messages persisted (pending: Docker daemon is down)
