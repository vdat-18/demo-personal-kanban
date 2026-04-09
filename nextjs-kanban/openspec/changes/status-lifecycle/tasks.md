## Tasks

- [x] **Task 1: Create frontend status mapping utility** — Create `lib/status-mapping.ts` with bidirectional mapping functions between frontend statuses (todo, doing, review, done, cancelled) and DB statuses (TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED). Export `toDbStatus()`, `toFrontendStatus()`, and `getAllowedFrontendTransitions()`. Include exhaustive type checking so TypeScript catches missing mappings.

- [x] **Task 2: Add transition validation to PUT /api/tasks/[id]** — In `app/api/tasks/[id]/route.ts`, import `validateTransition` from `lib/status-lifecycle`. When the request body includes a `status` field, fetch the current task, validate the transition, and return 422 with `{ error, from, to, allowed }` if invalid. Ensure no-status-change and same-status requests bypass validation.

- [x] **Task 3: Update Mission Control drag-and-drop enforcement** — In `components/mission-control/MissionControlClient.tsx`, compute allowed target columns when a drag starts using `getAllowedFrontendTransitions()`. Apply `opacity-40 pointer-events-none` CSS classes to invalid column drop zones. Reject drops on invalid targets and return the card to its original position.

- [x] **Task 4: Update status buttons to show only valid transitions** — In `components/mission-control/MissionControlClient.tsx` and `components/task-chat/TaskChatClient.tsx`, dynamically render status action buttons based on `getAllowedFrontendTransitions(currentStatus)`. Remove hardcoded button sets and replace with computed valid transitions.

- [x] **Task 5: Update useTasks mutation error handling** — In `lib/hooks/useTasks.ts`, update the `useUpdateTask` mutation's `onError` handler to detect 422 responses, parse the structured transition error body, and display a meaningful toast/message showing the allowed transitions.
