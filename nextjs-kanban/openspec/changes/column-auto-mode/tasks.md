## 1. Auto-Mode Constants and Configuration

- [x] 1.1 Create `lib/auto-mode/constants.ts` — define `AUTO_MODE_COLUMNS` (TODO, IN_PROGRESS, IN_REVIEW), `COLUMN_AGENT_MAP` mapping each column to its agent role (architect, developer, reviewer), and `DEFAULT_PROMPTS` with the default prompt text for each column
- [x] 1.2 Export `AutoModeStatus` type (`'idle' | 'running' | 'error' | 'disabled'`) and `AutoModeColumnState` interface (`{ enabled: boolean, status: AutoModeStatus, activeTaskId: string | null, error: string | null }`)

## 2. Auto-Mode Hook

- [x] 2.1 Create `lib/hooks/useColumnAutoMode.ts` — implement the `useColumnAutoMode` hook that manages enabled/disabled state per column, exposes `toggle(columnId)`, `stop(columnId)`, and returns `{ columnStates: Record<string, AutoModeColumnState>, toggle, stop }`
- [x] 2.2 Implement task queue logic inside the hook — when a column is enabled, find the oldest task in that column (sorted by `createdAt`), dispatch the mapped agent using `useAgentStream`, and track the active task ID
- [x] 2.3 Implement auto-advance logic — on successful agent completion (`onComplete` callback), call `updateTaskStatus` to advance the task to the next status via `getNextStatus`, then pick up the next task in the queue
- [x] 2.4 Implement error handling — on agent error (`onError` callback), set column status to `'error'`, disable auto mode on that column, preserve the failed task in its current status, and store the error message in column state
- [x] 2.5 Implement idle detection — when auto mode is enabled but no tasks remain in the column, set status to `'idle'` and watch for new tasks entering the column (react to `project.tasks` state changes)

## 3. Column Header UI — Auto-Mode Toggle

- [x] 3.1 Create `components/mission-control/AutoModeToggle.tsx` — a toggle button component that accepts `enabled`, `status`, `activeTaskTitle`, and `onToggle` props. Render a play/pause icon toggle with a status pill (Idle / Running / Error)
- [x] 3.2 Integrate `AutoModeToggle` into the column header in `MissionControlClient.tsx` — render it next to the existing `MoreHorizontal` button for columns in `AUTO_MODE_COLUMNS`, pass the column state from `useColumnAutoMode`

## 4. Task Card Auto-Processing Indicator

- [x] 4.1 Add auto-processing visual state to task cards in `MissionControlClient.tsx` — when a task's ID matches the `activeTaskId` from auto-mode state, add a pulsing border/glow effect and an "Auto-processing" badge
- [x] 4.2 Disable drag on auto-processing cards — set `draggable={false}` and remove the `onDragStart` handler for tasks currently being auto-processed
- [x] 4.3 Disable click navigation on auto-processing cards — prevent navigating to `/chat/[id]` while a task is being auto-processed

## 5. Column Status Indicator

- [x] 5.1 Create `components/mission-control/AutoModeStatusBar.tsx` — a compact indicator bar rendered below the column header showing: "Auto: Idle" (green dot), "Auto: Running — {taskTitle}" (blue pulsing dot), or "Auto: Error — {errorMessage}" (red dot with dismiss action)
- [x] 5.2 Integrate `AutoModeStatusBar` into column rendering in `MissionControlClient.tsx` — render it between the column header and the task list area, only for columns with auto mode enabled

## 6. Wire Up Hook to MissionControlClient

- [x] 6.1 Initialize `useColumnAutoMode` in `MissionControlClient` — pass `project.tasks`, `updateTaskStatus`, and the task list refresh callback. Connect the hook's state to the toggle and indicator components
- [x] 6.2 Ensure auto-mode status updates propagate — when `updateTaskStatus` succeeds and the project state updates, the hook should detect the task has moved out of the column and pick up the next one
- [x] 6.3 Handle edge case: manual task movement while auto mode is active — if a user manually drags a non-processing task out of an auto-enabled column, the queue should adjust without errors

## 7. Footer Stats Update

- [x] 7.1 Add auto-mode indicator to footer — show how many columns have auto mode enabled (e.g., "Auto: 2/3 columns") in the footer stats bar to give users a global awareness of automation state

## 8. Testing and Verification

- [x] 8.1 Verify auto-mode toggle enables/disables correctly on each actionable column and does not appear on DONE/BLOCKED columns
- [x] 8.2 Verify sequential task processing — enable auto mode on a column with multiple tasks and confirm they process one at a time in creation-date order
- [x] 8.3 Verify automatic status advancement — confirm tasks move to the correct next status after successful agent completion
- [x] 8.4 Verify error handling — simulate an agent error and confirm auto mode pauses, the task remains in place, and the error indicator appears
- [x] 8.5 Verify drag protection — confirm auto-processing task cards cannot be dragged
- [x] 8.6 Verify conversation persistence — confirm auto-mode agent runs create conversation records visible in the task chat page
