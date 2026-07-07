export const GRN_DOCUMENT_ACCEPT = "application/pdf,image/jpeg,image/jpg";
export const GRN_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/jpg"]);

export function validateGrnDocumentFile(file: File): string | null {
  const mime = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    return "Only JPG and PDF files are allowed";
  }
  if (file.size <= 0) {
    return "File is empty";
  }
  if (file.size > GRN_DOCUMENT_MAX_BYTES) {
    return "File must be at most 10 MB";
  }
  return null;
}

export function grnDocumentDisplayName(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  const normalized = path.replace(/\\/g, "/");
  const segment = normalized.split("/").pop();
  return segment?.trim() ? segment : null;
}
