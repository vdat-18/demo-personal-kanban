/**
 * Module-level concurrency limiter for breakdown agent calls (Tier 3.11).
 *
 * Why module-level instead of context/zustand?
 *   - Simpler API: hooks just `await acquire(taskId)`.
 *   - Survives across components (the same task can have multiple hook
 *     instances if it's shown in two places).
 *   - We don't need React reactivity beyond a snapshot of "what's active",
 *     which we expose via subscribe().
 *
 * Trade-offs:
 *   - Lost on hard refresh (acceptable — in-flight requests are aborted anyway).
 *   - Process-local (no cross-tab coordination). Two browser tabs would each
 *     have their own limit. Acceptable for POC.
 */

const DEFAULT_MAX = 3

const envLimit = Number(
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MAX_CONCURRENT_AGENT_CALLS) ?? '',
)
const MAX_CONCURRENT = Number.isFinite(envLimit) && envLimit > 0 ? envLimit : DEFAULT_MAX

type Listener = () => void

interface PendingResolver {
  taskId: string
  resolve: () => void
}

const active = new Set<string>()
const queue: PendingResolver[] = []
const listeners = new Set<Listener>()

function emit() {
  for (const fn of listeners) fn()
}

/**
 * Try to acquire a slot for `taskId`.
 *
 * - If a slot is free → returns immediately.
 * - Otherwise → returns a Promise that resolves once a slot opens up. The
 *   caller can `await` it. Pass `signal` to cancel waiting (e.g. user hit
 *   the X on a queued task).
 *
 * Acquiring is idempotent: calling acquire() twice with the same taskId
 * while it's already active is a no-op (the second resolves immediately).
 * This protects against double-clicks.
 */
export async function acquire(
  taskId: string,
  signal?: AbortSignal,
): Promise<void> {
  if (active.has(taskId)) return
  if (active.size < MAX_CONCURRENT) {
    active.add(taskId)
    emit()
    return
  }
  return new Promise<void>((resolve, reject) => {
    const entry: PendingResolver = {
      taskId,
      resolve: () => {
        active.add(taskId)
        emit()
        resolve()
      },
    }
    queue.push(entry)
    emit()
    if (signal) {
      const onAbort = () => {
        const idx = queue.indexOf(entry)
        if (idx >= 0) queue.splice(idx, 1)
        emit()
        reject(new DOMException('Acquire aborted', 'AbortError'))
      }
      if (signal.aborted) onAbort()
      else signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

/**
 * Release the slot held by `taskId` and wake up the next queued task (if any).
 * Always call this in a finally block.
 */
export function release(taskId: string): void {
  const wasActive = active.delete(taskId)
  if (!wasActive) return
  const next = queue.shift()
  if (next) next.resolve()
  emit()
}

/** True when `taskId` is currently consuming a slot. */
export function isActive(taskId: string): boolean {
  return active.has(taskId)
}

/** Position in queue (0-based). Returns -1 if not queued or already active. */
export function getQueuePosition(taskId: string): number {
  return queue.findIndex((e) => e.taskId === taskId)
}

/** Snapshot for UI display (footer feed, debug). */
export interface ConcurrencySnapshot {
  active: string[]
  queue: string[]
  limit: number
}

export function getSnapshot(): ConcurrencySnapshot {
  return {
    active: Array.from(active),
    queue: queue.map((e) => e.taskId),
    limit: MAX_CONCURRENT,
  }
}

/**
 * Subscribe to changes (active/queue mutations). Returns an unsubscribe fn.
 * Components use this through useSyncExternalStore for cheap reactivity.
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const CONCURRENCY_LIMIT = MAX_CONCURRENT
