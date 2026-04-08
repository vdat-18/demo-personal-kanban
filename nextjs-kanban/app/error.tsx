'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#0a192f] mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          {error.digest && (
            <p className="text-xs text-zinc-400 mt-2 font-mono">Error ID: {error.digest}</p>
          )}
        </div>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#0a192f] text-white rounded-xl font-semibold text-sm hover:bg-blue-900 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
