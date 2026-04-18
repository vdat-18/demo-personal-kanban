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
    <header className="h-20 px-10 border-b border-gray-100 bg-white/70 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50 transition-all">
      <div className="flex items-center gap-12 h-full">
        <Link
          href="/"
          className="font-black text-xl tracking-tighter text-[#0a192f] hover:opacity-80 transition-opacity hidden sm:block"
        >
          Agent<span className="text-blue-600">For</span>Everyone
        </Link>
        <nav className="flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400 h-full">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center h-full pt-1 transition-all relative group',
                  isActive
                    ? 'text-[#0a192f]'
                    : 'hover:text-[#0a192f]',
                ].join(' ')}
              >
                {label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 animate-in fade-in slide-in-from-bottom-1" />
                )}
                {!isActive && (
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gray-200 group-hover:w-full transition-all duration-300" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-6 text-gray-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="p-2 hover:bg-gray-100 rounded-2xl transition-all hover:text-[#0a192f] active:scale-95"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Settings"
            className="p-2 hover:bg-gray-100 rounded-2xl transition-all hover:text-[#0a192f] active:scale-95"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center cursor-pointer hover:shadow-lg hover:shadow-slate-200 transition-all active:scale-95 border-2 border-white">
          <User className="w-5 h-5" />
        </div>
      </div>
    </header>
  )
}
