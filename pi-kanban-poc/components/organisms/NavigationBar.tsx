'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Bell, ChevronDown, Languages, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PersonalAIContextDrawer } from '@/components/molecules/PersonalAIContextDrawer'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import { useI18n } from '@/lib/i18n/context'
import type { UiLocale } from '@/types/domain'

export function Navigation() {
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const uiLocale = useKanbanStore((s) => s.uiLocale)
  const setUiLocale = useKanbanStore((s) => s.setUiLocale)
  const { t } = useI18n()

  useEffect(() => {
    if (!userMenuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [userMenuOpen])

  const navLinks = [
    { href: '/', label: t('nav.projects', 'Projects') },
    { href: '/directory', label: t('nav.directory', 'Directory') },
  ]

  const localeOptions: Array<{ value: UiLocale; label: string }> = [
    { value: 'en', label: t('locale.en', 'English') },
    { value: 'vi', label: t('locale.vi', 'Tiếng Việt') },
    { value: 'th', label: t('locale.th', 'ไทย') },
    { value: 'ko', label: t('locale.ko', '한국어') },
    { value: 'ja', label: t('locale.ja', '日本語') },
  ]

  return (
    <>
      <header className="h-16 px-6 border-b border-line/60 bg-surface/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50 shadow-nav">
        <div className="flex items-center gap-10 h-full">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            aria-label="Agent for Everyone — home"
          >
            <Image
              src="/logo/mark.svg"
              alt=""
              width={32}
              height={32}
              priority
              className="shrink-0"
            />
            <span className="hidden sm:inline-flex items-baseline gap-1 text-h2 text-ink">
              Agent <span className="text-brand">for</span> Everyone
            </span>
          </Link>
          <nav className="flex items-center gap-7 text-meta text-ink-muted h-full">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center h-full pt-1 transition-colors relative group font-semibold ${
                    isActive ? 'text-ink' : 'hover:text-ink'
                  }`}
                >
                  {label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand animate-in fade-in slide-in-from-bottom-1" />
                  )}
                  {!isActive && (
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-line group-hover:w-full transition-all duration-300" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-ink-muted">
          <button
            type="button"
            aria-label={t('nav.notifications', 'Notifications')}
            className="p-2 hover:bg-surface-muted rounded-xl transition-colors hover:text-ink active:scale-95"
          >
            <Bell className="w-5 h-5" />
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-3 pr-2 h-10 rounded-xl bg-ink text-white hover:opacity-90 transition-opacity active:scale-95"
            >
              <User className="w-4 h-4" />
              <ChevronDown
                className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-line/60 bg-surface shadow-dropdown overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-line bg-surface-muted/60">
                  <p className="text-meta font-semibold text-ink-muted">
                    {t('nav.language', 'Language')}
                  </p>
                </div>
                <div className="p-2 space-y-0.5">
                  {localeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setUiLocale(option.value)
                        setUserMenuOpen(false)
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-meta transition-colors ${
                        uiLocale === option.value
                          ? 'bg-brand-subtle text-brand font-semibold'
                          : 'text-ink-muted hover:bg-surface-muted'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Languages className="w-4 h-4" />
                        {option.label}
                      </span>
                      {uiLocale === option.value && (
                        <span className="text-micro text-brand">Active</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-line p-2">
                  <button
                    onClick={() => {
                      setSettingsOpen(true)
                      setUserMenuOpen(false)
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-meta text-left text-ink-muted hover:bg-surface-muted transition-colors"
                  >
                    {t('nav.aiContext', 'Personal AI context')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <PersonalAIContextDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
