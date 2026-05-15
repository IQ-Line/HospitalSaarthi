import type { TenantWizardAdminSnapshot } from '@/features/configurator/types';

let pending: TenantWizardAdminSnapshot | null = null;

/** Holds the last wizard step-3 payload after a successful create (until replaced or cleared). */
export function setPendingAdminProvisioning(snapshot: TenantWizardAdminSnapshot | null): void {
  pending = snapshot;
}

export function getPendingAdminProvisioning(): TenantWizardAdminSnapshot | null {
  return pending;
}

export function clearPendingAdminProvisioning(): void {
  pending = null;
}
