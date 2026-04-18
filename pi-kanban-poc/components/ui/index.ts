// ─────────────────────────────────────────────────────────────────────────────
// Backward-compatible re-export shim
// Shadcn CLI and existing imports can still reference @/components/ui/*
// Actual component files live in @/components/atoms/
// ─────────────────────────────────────────────────────────────────────────────

export { Button, buttonVariants } from '@/components/atoms/button'
export { Badge, badgeVariants } from '@/components/atoms/badge'
export { Avatar, AvatarImage, AvatarFallback } from '@/components/atoms/avatar'
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/atoms/card'
export { Progress, ProgressTrack, ProgressIndicator } from '@/components/atoms/progress'
export { ScrollArea, ScrollBar } from '@/components/atoms/scroll-area'
export { Separator } from '@/components/atoms/separator'
export { Skeleton } from '@/components/atoms/skeleton'
