import type {
  BrandingLogoScope,
  BrandingLogoUploadResult,
} from "../domain/branding-logo.types.js";
import { ConfiguratorError } from "../errors.js";
import { uploadBrandingLogoBlob } from "../lib/azure-blob-storage.js";
import { validateBrandingLogoUpload } from "../lib/logo-upload-validation.js";

export interface UploadBrandingLogoInput {
  scope: BrandingLogoScope;
  slug: string;
  fileBytes: Buffer;
  originalFileName: string;
  mimeType: string;
}

export async function uploadBrandingLogo(
  input: UploadBrandingLogoInput,
): Promise<BrandingLogoUploadResult> {
  const slug = input.slug?.trim().toLowerCase() ?? "";
  if (slug.length < 3) {
    throw new ConfiguratorError(400, "slug must be at least 3 characters");
  }

  try {
    validateBrandingLogoUpload(input.mimeType, input.fileBytes.length);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid logo upload";
    throw new ConfiguratorError(400, message);
  }

  try {
    const blob = await uploadBrandingLogoBlob(
      input.fileBytes,
      input.originalFileName,
      input.mimeType,
      input.scope,
      slug,
    );
    return {
      logo: {
        storage_key: blob.storageKey,
        blob_url: blob.blobUrl,
        mime_type: input.mimeType.split(";")[0]?.trim().toLowerCase() ?? input.mimeType,
        file_name: input.originalFileName.trim() || "logo",
        uploaded_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Azure blob upload failed";
    throw new ConfiguratorError(503, message, "STORAGE_UNAVAILABLE");
  }
}
