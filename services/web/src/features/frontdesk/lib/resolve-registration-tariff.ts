import type { TariffService } from '@/features/billing/types';
import { TARIFF_PICKLIST_REGISTRATION_FEE } from '@/features/billing/lib/tariff-type';

/** Picklist `value` for OPD consultation (department + doctor on tariff row). */
export const TARIFF_PICKLIST_CONSULTATION_FEE = 'consultation-fee';

/** Legacy `category` values on seed/mock rows before picklist slugs. */
export const LEGACY_REGISTRATION_CATEGORY = 'registration';
export const LEGACY_CONSULTATION_CATEGORY = 'consultation';

export function isRegistrationCategory(category: string | null | undefined): boolean {
  const c = category?.trim().toLowerCase() ?? '';
  return c === TARIFF_PICKLIST_REGISTRATION_FEE || c === LEGACY_REGISTRATION_CATEGORY;
}

export function isConsultationCategory(category: string | null | undefined): boolean {
  const c = category?.trim().toLowerCase() ?? '';
  return c === TARIFF_PICKLIST_CONSULTATION_FEE || c === LEGACY_CONSULTATION_CATEGORY;
}

function normDept(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

/** Frontdesk / rack registration fee (no doctor). */
export function pickRegistrationTariff(rows: TariffService[]): TariffService | null {
  const candidates = rows.filter((r) => r.is_active && isRegistrationCategory(r.category));
  if (candidates.length === 0) return null;

  const rack = candidates.filter((r) => r.provider_id == null);
  const pool = rack.length > 0 ? rack : candidates;

  const frontdesk = pool.find((r) => normDept(r.department) === 'frontdesk');
  if (frontdesk) return frontdesk;

  return pool[0] ?? null;
}

/**
 * Doctor-specific row first, then department rack (`provider_id` null), then any consultation row.
 */
export function pickConsultationTariff(
  rows: TariffService[],
  providerId: string | null | undefined,
  departmentName: string | null | undefined,
): TariffService | null {
  const deptKey = normDept(departmentName);
  let candidates = rows.filter((r) => r.is_active && isConsultationCategory(r.category));
  if (deptKey) {
    const inDept = candidates.filter((r) => normDept(r.department) === deptKey);
    if (inDept.length > 0) candidates = inDept;
  }
  if (candidates.length === 0) return null;

  const pid = providerId?.trim();
  if (pid) {
    const forDoctor = candidates.find((r) => r.provider_id === pid);
    if (forDoctor) return forDoctor;
  }

  const rack = candidates.find((r) => r.provider_id == null);
  return rack ?? candidates[0] ?? null;
}

export function tariffToBillingFeeLine(tariff: TariffService): {
  unit_price: number;
  tax_percent: number;
  discount: number;
  item_code: string;
  service_name: string;
} {
  return {
    unit_price: Number(tariff.base_price) || 0,
    tax_percent: Number(tariff.tax_percentage) || 0,
    discount: 0,
    item_code: tariff.service_code,
    service_name: tariff.service_name,
  };
}
