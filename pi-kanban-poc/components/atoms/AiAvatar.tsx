import { cn } from '@/lib/utils'

export interface AiAvatarProps {
  className?: string
}

export function AiAvatar({ className }: AiAvatarProps) {
  return (
    <div
      className={cn(
        'w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black shrink-0',
        className
      )}
    >
      AI
    </div>
  )
}
