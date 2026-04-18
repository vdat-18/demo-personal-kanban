/**
 * SSE consumer for /api/agent (mode: "chat").
 * Hook signature kept compatible with the previous implementation so existing
 * components (chat panel, column auto mode) don't have to change much.
 */
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'

// ─── Event types ──────────────────────────────────────────────────────────────
export interface StreamStartedEvent {
  type: 'started'
  role: string
}
export interface StreamTokenEvent {
  type: 'token'
  delta: string
}
export interface StreamProgressEvent {
  type: 'progress'
  [key: string]: unknown
}
export interface StreamCompleteEvent {
  type: 'complete'
  tokenUsage?: { input: number; output: number } | null
  conversation?: {
    id: string
    messages: Array<{ role: string; content: string }>
    result: string | null
    tokenUsage: unknown
    createdAt: string
  } | null
  result?: string
}
export interface StreamErrorEvent {
  type: 'error'
  error: string
}
export type StreamEvent =
  | StreamStartedEvent
  | StreamTokenEvent
  | StreamProgressEvent
  | StreamCompleteEvent
  | StreamErrorEvent

interface UseAgentStreamOptions {
  onComplete?: (
    result: string,
    tokenUsage?: { input: number; output: number } | null,
    conversation?: StreamCompleteEvent['conversation'],
  ) => void
  onError?: (error: string) => void
  onProgress?: (event: StreamProgressEvent) => void
}

interface UseAgentStreamReturn {
  /**
   * Start a streaming chat against /api/agent.
   * `role` is kept as the first argument for backward compatibility but is no
   * longer routed server-side (the unified endpoint handles role internally).
   */
  startStream: (
    role: string,
    userMessage: string,
    taskId: string,
    messages?: Array<{ role: string; content: string }>,
  ) => Promise<void>
  abort: () => void
  isStreaming: boolean
  streamingContent: string
  error: string | null
  events: StreamEvent[]
  reset: () => void
}

export function useAgentStream(options: UseAgentStreamOptions = {}): UseAgentStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [streamingContent, setStreamingContent] = useState('')

  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  const abortRef = useRef<AbortController | null>(null)
  const tasks = useKanbanStore((s) => s.tasks)

  const startStream = useCallback(
    async (
      _role: string,
      userMessage: string,
      taskId: string,
      messages?: Array<{ role: string; content: string }>,
    ) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsStreaming(true)
      setError(null)
      setEvents([])
      setStreamingContent('')

      const accumulated = { text: '' }

      // Build the message thread the agent sees: prior messages (if any) + current user prompt.
      const fullMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
        ...((messages ?? []) as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>),
        { role: 'user', content: userMessage },
      ]

      // Optional task context (read from local store on the client side).
      const task = tasks.find((t) => t.id === taskId)

      try {
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'chat',
            messages: fullMessages,
            taskTitle: task?.title,
            taskDescription: task?.description,
          }),
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

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const frames = buffer.split('\n\n')
          buffer = frames.pop() ?? ''

          for (const frame of frames) {
            for (const line of frame.split('\n')) {
              if (!line.startsWith('data: ')) continue
              try {
                const data = JSON.parse(line.slice(6)) as StreamEvent
                setEvents((prev) => [...prev, data])

                if (data.type === 'token') {
                  accumulated.text += data.delta
                  setStreamingContent(accumulated.text)
                } else if (data.type === 'complete') {
                  const finalText = data.result ?? accumulated.text
                  optionsRef.current.onComplete?.(
                    finalText,
                    data.tokenUsage,
                    data.conversation,
                  )
                  setStreamingContent('')
                  setIsStreaming(false)
                } else if (data.type === 'error') {
                  setError(data.error)
                  optionsRef.current.onError?.(data.error)
                  setStreamingContent('')
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
        if (err instanceof Error && err.name === 'AbortError') {
          setStreamingContent('')
          setIsStreaming(false)
          return
        }
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        setStreamingContent('')
        optionsRef.current.onError?.(msg)
        setIsStreaming(false)
      }
    },
    [tasks],
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreamingContent('')
    setIsStreaming(false)
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setError(null)
    setEvents([])
    setStreamingContent('')
  }, [])

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    [],
  )

  return { startStream, abort, isStreaming, streamingContent, error, events, reset }
}
