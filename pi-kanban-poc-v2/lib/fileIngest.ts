/**
 * File ingestion pipeline — turns arbitrary user-uploaded files into plain
 * text that can be embedded in the planning conversation context.
 *
 * Design notes (from issues #1 and #3):
 *   - Non-tech users drop whatever they have (PDF brief, Word scope doc,
 *     Excel budget, image of a whiteboard, plain text email…). The old
 *     PlanningClient only handled text-based files (.txt/.md/.json/...) and
 *     silently rejected everything else.
 *   - This module centralizes extraction so both the Dashboard Import flow
 *     and the Planning chat attachment flow can share one code path.
 *   - Heavy deps (pdfjs-dist, mammoth, xlsx) are loaded via dynamic import so
 *     the main bundle stays small; they only land in the user's browser the
 *     first time they upload that file type.
 *   - Image files are returned with `needsVisionModel: true`; the caller can
 *     decide whether to route them through a multimodal API or just surface
 *     a placeholder note to the user. No OCR is attempted in-browser (too
 *     heavy for the non-tech laptops we target).
 *
 * Output contract:
 *   {
 *     filename: string,
 *     mimeType: string,
 *     kind: 'text' | 'pdf' | 'docx' | 'doc' | 'xlsx' | 'csv' | 'image' | 'unknown',
 *     text: string,              // extracted plain text (may be empty)
 *     summary?: string,           // short human description for UI
 *     error?: string,             // populated on extraction failure
 *     needsVisionModel?: boolean, // true for images/unsupported formats
 *     imageData?: { mimeType: string; base64: string }, // populated for images
 *     charCount: number,
 *   }
 */

export type IngestKind =
  | 'text'
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'xlsx'
  | 'csv'
  | 'image'
  | 'unknown'

export interface IngestedFile {
  filename: string
  mimeType: string
  kind: IngestKind
  text: string
  summary?: string
  error?: string
  needsVisionModel?: boolean
  /** Populated for image files — base64-encoded raw bytes ready for vision API. */
  imageData?: { mimeType: string; base64: string }
  charCount: number
}

const MAX_CHARS = 50_000

/** Main dispatcher. Never throws — errors are reported on the envelope. */
export async function ingestFile(file: File): Promise<IngestedFile> {
  const name = file.name.toLowerCase()
  const mime = file.type || ''

  try {
    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      return await ingestPdf(file)
    }
    if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx')
    ) {
      return await ingestDocx(file)
    }
    if (
      mime === 'application/msword' ||
      name.endsWith('.doc')
    ) {
      // mammoth handles both .doc and .docx
      return await ingestDocx(file)
    }
    if (
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      name.endsWith('.xlsx') ||
      name.endsWith('.xls')
    ) {
      return await ingestXlsx(file)
    }
    if (mime === 'text/csv' || name.endsWith('.csv')) {
      return await ingestCsv(file)
    }
    if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|svg|ico|avif|tiff?)$/i.test(name)) {
      const effectiveMime = mime || 'image/jpeg'
      const base64 = await fileToBase64(file)
      return {
        filename: file.name,
        mimeType: effectiveMime,
        kind: 'image',
        text: '',
        needsVisionModel: true,
        imageData: { mimeType: effectiveMime, base64 },
        summary: `Image attachment (${file.name}) — sent to vision model.`,
        charCount: 0,
      }
    }
    // Fallback: try to read as text. Works for source code, markdown, logs,
    // JSON, YAML, plain email dumps, etc.
    return await ingestText(file)
  } catch (err) {
    return {
      filename: file.name,
      mimeType: mime,
      kind: 'unknown',
      text: '',
      error: err instanceof Error ? err.message : 'Failed to read file',
      charCount: 0,
    }
  }
}

/** Pure text: .txt/.md/.json/.csv if type wasn't detected, etc. */
async function ingestText(file: File): Promise<IngestedFile> {
  const raw = await file.text()
  const text = clampText(raw)
  return {
    filename: file.name,
    mimeType: file.type || 'text/plain',
    kind: 'text',
    text,
    charCount: text.length,
    summary: `${file.name} — ${text.length.toLocaleString()} characters of text.`,
  }
}

async function ingestCsv(file: File): Promise<IngestedFile> {
  const raw = await file.text()
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const text = clampText(raw)
  return {
    filename: file.name,
    mimeType: 'text/csv',
    kind: 'csv',
    text,
    charCount: text.length,
    summary: `CSV with ${lines.length} row${lines.length === 1 ? '' : 's'}.`,
  }
}

async function ingestPdf(file: File): Promise<IngestedFile> {
  // Dynamic import keeps pdfjs out of the main bundle.
  const pdfjs: typeof import('pdfjs-dist') = await import('pdfjs-dist')
  // pdfjs needs a worker. The legacy build bundles it so Turbopack/webpack
  // can resolve a URL without us shipping a separate worker file. This is
  // the pattern documented at https://github.com/mozilla/pdf.js/issues/14739.
  try {
    // @ts-expect-error — worker entry is bundled as a module URL
    const worker: { default: string } = await import('pdfjs-dist/build/pdf.worker.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  } catch {
    // If the worker import fails (some bundlers), fall back to inline
    // execution. It's slower but keeps things working.
    pdfjs.GlobalWorkerOptions.workerSrc = ''
  }

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: unknown) => {
        const it = item as { str?: string }
        return it.str ?? ''
      })
      .join(' ')
    pages.push(pageText)
  }
  const fullText = pages.join('\n\n---\n\n')
  const text = clampText(fullText)

  // Heuristic: a pdf with almost no extractable text is probably scanned.
  const maybeScanned = fullText.trim().length < 50

  return {
    filename: file.name,
    mimeType: 'application/pdf',
    kind: 'pdf',
    text,
    charCount: text.length,
    summary: maybeScanned
      ? `PDF (${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'}) — appears to be a scan with little embedded text.`
      : `PDF (${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'}) — ${text.length.toLocaleString()} characters extracted.`,
    needsVisionModel: maybeScanned,
  }
}

async function ingestDocx(file: File): Promise<IngestedFile> {
  const mammoth: typeof import('mammoth') = await import('mammoth')
  const buffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  const text = clampText(result.value)
  return {
    filename: file.name,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    kind: 'docx',
    text,
    charCount: text.length,
    summary: `Word document — ${text.length.toLocaleString()} characters.`,
  }
}

async function ingestXlsx(file: File): Promise<IngestedFile> {
  const XLSX: typeof import('xlsx') = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const chunks: string[] = []
  let totalRows = 0
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]
    // CSV representation is the most human-readable way to embed sheet data
    // in a chat prompt. The agent can already parse rows/columns from it.
    const csv = XLSX.utils.sheet_to_csv(sheet)
    const rows = csv.split('\n').filter(Boolean).length
    totalRows += rows
    chunks.push(`### Sheet: ${name}\n\n${csv}`)
  }
  const text = clampText(chunks.join('\n\n'))
  return {
    filename: file.name,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    kind: 'xlsx',
    text,
    charCount: text.length,
    summary: `Spreadsheet — ${wb.SheetNames.length} sheet${wb.SheetNames.length === 1 ? '' : 's'}, ${totalRows} row${totalRows === 1 ? '' : 's'}.`,
  }
}

function clampText(raw: string): string {
  if (raw.length <= MAX_CHARS) return raw
  return raw.slice(0, MAX_CHARS) + `\n\n… [truncated — original was ${raw.length.toLocaleString()} chars]`
}

/** Read a File as a base64 string (strips the data-URL prefix). */
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/** Format multiple ingested files into a single message body suitable for
 *  appending to the user's chat prompt. */
export function formatFilesForPrompt(files: IngestedFile[]): string {
  if (files.length === 0) return ''
  const blocks = files.map((f) => {
    const header = `--- File: ${f.filename} (${f.kind}) ---`
    if (f.error) return `${header}\n[Failed to read: ${f.error}]`
    if (f.needsVisionModel && !f.text) {
      return `${header}\n[${f.summary ?? 'Binary attachment — please inspect visually.'}]`
    }
    return `${header}\n${f.text}`
  })
  return '\n\n' + blocks.join('\n\n')
}
