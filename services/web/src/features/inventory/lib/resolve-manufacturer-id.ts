import type { ManufacturerMasterOption } from '@/features/inventory-masters/api/manufacturer-lookup';
import { isUuid, normalizeOptionalUuid } from './normalize-optional-uuid';

const PLACEHOLDER_MANUFACTURER_IDS = new Set(['', '__none__', 'mfr-none']);

export function isPlaceholderManufacturerId(value: string | null | undefined): boolean {
  if (value == null) return true;
  return PLACEHOLDER_MANUFACTURER_IDS.has(value.trim());
}

/** Resolve manufacturer id for API payload — prefers a row from the loaded list. */
export function resolveManufacturerIdForPayload(
  manufacturerId: string | null | undefined,
  manufacturers: ManufacturerMasterOption[],
): string | null {
  const trimmed = manufacturerId?.trim() ?? '';
  if (isPlaceholderManufacturerId(trimmed)) return null;

  const fromList = manufacturers.find((row) => row.id === trimmed);
  if (fromList) return fromList.id;

  return normalizeOptionalUuid(trimmed);
}

export function isManufacturerSelected(
  manufacturerId: string | null | undefined,
  manufacturers: ManufacturerMasterOption[],
): boolean {
  return resolveManufacturerIdForPayload(manufacturerId, manufacturers) != null;
}

export function isResolvableUuid(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return false;
  return isUuid(trimmed);
}
