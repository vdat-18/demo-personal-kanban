/**
 * Design tokens — single source of truth for sizing & visual scale.
 *
 * Background: the codebase grew with mixed scales (text-[10px] in functional
 * UI, text-8xl in marketing surfaces, rounded-[4rem] modals, padding-16 hero
 * cards, etc.). New surfaces should pull tokens from here so we converge on a
 * coherent system rather than re-inventing scale per component.
 *
 * Use these tokens as `className={t.button.primary}` or as building blocks
 * inside component `className`. They are plain Tailwind utility strings so
 * Tailwind's JIT picks them up at build time (the strings are present
 * verbatim in source).
 */

export const t = {
  // ─── Type scale (8-point) ────────────────────────────────────────────────
  text: {
    display: 'text-3xl md:text-4xl font-bold tracking-tight',
    h1: 'text-2xl font-bold tracking-tight',
    h2: 'text-lg font-bold tracking-tight',
    h3: 'text-base font-semibold',
    body: 'text-sm leading-relaxed',
    small: 'text-xs',
    micro: 'text-[11px]', // floor — anything smaller fails non-tech readability
  },

  // ─── Border-radius scale ─────────────────────────────────────────────────
  radius: {
    sm: 'rounded-lg',  // 8px  — chips, badges
    md: 'rounded-xl',  // 12px — buttons, inputs
    lg: 'rounded-2xl', // 16px — cards
    xl: 'rounded-3xl', // 24px — modals, panels
  },

  // ─── Padding scale ───────────────────────────────────────────────────────
  pad: {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },

  // ─── Container widths ────────────────────────────────────────────────────
  container: {
    reading: 'max-w-3xl mx-auto',  // long-form text — comfortable line length
    dashboard: 'max-w-7xl mx-auto',
    modal: {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
    },
  },

  // ─── Button presets ──────────────────────────────────────────────────────
  button: {
    primary:
      'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a192f] text-white text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-95 shadow-sm',
    secondary:
      'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-[#0a192f] text-sm font-semibold hover:bg-slate-200 transition-colors active:scale-95',
    ghost:
      'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-colors active:scale-95',
    danger:
      'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors active:scale-95 shadow-sm',
  },

  // ─── Card / panel presets ────────────────────────────────────────────────
  card: {
    base: 'bg-white rounded-2xl border border-slate-100 shadow-sm',
    hover:
      'bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300',
  },

  // ─── Color tokens ────────────────────────────────────────────────────────
  // Centralized so dark-mode work later is mechanical instead of grep-based.
  color: {
    text: 'text-[#0a192f]',
    textMuted: 'text-slate-500',
    textSubtle: 'text-slate-400',
    border: 'border-slate-100',
    borderStrong: 'border-slate-200',
    surface: 'bg-white',
    surfaceMuted: 'bg-slate-50',
  },
} as const

/**
 * Helper: compose tailwind class strings while preserving readability.
 * Skips falsy values (undefined / false / null) so conditional classes are
 * just `cn('a', cond && 'b')`.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
