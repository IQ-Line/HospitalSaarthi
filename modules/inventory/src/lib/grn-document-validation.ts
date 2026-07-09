import { GrnValidationError } from "../errors.js";

export type GrnDocumentKind = "shipment" | "voucher";

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/jpg"]);
export const GRN_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export function validateGrnDocumentKind(kind: string): GrnDocumentKind {
  if (kind === "shipment" || kind === "voucher") return kind;
  throw new GrnValidationError("Document kind must be shipment or voucher");
}

export function validateGrnDocumentUpload(mimeType: string, byteLength: number): void {
  const normalized = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!ALLOWED_MIME_TYPES.has(normalized)) {
    throw new GrnValidationError("Only JPG and PDF files are allowed");
  }
  if (byteLength <= 0) {
    throw new GrnValidationError("File is empty");
  }
  if (byteLength > GRN_DOCUMENT_MAX_BYTES) {
    throw new GrnValidationError("File must be at most 10 MB");
  }
}

export function sanitizeGrnDocumentFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop()?.trim() ?? "document";
  const cleaned = base.replace(/[^\w.\- ()]/g, "_").slice(0, 120);
  return cleaned.length > 0 ? cleaned : "document";
}
