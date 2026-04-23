'use client'

import { createContext, useContext, useMemo } from 'react'

import type { UiLocale } from '@/types/domain'
import { getMessages } from '@/lib/i18n/messages'

interface I18nContextValue {
  locale: UiLocale
  t: (key: string, fallback?: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ locale, children }: { locale: UiLocale; children: React.ReactNode }) {
  const value = useMemo<I18nContextValue>(() => {
    const dict = getMessages(locale)
    return {
      locale,
      t: (key: string, fallback?: string) => {
        const value = key.split('.').reduce<unknown>((acc, segment) => {
          if (acc && typeof acc === 'object' && segment in acc) {
            return (acc as Record<string, unknown>)[segment]
          }
          return undefined
        }, dict)
        return typeof value === 'string' ? value : (fallback ?? key)
      },
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider')
  }
  return context
}
