import { Navigation } from '@/components/organisms/NavigationBar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-canvas text-ink font-sans flex flex-col overflow-hidden">
      <Navigation />
      <main className="flex-1 flex w-full overflow-hidden">{children}</main>
    </div>
  )
}
