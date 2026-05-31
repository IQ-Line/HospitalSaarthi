import type { PicklistValue } from '@/features/master-data/types';

/** Role-type picklist values for platform operators (UM role.code templates). */
export const GLOBAL_ROLE_TYPE_VALUES = ['super-admin', 'tenant-admin'] as const;

export type GlobalRoleTypeValue = (typeof GLOBAL_ROLE_TYPE_VALUES)[number];

export function isGlobalRoleTypeValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (GLOBAL_ROLE_TYPE_VALUES as readonly string[]).includes(normalized);
}

/**
 * Platform super-admin sees global role types only; tenant-admin and other users see tenant staff types.
 */
export function filterRoleTypePicklistForPrincipal(
  values: readonly PicklistValue[],
  input: { isPlatformSuperAdmin: boolean },
): PicklistValue[] {
  const active = values.filter((v) => v.is_active);
  if (input.isPlatformSuperAdmin) {
    return active.filter((v) => v.is_global);
  }
  return active.filter((v) => !v.is_global);
}
