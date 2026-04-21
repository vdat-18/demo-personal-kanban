/**
 * Zustand stores for client-only UI state (modals, form state, ephemeral UI)
 * These are not persisted to the DB — only live in-memory on the client.
 */
import { create } from 'zustand'

// ─────────────────────────────────────────────────────────────────────────────
// Modal Store
// Controls which modal is currently open and any associated payload
// ─────────────────────────────────────────────────────────────────────────────

type ModalType = 'create-project' | 'create-task' | 'delete-confirm' | 'cancel-task' | null

interface ModalState {
  open: ModalType
  payload: Record<string, unknown>
  openModal: (type: ModalType, payload?: Record<string, unknown>) => void
  closeModal: () => void
}

export const useModalStore = create<ModalState>((set) => ({
  open: null,
  payload: {},
  openModal: (type, payload = {}) => set({ open: type, payload }),
  closeModal: () => set({ open: null, payload: {} }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Task Form Store
// Holds ephemeral form state for the task creation/edit form
// ─────────────────────────────────────────────────────────────────────────────

interface TaskFormState {
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  projectId: string | null
  setField: <K extends keyof Omit<TaskFormState, 'setField' | 'reset'>>(
    key: K,
    value: TaskFormState[K]
  ) => void
  reset: () => void
}

const defaultTaskForm = {
  title: '',
  description: '',
  priority: 'MEDIUM' as const,
  projectId: null,
}

export const useTaskFormStore = create<TaskFormState>((set) => ({
  ...defaultTaskForm,
  setField: (key, value) => set({ [key]: value } as Partial<TaskFormState>),
  reset: () => set(defaultTaskForm),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar / Navigation Store
// Tracks sidebar collapsed state and active view
// ─────────────────────────────────────────────────────────────────────────────

interface NavState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useNavStore = create<NavState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Agent Streaming Store
// Tracks the live streaming state from the agent SSE endpoint
// ─────────────────────────────────────────────────────────────────────────────

interface AgentStreamState {
  isStreaming: boolean
  currentTaskId: string | null
  events: string[]
  error: string | null
  startStream: (taskId: string) => void
  addEvent: (event: string) => void
  setError: (error: string) => void
  stopStream: () => void
}

export const useAgentStreamStore = create<AgentStreamState>((set) => ({
  isStreaming: false,
  currentTaskId: null,
  events: [],
  error: null,
  startStream: (taskId) => set({ isStreaming: true, currentTaskId: taskId, events: [], error: null }),
  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  setError: (error) => set({ error, isStreaming: false }),
  stopStream: () => set({ isStreaming: false, currentTaskId: null }),
}))
