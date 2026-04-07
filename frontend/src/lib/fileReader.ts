// ─────────────────────────────────────────────────────────────────────────────
// fileReader.ts — Extract content from any file type for AI consumption
//
// Supports:
//   - Images (jpg, png, gif, webp, …)  → base64 for Vision AI
//   - PDF                               → each page rendered as base64 image
//   - DOCX                              → extracted text via mammoth
//   - Text files (txt, md, csv, json…)  → raw text
//   - Everything else                   → attempt raw text
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractedAttachment {
  /** Original file name */
  name: string;
  /** for multi-page PDFs: the original file name used to group chips */
  originalFileName?: string;
  /** 'text' = string content, 'image' = base64 encoded */
  type: "text" | "image";
  /** Raw text (type=text) OR base64 string WITHOUT data:… prefix (type=image) */
  content: string;
  /** MIME type — required for type=image */
  mimeType?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|bmp|svg|tiff?)$/i;
const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
  "image/tiff",
]);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is "data:<mime>;base64,<data>" — strip the prefix
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── PDF via pdfjs-dist ────────────────────────────────────────────────────────
// Renders each page as a PNG canvas → base64.
// This way AI sees the VISUAL layout + any embedded images.

async function extractPdf(file: File): Promise<ExtractedAttachment[]> {
  // Dynamic import keeps initial bundle small
  const pdfjsLib = await import("pdfjs-dist");
  
  // Use unpkg instead of cdnjs as it serves raw files correctly for workers
  // Alternatively fallback to standard js if mjs is blocked
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: ExtractedAttachment[] = [];
  const scale = 1.5; // higher = more detail, more tokens

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    // Convert canvas to base64 PNG
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];

    pages.push({
      name: `${file.name} — Page ${i}/${pdf.numPages}`,
      originalFileName: file.name,
      type: "image",
      content: base64,
      mimeType: "image/png",
    });
  }

  return pages;
}

// ─── DOCX via mammoth + jszip ──────────────────────────────────────────────────

async function extractDocx(file: File): Promise<ExtractedAttachment[]> {
  const mammoth = await import("mammoth");
  // JSZip may export differently based on Vite's prebundling
  const JSZipModule = await import("jszip");
  const JSZip = JSZipModule.default || JSZipModule;

  const arrayBuffer = await file.arrayBuffer();
  
  // 1. Phân tích văn bản gốc
  const textResult = await mammoth.extractRawText({ arrayBuffer });
  const results: ExtractedAttachment[] = [
    {
      name: file.name,
      originalFileName: file.name,
      type: "text",
      content: textResult.value,
    },
  ];

  // 2. Mổ xẻ lõi ZIP để moi mọi hình ảnh được chèn lặn bên trong
  try {
    const zip = new JSZip();
    await zip.loadAsync(arrayBuffer);

    // Quét tìm tất cả các file nằm ở thư mục "word/media/"
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (filename.startsWith("word/media/") && !zipEntry.dir) {
        const base64 = await zipEntry.async("base64");
        const ext = filename.split(".").pop()?.toLowerCase() || "png";
        
        let mimeType = "image/png";
        if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
        else if (ext === "gif") mimeType = "image/gif";
        else if (ext === "svg") mimeType = "image/svg+xml";
        else if (ext === "webp") mimeType = "image/webp";

        results.push({
          name: `${file.name} - [Embedded Image] ${filename.split("/").pop()}`,
          originalFileName: file.name,
          type: "image",
          content: base64,
          mimeType,
        });
      }
    }
  } catch (err) {
    console.warn("Failed to extract images from DOCX", err);
  }

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract content from any file, returning one or more attachments.
 * PDFs may return multiple items (one per page).
 */
export async function extractFileContent(
  file: File
): Promise<ExtractedAttachment[]> {
  const mime = file.type;
  const name = file.name.toLowerCase();

  // ── Images ──
  if (IMAGE_MIMES.has(mime) || IMAGE_EXTS.test(name)) {
    const base64 = await fileToBase64(file);
    return [
      {
        name: file.name,
        type: "image",
        content: base64,
        mimeType: mime || "image/jpeg",
      },
    ];
  }

  // ── PDF ──
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdf(file);
  }

  // ── DOCX ──
  if (
    mime.includes("wordprocessingml") ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return extractDocx(file);
  }

  // ── Plain text (and everything else) ──
  try {
    const text = await file.text();
    return [{ name: file.name, type: "text", content: text }];
  } catch {
    return [
      {
        name: file.name,
        type: "text",
        content: `[Unable to read file content: ${file.name}]`,
      },
    ];
  }
}
