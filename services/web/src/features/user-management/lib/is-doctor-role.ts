import type { UmRole } from '../types';

export function isDoctorRole(roleId: string | undefined, roles: UmRole[]): boolean {
  if (!roleId) return false;
  const role = roles.find((r) => r.id === roleId);
  const type = role?.role_type?.trim().toLowerCase();
  const code = role?.code.trim().toLowerCase();
  return type === 'doctor' || code === 'doctor';
}

export function validateDoctorTariffs(
  rows: { department_id: string; base_price: number }[],
): string | null {
  if (rows.length === 0) return 'Add at least one department with consultation fee';
  const ids = rows.map((r) => r.department_id);
  if (new Set(ids).size !== ids.length) return 'Each department can only be added once';
  if (rows.some((r) => !r.department_id)) return 'Select a department for each row';
  if (rows.some((r) => r.base_price > 3000)) return 'Consultation fee must be at most ₹3,000';
  return null;
}
