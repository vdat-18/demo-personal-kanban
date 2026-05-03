import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { Providers } from './providers'

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam-pro',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Agent for Everyone — Your work, done together',
  description:
    'A friendly AI workspace that plans, executes, and reviews your work with you — built for non-technical teams.',
  openGraph: {
    title: 'Agent for Everyone',
    description: 'AI agents that help you plan, do, and review your work.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          duration={6000}
          toastOptions={{
            style: { borderRadius: '12px', fontFamily: 'inherit' },
          }}
        />
      </body>
    </html>
  )
}
