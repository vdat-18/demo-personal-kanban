/**
 * React adapter for the module-level concurrency manager (Tier 3.11).
 * Emits a fresh snapshot whenever active/queue changes so the footer can
 * render "AI working on N tasks" without re-subscribing manually.
 */
'use client'

import { useSyncExternalStore } from 'react'
import {
  getSnapshot,
  subscribe,
  type ConcurrencySnapshot,
} from '@/lib/breakdown/concurrency'

export function useBreakdownConcurrency(): ConcurrencySnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
