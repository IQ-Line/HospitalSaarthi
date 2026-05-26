import type { Organization } from '@/features/configurator/types';

export function organisationWebsiteFromOrg(org: Organization): string {
  if (org.website?.trim()) return org.website.trim();
  const meta = org.metadata as { website?: string | null } | null | undefined;
  return meta?.website?.trim() ?? '';
}

export function organisationEmailFromOrg(org: Organization): string {
  return org.contact_email?.trim() ?? '';
}
