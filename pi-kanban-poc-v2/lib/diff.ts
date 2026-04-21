/**
 * Minimal line-by-line diff helper for the vision document version drawer.
 *
 * We use a straightforward LCS (longest common subsequence) backtrack to emit
 * unified-style hunks. This is intentionally dependency-free — the feature is
 * visual (a few hundred lines of markdown) and a full myers/fastdiff library
 * would be overkill.
 *
 * Output contract:
 *   [
 *     { kind: 'context', text: '...' },
 *     { kind: 'added', text: '...' },
 *     { kind: 'removed', text: '...' },
 *   ]
 *
 * Consumers render each entry with a colour — green for `added`, red for
 * `removed`, neutral for `context`.
 */

export type DiffLineKind = 'context' | 'added' | 'removed'

export interface DiffLine {
  kind: DiffLineKind
  text: string
}

/** Classic LCS table then a standard backtrack to recover the edit script. */
export function diffLines(a: string, b: string): DiffLine[] {
  const left = (a ?? '').split('\n')
  const right = (b ?? '').split('\n')
  const m = left.length
  const n = right.length

  // lcs[i][j] = length of LCS between left[0..i) and right[0..j)
  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (left[i - 1] === right[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1])
      }
    }
  }

  const out: DiffLine[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (left[i - 1] === right[j - 1]) {
      out.push({ kind: 'context', text: left[i - 1] })
      i--
      j--
    } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
      out.push({ kind: 'removed', text: left[i - 1] })
      i--
    } else {
      out.push({ kind: 'added', text: right[j - 1] })
      j--
    }
  }
  while (i > 0) {
    out.push({ kind: 'removed', text: left[i - 1] })
    i--
  }
  while (j > 0) {
    out.push({ kind: 'added', text: right[j - 1] })
    j--
  }
  return out.reverse()
}

/** Summarize the diff for glance-reading: counts of added/removed lines. */
export function summarizeDiff(diff: DiffLine[]): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const line of diff) {
    if (line.kind === 'added') added++
    else if (line.kind === 'removed') removed++
  }
  return { added, removed }
}
