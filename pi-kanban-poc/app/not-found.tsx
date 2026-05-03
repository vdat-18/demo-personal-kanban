import Link from 'next/link'
import { Layout } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="w-20 h-20 rounded-[32px] bg-slate-100 flex items-center justify-center text-slate-300">
          <Layout className="w-10 h-10" />
        </div>
        <div>
          <p className="text-8xl font-black text-slate-100 mb-2">404</p>
          <h2 className="text-2xl font-bold text-ink mb-2">Page not found</h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="px-6 py-3 bg-ink text-white rounded-xl font-semibold text-sm hover:bg-blue-900 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
