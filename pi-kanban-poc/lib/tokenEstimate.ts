/**
 * Cheap token estimate for pre-call hints.
 *
 * Uses the rule-of-thumb `chars / 4 ≈ tokens` which is accurate enough for
 * "≈ 8k tokens" UI hints. NOT precise enough for billing.
 */

export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

/** Combined estimate for an array of message-shaped objects. */
export function estimateTokensFromMessages(
  messages: Array<{ content?: string | null }>,
): number {
  let total = 0
  for (const m of messages) {
    total += estimateTokens(m?.content ?? '')
  }
  return total
}

/** Friendly short label: 1234 → "1.2k", 12 → "12". */
export function formatTokenCount(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
}
