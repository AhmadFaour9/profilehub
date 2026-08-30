import "server-only";

/**
 * Text extraction for uploaded resumes.
 *
 * Files are parsed in memory and never written to disk or storage: a CV holds
 * phone numbers and addresses, and nothing here needs to outlive the request.
 */

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MIN_RESUME_CHARS = 200;
export const MAX_RESUME_CHARS = 20_000;

export const SUPPORTED_RESUME_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

export type ResumeFileKind = (typeof SUPPORTED_RESUME_TYPES)[keyof typeof SUPPORTED_RESUME_TYPES];

export type ExtractionError =
  | "file_too_large"
  | "unsupported_type"
  | "extract_failed"
  | "too_short";

export type ExtractionResult =
  | { ok: true; text: string; kind: ResumeFileKind | "text"; characters: number; truncated: boolean }
  | { ok: false; error: ExtractionError };

/** Detects the kind from the MIME type, falling back to the file extension. */
export function detectResumeKind(file: File): ResumeFileKind | null {
  const byMime = SUPPORTED_RESUME_TYPES[file.type as keyof typeof SUPPORTED_RESUME_TYPES];
  if (byMime) return byMime;

  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";

  return null;
}

/** Collapses the ragged whitespace that PDF extraction usually produces. */
export function normalizeResumeText(raw: string): { text: string; truncated: boolean } {
  const cleaned = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleaned.length <= MAX_RESUME_CHARS) {
    return { text: cleaned, truncated: false };
  }

  return { text: cleaned.slice(0, MAX_RESUME_CHARS), truncated: true };
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value;
}

export async function extractResumeTextFromFile(file: File): Promise<ExtractionResult> {
  if (file.size > MAX_RESUME_BYTES) return { ok: false, error: "file_too_large" };

  const kind = detectResumeKind(file);
  if (!kind) return { ok: false, error: "unsupported_type" };

  let raw: string;
  try {
    const buffer = await file.arrayBuffer();
    raw = kind === "pdf" ? await extractPdf(buffer) : await extractDocx(buffer);
  } catch {
    // A scanned/image-only PDF lands here; the UI steers the user to pasting.
    return { ok: false, error: "extract_failed" };
  }

  const { text, truncated } = normalizeResumeText(raw || "");
  if (text.length < MIN_RESUME_CHARS) return { ok: false, error: "too_short" };

  return { ok: true, text, kind, characters: text.length, truncated };
}

export function prepareResumeText(input: string): ExtractionResult {
  const { text, truncated } = normalizeResumeText(input || "");
  if (text.length < MIN_RESUME_CHARS) return { ok: false, error: "too_short" };

  return { ok: true, text, kind: "text", characters: text.length, truncated };
}
