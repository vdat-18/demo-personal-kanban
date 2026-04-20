/**
 * Timing module — track per-mode AI call durations to show realistic ETA.
 *
 * Persists in localStorage (no server). Each mode keeps a rolling window of
 * the 10 most recent successful durations; the median is used as ETA.
 *
 * Used by hooks that wrap /api/agent calls (Doer, Reviewer, Breakdown,
 * planning chat) so users see "Thường mất ~25s · đã chạy 8s" instead of
 * a black-box spinner.
 */

const STORAGE_KEY = 'pi-kanban-poc:agent-timings'
const WINDOW_SIZE = 10

export type AgentMode = 'plan' | 'chat' | 'doer' | 'reviewer' | 'breakdown'

const DEFAULT_ETA_MS: Record<AgentMode, number> = {
  plan: 15_000,
  chat: 8_000,
  doer: 25_000,
  reviewer: 20_000,
  breakdown: 12_000,
}

type TimingsMap = Partial<Record<AgentMode, number[]>>

function readTimings(): TimingsMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed != null ? parsed : {}
  } catch {
    return {}
  }
}

function writeTimings(map: TimingsMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore quota errors */
  }
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Record a successful call's wall-clock duration in ms. */
export function recordDuration(mode: AgentMode, durationMs: number): void {
  if (durationMs <= 0 || !Number.isFinite(durationMs)) return
  const map = readTimings()
  const arr = map[mode] ?? []
  arr.push(durationMs)
  while (arr.length > WINDOW_SIZE) arr.shift()
  map[mode] = arr
  writeTimings(map)
}

/** Estimated time-to-completion for a given mode. Falls back to a
 *  hard-coded baseline when no history exists yet. */
export function getEtaMs(mode: AgentMode): number {
  const map = readTimings()
  const arr = map[mode] ?? []
  if (arr.length === 0) return DEFAULT_ETA_MS[mode]
  return Math.round(median(arr))
}

/** Format ms → "~25s" / "~1m 20s" — kept simple for Vietnamese UI. */
export function formatEta(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000))
  if (seconds < 60) return `~${roundTo5(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `~${m}m` : `~${m}m ${s}s`
}

function roundTo5(seconds: number): number {
  if (seconds <= 5) return seconds
  return Math.round(seconds / 5) * 5
}

/**
 * Threshold helper for "đang lâu hơn bình thường" warning.
 * Returns true once elapsed > 1.5× ETA.
 */
export function isOverEta(elapsedMs: number, etaMs: number): boolean {
  return elapsedMs > etaMs * 1.5
}

/** Auto-abort threshold (3× ETA) — caller decides whether to enforce. */
export function isFarOverEta(elapsedMs: number, etaMs: number): boolean {
  return elapsedMs > etaMs * 3
}
