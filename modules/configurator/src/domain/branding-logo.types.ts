/** Logo metadata stored in organization or tenant `metadata.logo`. */
export interface BrandingLogoMetadata {
  storage_key: string;
  blob_url: string;
  mime_type: string;
  file_name: string;
  uploaded_at: string;
}

export type BrandingLogoScope = "organization" | "tenant";

export interface BrandingLogoUploadResult {
  logo: BrandingLogoMetadata;
}
