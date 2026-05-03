import { cn } from '@/lib/utils'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  /** Visual variant */
  variant?: 'ghost' | 'filled'
  /** Size of the button */
  size?: 'sm' | 'md'
}

export function IconButton({
  children,
  variant = 'ghost',
  size = 'md',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(
        'flex items-center justify-center rounded-xl transition-colors',
        size === 'sm' ? 'p-1.5' : 'p-2',
        variant === 'ghost'
          ? 'hover:bg-surface-muted text-ink-muted hover:text-ink'
          : 'bg-brand text-white hover:bg-brand-hover',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
