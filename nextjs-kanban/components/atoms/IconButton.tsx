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
        'flex items-center justify-center rounded-full transition-colors',
        size === 'sm' ? 'p-1.5' : 'p-2',
        variant === 'ghost'
          ? 'hover:bg-gray-100 text-gray-500 hover:text-black'
          : 'bg-[#0a192f] text-white hover:bg-blue-900',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
