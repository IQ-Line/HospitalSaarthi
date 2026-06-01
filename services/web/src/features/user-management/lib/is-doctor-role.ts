import type { UmRole } from '@/features/user-management/types';

/** Tenant staff doctor role (UM role template code). */
export function isDoctorRole(role: UmRole | undefined): boolean {
  return role?.code.trim().toLowerCase() === 'doctor';
}

export function findSelectedRole(
  roles: UmRole[],
  selectedRoleId: string | undefined,
): UmRole | undefined {
  if (!selectedRoleId) return undefined;
  return roles.find((role) => role.id === selectedRoleId);
}
