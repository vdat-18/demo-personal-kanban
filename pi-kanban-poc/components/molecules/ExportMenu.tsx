'use client'

import { useState } from 'react'
import { Download, Copy, FileText, FileCode, Image as ImageIcon, Check } from 'lucide-react'

interface ExportMenuProps {
  content: string
  title: string
}

/**
 * Export dropdown for the vision document (Tier 4.15).
 *
 * Supports 1-click flows:
 *   - Copy markdown to clipboard
 *   - Download .md file
 *   - Print / save as PDF via window.print() with a clean stylesheet
 *   - (future) image export via html-to-image
 *
 * The trade-off: we intentionally keep this in the browser (no server calls)
 * so export works offline and respects data ownership.
 */
export function ExportMenu({ content, title }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const safeFilename = title
    .trim()
    .replace(/[^a-z0-9\-_ ]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase() || 'plan'

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can fail in insecure contexts — fall back to a
      // contenteditable hack so the user still gets something.
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
      } catch {
        /* give up */
      }
      document.body.removeChild(textArea)
    }
    setOpen(false)
  }

  const downloadMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    triggerDownload(blob, `${safeFilename}.md`)
    setOpen(false)
  }

  const exportAsPdf = () => {
    // Client-side printable view. Browser print dialog can save as PDF.
    const w = window.open('', '_blank')
    if (!w) return
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #1C1917; line-height: 1.6; }
  h1, h2, h3 { color: #1C1917; margin-top: 1.5em; }
  h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
  h2 { border-bottom: 1px solid #e2e8f0; padding-bottom: 0.2em; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  pre code { display: block; padding: 12px; overflow-x: auto; }
  blockquote { border-left: 3px solid #3b82f6; padding-left: 16px; color: #475569; margin-left: 0; }
  ul, ol { padding-left: 1.5em; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h1>${escapeHtml(title)}</h1>
<div id="content"></div>
<script>
  // Very small markdown → HTML, enough for basic headings/lists/bold.
  const raw = ${JSON.stringify(content)};
  function md(s) {
    return s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
      .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
      .replace(/\`(.+?)\`/g, '<code>$1</code>')
      .replace(/^- (.*)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\\/li>)/gs, '<ul>$1</ul>')
      .replace(/\\n\\n/g, '</p><p>')
      .replace(/^(?!<)(.+)$/gm, '<p>$1</p>')
      .replace(/<p><(h[1-3]|ul|ol|li)/g, '<$1')
      .replace(/<\\/(h[1-3]|ul|ol|li)><\\/p>/g, '</$1>');
  }
  document.getElementById('content').innerHTML = md(raw);
  window.print();
</script>
</body></html>`
    w.document.open()
    w.document.write(html)
    w.document.close()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-meta font-bold text-blue-600 hover:text-blue-700 hover:bg-white/50 transition-colors"
        title="Export"
      >
        <Download className="w-3 h-3" />
        Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-300/30 py-1 min-w-[200px]">
            <MenuItem
              icon={copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              label={copied ? 'Copied!' : 'Copy as Markdown'}
              onClick={copyMarkdown}
            />
            <MenuItem
              icon={<FileCode className="w-3.5 h-3.5" />}
              label="Download .md"
              onClick={downloadMarkdown}
            />
            <MenuItem
              icon={<FileText className="w-3.5 h-3.5" />}
              label="Save as PDF…"
              onClick={exportAsPdf}
            />
          </div>
        </>
      )}
    </div>
  )
}

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function MenuItem({ icon, label, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
    >
      <span className="text-slate-400">{icon}</span>
      {label}
    </button>
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return c
    }
  })
}
