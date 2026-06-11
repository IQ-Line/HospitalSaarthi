import { queryOptions } from '@tanstack/react-query';
import { apiClientBlob, apiClientFormData } from '@/lib/api-client';
import { configuratorKeys } from './query-keys';

const BASE = '/api/configurator/v1/branding-logos';

export interface BrandingLogoMetadata {
  storage_key: string;
  blob_url: string;
  mime_type: string;
  file_name: string;
  uploaded_at: string;
}

export interface BrandingLogoUploadResponse {
  logo: BrandingLogoMetadata;
}

export async function uploadOrganizationBrandingLogo(
  slug: string,
  file: File,
): Promise<BrandingLogoMetadata> {
  const formData = new FormData();
  formData.append('slug', slug.trim().toLowerCase());
  formData.append('file', file);

  const response = await apiClientFormData<BrandingLogoUploadResponse>(
    `${BASE}/organization`,
    formData,
  );
  return response.logo;
}

export async function uploadTenantBrandingLogo(
  slug: string,
  file: File,
): Promise<BrandingLogoMetadata> {
  const formData = new FormData();
  formData.append('slug', slug.trim().toLowerCase());
  formData.append('file', file);

  const response = await apiClientFormData<BrandingLogoUploadResponse>(
    `${BASE}/tenant`,
    formData,
  );
  return response.logo;
}

export function brandingLogoDownloadPath(storageKey: string): string {
  const params = new URLSearchParams({ storage_key: storageKey });
  return `${BASE}/download?${params.toString()}`;
}

export async function fetchBrandingLogoBlob(storageKey: string): Promise<Blob> {
  return apiClientBlob(brandingLogoDownloadPath(storageKey), {
    headers: { Accept: 'image/png,image/jpeg,image/jpg' },
  });
}

export function parseBrandingLogoMetadata(
  metadata: Record<string, unknown> | null | undefined,
): BrandingLogoMetadata | null {
  const logo = metadata?.logo;
  if (!logo || typeof logo !== 'object') {
    return null;
  }
  const row = logo as Record<string, unknown>;
  const storageKey = typeof row.storage_key === 'string' ? row.storage_key.trim() : '';
  if (!storageKey) {
    return null;
  }
  return {
    storage_key: storageKey,
    blob_url: typeof row.blob_url === 'string' ? row.blob_url : '',
    mime_type: typeof row.mime_type === 'string' ? row.mime_type : 'image/png',
    file_name: typeof row.file_name === 'string' ? row.file_name : 'logo',
    uploaded_at: typeof row.uploaded_at === 'string' ? row.uploaded_at : '',
  };
}

export function brandingLogoQueryOptions(storageKey: string) {
  return queryOptions({
    queryKey: [...configuratorKeys.all, 'branding-logo', storageKey] as const,
    queryFn: () => fetchBrandingLogoBlob(storageKey),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
