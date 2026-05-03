/**
 * Design tokens — single source of truth for sizing, typography, color, shape.
 *
 * Two layers:
 *   1. RAW values (`palette`, `typography`, etc.) — for inline style, SVG fill,
 *      chart colors, anything outside Tailwind classes.
 *   2. Composed Tailwind utility strings (`t.*`) — for `className` props.
 *
 * Tokens here MIRROR the CSS variables defined in app/globals.css `@theme`.
 * If you change a value, change both. The CSS layer drives Tailwind utilities
 * (`bg-brand`, `text-success`, etc.); the TS layer drives JS-side consumers.
 *
 * Naming rules:
 *   - `brand` / `spark` for product identity
 *   - `canvas` / `surface` / `surface-muted` for backgrounds
 *   - `ink` / `ink-muted` / `ink-subtle` for text on light bg
 *   - `line` / `line-strong` for borders
 *   - `success` / `warning` / `danger` / `info` for semantic state
 *   - Each semantic has 3 shades: solid (text), bg (subtle background), border
 */

// ─────────────────────────────────────────────────────────────────────────────
// Raw palette — keep in sync with @theme tokens in app/globals.css
// ─────────────────────────────────────────────────────────────────────────────

export const palette = {
  // Brand identity
  brand: '#2563EB',          // confident-friendly blue (Tailwind blue-600)
  brandHover: '#1D4ED8',     // blue-700
  brandSubtle: '#EFF6FF',    // blue-50
  brandBorder: '#BFDBFE',    // blue-200
  spark: '#F59E0B',          // warm accent / "AI sparkle" (amber-500)
  sparkSubtle: '#FFFBEB',    // amber-50

  // Surface (warm stone, not cool slate — feels less "cold tool")
  canvas: '#FAFAF9',         // app background, stone-50
  surface: '#FFFFFF',        // card / panel
  surfaceMuted: '#F5F5F4',   // sidebar, hover, subtle bg, stone-100

  // Text (softer than pure black — easier to read long form)
  ink: '#1C1917',            // primary text, stone-900
  inkMuted: '#57534E',       // secondary text, stone-600
  inkSubtle: '#A8A29E',      // tertiary / placeholder, stone-400

  // Borders
  line: '#E7E5E4',           // default, stone-200
  lineStrong: '#D6D3D1',     // emphasis, stone-300

  // Semantic — success
  success: '#047857',        // text on light bg, emerald-700
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',

  // Semantic — warning
  warning: '#B45309',        // amber-700
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',

  // Semantic — danger
  danger: '#B91C1C',         // red-700
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',

  // Semantic — info (= brand for our product)
  info: '#1D4ED8',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',

  // Agent role badges (only place where indigo/violet survive — for distinction)
  agentPlanner: { bg: '#EFF6FF', fg: '#1D4ED8' },
  agentDoer: { bg: '#EEF2FF', fg: '#4338CA' },
  agentReviewer: { bg: '#FFFBEB', fg: '#B45309' },
  agentReporter: { bg: '#ECFDF5', fg: '#047857' },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Typography scale — 6 levels, no more `text-[10px]` arbitrary sizing
// ─────────────────────────────────────────────────────────────────────────────

export const typography = {
  /** Hero / display heading. ~32px. */
  display: { size: '2rem', lineHeight: '1.15', weight: 700, tracking: '-0.02em' },
  /** Page title. ~24px. */
  h1: { size: '1.5rem', lineHeight: '1.25', weight: 700, tracking: '-0.015em' },
  /** Section heading / card title. ~18px. */
  h2: { size: '1.125rem', lineHeight: '1.35', weight: 600, tracking: '-0.01em' },
  /** Body text default. ~15px. */
  body: { size: '0.9375rem', lineHeight: '1.55', weight: 400 },
  /** Label, caption, secondary copy. ~13px. */
  meta: { size: '0.8125rem', lineHeight: '1.45', weight: 500 },
  /** Badge, chip, micro label. ~11px — only for ≤4-char chips. */
  micro: { size: '0.6875rem', lineHeight: '1.4', weight: 600, tracking: '0.04em' },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Radius — 3 levels only (was 8+ arbitrary values across codebase)
// ─────────────────────────────────────────────────────────────────────────────

export const radius = {
  sm: '0.5rem',  // 8px  — chip, badge, small button
  md: '0.75rem', // 12px — input, button, small card
  lg: '1rem',    // 16px — card, panel, modal
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Composed Tailwind utility strings
// ─────────────────────────────────────────────────────────────────────────────

export const t = {
  // ─── Type — use these instead of arbitrary text-[Npx]
  text: {
    display: 'text-display',
    h1: 'text-h1',
    h2: 'text-h2',
    body: 'text-body',
    meta: 'text-meta',
    micro: 'text-micro uppercase',
  },

  // ─── Surface
  bg: {
    canvas: 'bg-canvas',
    surface: 'bg-surface',
    surfaceMuted: 'bg-surface-muted',
    brand: 'bg-brand',
    brandSubtle: 'bg-brand-subtle',
    success: 'bg-success-bg',
    warning: 'bg-warning-bg',
    danger: 'bg-danger-bg',
    info: 'bg-info-bg',
  },

  // ─── Ink (text color)
  ink: {
    primary: 'text-ink',
    muted: 'text-ink-muted',
    subtle: 'text-ink-subtle',
    brand: 'text-brand',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-info',
    onBrand: 'text-white',
  },

  // ─── Borders
  border: {
    default: 'border border-line',
    strong: 'border border-line-strong',
    brand: 'border border-brand-border',
    success: 'border border-success-border',
    warning: 'border border-warning-border',
    danger: 'border border-danger-border',
    info: 'border border-info-border',
  },

  // ─── Radius
  radius: {
    sm: 'rounded-lg',  // 8px
    md: 'rounded-xl',  // 12px
    lg: 'rounded-2xl', // 16px
  },

  // ─── Shadows (3 levels)
  shadow: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  },

  // ─── Buttons
  button: {
    primary:
      'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-meta font-semibold hover:bg-brand-hover transition-colors active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-muted text-ink text-meta font-semibold hover:bg-line transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    ghost:
      'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-ink-muted text-meta font-semibold hover:bg-surface-muted transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    danger:
      'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-danger text-white text-meta font-semibold hover:opacity-90 transition-opacity active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
  },

  // ─── Cards
  card: {
    base: 'bg-surface rounded-2xl border border-line shadow-sm',
    hover:
      'bg-surface rounded-2xl border border-line shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
    flat: 'bg-surface rounded-2xl border border-line',
  },

  // ─── Chip / badge presets per semantic
  chip: {
    neutral: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-micro uppercase bg-surface-muted text-ink-muted border border-line',
    brand: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-micro uppercase bg-brand-subtle text-brand border border-brand-border',
    success: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-micro uppercase bg-success-bg text-success border border-success-border',
    warning: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-micro uppercase bg-warning-bg text-warning border border-warning-border',
    danger: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-micro uppercase bg-danger-bg text-danger border border-danger-border',
    info: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-micro uppercase bg-info-bg text-info border border-info-border',
  },

  // ─── Input
  input:
    'w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-body text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
} as const

/**
 * Compose tailwind class strings while preserving readability.
 * Skips falsy values so conditional classes work: `cn('a', cond && 'b')`.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
