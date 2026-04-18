// Atoms barrel — re-exports all atomic (indivisible) UI components

// shadcn/base-ui primitives
export { Button, buttonVariants } from './button'
export { Badge, badgeVariants } from './badge'
export { Avatar, AvatarImage, AvatarFallback } from './avatar'
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from './card'
export { Progress, ProgressTrack, ProgressIndicator } from './progress'
export { ScrollArea, ScrollBar } from './scroll-area'
export { Separator } from './separator'
export { Skeleton } from './skeleton'

// Custom atoms
export { StatusPill } from './StatusPill'
export type { StatusPillProps } from './StatusPill'
export { ProgressBar } from './ProgressBar'
export type { ProgressBarProps } from './ProgressBar'
export { IconButton } from './IconButton'
export type { IconButtonProps } from './IconButton'
export { TypingDots } from './TypingDots'
export type { TypingDotsProps } from './TypingDots'
export { AiAvatar } from './AiAvatar'
export type { AiAvatarProps } from './AiAvatar'
export { AutoModeToggle } from './AutoModeToggle'
