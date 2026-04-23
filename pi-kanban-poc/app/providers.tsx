'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import { I18nProvider } from '@/lib/i18n/context'

export function Providers({ children }: { children: React.ReactNode }) {
  const uiLocale = useKanbanStore((s) => s.uiLocale)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep data fresh for 30s, cache for 5 minutes
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale={uiLocale}>{children}</I18nProvider>
    </QueryClientProvider>
  )
}
