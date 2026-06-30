// @keep-in-sync-with modules/configurator/src/domain/tenant-cerbos-scope.ts
export function buildTenantCerbosScopeKey(orgId: string, tenantSlug: string): string {
  return `tenant:${orgId}:${tenantSlug.trim().toLowerCase()}`;
}

export function slugifyTenantLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeBranchCodeInput(value: string): string {
  return value.trim().replace(/[\u2010-\u2015\u2212]/g, '-').toUpperCase();
}

export function branchTenantSlug(orgSlug: string, branchCode: string): string {
  const normalized = normalizeBranchCodeInput(branchCode)
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/_/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeOrg = slugifyTenantLabel(orgSlug);
  if (!normalized) return safeOrg;
  return safeOrg ? `${safeOrg}-${normalized.toLowerCase()}` : normalized.toLowerCase();
}

export function resolveBranchTenantSlug(input: {
  orgSlug: string;
  branchName: string;
  branchCode?: string;
  manualSlug?: string;
}): string {
  const manual = input.manualSlug?.trim();
  if (manual) return slugifyTenantLabel(manual);

  const code = input.branchCode?.trim();
  if (code) return branchTenantSlug(input.orgSlug, code);

  const orgPart = slugifyTenantLabel(input.orgSlug);
  const namePart = slugifyTenantLabel(input.branchName);
  const slug =
    namePart.length >= 3
      ? orgPart
        ? `${orgPart}-${namePart}`
        : namePart
      : orgPart.length >= 3
        ? orgPart
        : namePart || orgPart;

  if (slug.length >= 3) return slug;

  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
  return slug ? `${slug}-${suffix}` : `branch-${suffix}`;
}
