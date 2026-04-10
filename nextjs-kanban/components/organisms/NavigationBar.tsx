'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Settings, User } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Projects' },
  { href: '/directory', label: 'Directory' },
  { href: '/timeline', label: 'Timeline' },
  { href: '/insights', label: 'Insights' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <header className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-8 h-full">
        <Link
          href="/"
          className="font-bold text-xl tracking-tight hidden sm:block"
        >
          AgentForEveryone
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-500 h-full">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center h-full pt-0.5 transition-colors',
                  isActive
                    ? 'text-black border-b-2 border-black'
                    : 'hover:text-black',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4 text-gray-500">
        <button
          type="button"
          aria-label="Notifications"
          className="hover:text-black transition-colors"
        >
          <Bell className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Settings"
          className="hover:text-black transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  )
}
