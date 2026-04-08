import { useState, useCallback, useRef, useEffect } from 'react'
import type { AgentRole } from '@/lib/agents/configs'

// ─── Event types emitted from the SSE stream ──────────────────────────────────
export interface StreamStartedEvent { type: 'started'; role: string }
export interface StreamProgressEvent { type: 'progress'; [key: string]: unknown }
export interface StreamCompleteEvent { type: 'complete'; result: unknown; tokenUsage?: { input: number; output: number } | null }
export interface StreamErrorEvent { type: 'error'; error: string }
export type StreamEvent =
  | StreamStartedEvent
  | StreamProgressEvent
  | StreamCompleteEvent
  | StreamErrorEvent

// ─── Hook options and return ──────────────────────────────────────────────────
interface UseAgentStreamOptions {
  onComplete?: (result: unknown, tokenUsage?: { input: number; output: number } | null) => void
  onError?: (error: string) => void
  onProgress?: (event: StreamProgressEvent) => void
}

interface UseAgentStreamReturn {
  /** Start an SSE stream for the given agent role and prompt */
  startStream: (role: AgentRole | string, prompt: string, taskId?: string) => Promise<void>
  /** Abort an in-flight stream */
  abort: () => void
  isStreaming: boolean
  error: string | null
  events: StreamEvent[]
  reset: () => void
}

// ─── Implementation ───────────────────────────────────────────────────────────
export function useAgentStream(options: UseAgentStreamOptions = {}): UseAgentStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<StreamEvent[]>([])

  // Keep a stable ref to options so callbacks don't need to be in dep arrays
  const optionsRef = useRef(options)
  useEffect(() => { optionsRef.current = options })

  // AbortController ref — lets us cancel fetch + reader from abort() or unmount
  const abortRef = useRef<AbortController | null>(null)

  const startStream = useCallback(async (
    role: AgentRole | string,
    prompt: string,
    taskId?: string,
  ) => {
    // Cancel any previous in-flight stream
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsStreaming(true)
    setError(null)
    setEvents([])

    try {
      const response = await fetch('/api/agents/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, prompt, ...(taskId ? { taskId } : {}) }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body available')

      const decoder = new TextDecoder()
      let buffer = ''

      // Read chunks until the stream is closed or aborted
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by double newlines
        const frames = buffer.split('\n\n')
        // The last element may be an incomplete frame — keep it in the buffer
        buffer = frames.pop() ?? ''

        for (const frame of frames) {
          for (const line of frame.split('\n')) {
            if (!line.startsWith('data: ')) continue
            try {
              const data = JSON.parse(line.slice(6)) as StreamEvent
              setEvents((prev) => [...prev, data])

              if (data.type === 'complete') {
                optionsRef.current.onComplete?.(data.result, data.tokenUsage)
                setIsStreaming(false)
              } else if (data.type === 'error') {
                setError(data.error)
                optionsRef.current.onError?.(data.error)
                setIsStreaming(false)
              } else if (data.type === 'progress') {
                optionsRef.current.onProgress?.(data as StreamProgressEvent)
              }
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }
      }
    } catch (err) {
      // AbortError means we intentionally cancelled — don't surface as an error
      if (err instanceof Error && err.name === 'AbortError') {
        setIsStreaming(false)
        return
      }
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      optionsRef.current.onError?.(msg)
      setIsStreaming(false)
    }
  }, []) // no deps — stable function reference

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setError(null)
    setEvents([])
  }, [])

  // Cleanup: abort any in-flight stream when the component unmounts (9.9)
  useEffect(() => () => { abortRef.current?.abort() }, [])

  return { startStream, abort, isStreaming, error, events, reset }
}

