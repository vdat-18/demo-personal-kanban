import { cn } from '@/lib/utils'

export interface AiAvatarProps {
  className?: string
}

export function AiAvatar({ className }: AiAvatarProps) {
  return (
    <div
      className={cn(
        'w-8 h-8 rounded-xl bg-brand flex items-center justify-center text-white text-meta font-bold shrink-0 shadow-sm',
        className,
      )}
    >
      AI
    </div>
  )
}
