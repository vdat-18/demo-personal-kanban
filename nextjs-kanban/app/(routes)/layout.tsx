import { Navigation } from '@/components/organisms/NavigationBar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-[#F8F9FA] text-[#0a192f] font-sans flex flex-col overflow-hidden">
      <Navigation />
      <main className="flex-1 flex w-full overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
