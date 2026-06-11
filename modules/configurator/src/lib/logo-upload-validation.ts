import { randomUUID } from "node:crypto";
import path from "node:path";

export const MAX_BRANDING_LOGO_BYTES = 2 * 1024 * 1024;

export const ALLOWED_BRANDING_LOGO_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

export function sanitizeFilename(name: string): string {
  const base = path.basename(name);
  const sanitized = base.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+|\.+$/g, "");
  return sanitized || "logo";
}

export function generateSecureFilename(extension: string): string {
  const ext = extension.startsWith(".")
    ? extension.toLowerCase()
    : extension
      ? `.${extension.toLowerCase()}`
      : "";
  return `${randomUUID().replace(/-/g, "")}${ext}`;
}

export function extensionForMimeType(mimeType: string): string {
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  return MIME_TO_EXTENSION[normalized] ?? "";
}

export function generateBrandingLogoPath(
  scope: "organization" | "tenant",
  slug: string,
  extension: string,
): string {
  const safeSlug = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "unscoped";
  const secureName = generateSecureFilename(extension);
  return `configurator/branding/${scope}/${safeSlug}/${secureName}`;
}

export function validateBrandingLogoUpload(mimeType: string, sizeBytes: number): void {
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_BRANDING_LOGO_MIME_TYPES.has(normalized)) {
    throw new Error("Only PNG and JPEG logo images are allowed");
  }
  if (sizeBytes <= 0) {
    throw new Error("Uploaded file is empty");
  }
  if (sizeBytes > MAX_BRANDING_LOGO_BYTES) {
    throw new Error("Logo must be 2 MB or smaller");
  }
}

export function assertAllowedBrandingStorageKey(storageKey: string): void {
  const normalized = storageKey.trim();
  if (!normalized.startsWith("configurator/branding/")) {
    throw new Error("Invalid branding logo storage key");
  }
  if (normalized.includes("..")) {
    throw new Error("Invalid branding logo storage key");
  }
}
