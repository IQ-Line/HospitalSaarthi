import type { VisitRegistrationAddressBlock } from '@/features/frontdesk/types';
import { STATE_DISTRICT_CODES } from '@/features/frontdesk/data/state-district-codes';
import { listDistrictsForStateCode } from '@/features/frontdesk/utils/state-district-catalog';

export interface EmpiAddressParts {
  street?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
}

/** Human-readable state name from catalog code (or passthrough if already a name). */
export function resolveStateDisplayName(stateCode: string | null | undefined): string {
  const raw = stateCode?.trim();
  if (!raw) return '';
  const code = Number(raw);
  if (!Number.isFinite(code) || code <= 0) return raw;
  const entry = STATE_DISTRICT_CODES.find((row) => row.state_code === code);
  return entry?.state ?? raw;
}

/** Human-readable district name from catalog codes (or passthrough if already a name). */
export function resolveDistrictDisplayName(
  stateCode: string | null | undefined,
  districtCode: string | null | undefined,
): string {
  const raw = districtCode?.trim();
  if (!raw) return '';
  const districts = listDistrictsForStateCode(stateCode ?? '');
  const code = Number(raw);
  if (Number.isFinite(code) && code > 0) {
    const match = districts.find((row) => row.code === code);
    if (match) return match.name;
  }
  return raw;
}

function isNumericCode(value: string | undefined | null): boolean {
  const raw = value?.trim();
  if (!raw) return false;
  return /^\d+$/.test(raw);
}

function isRegionAlreadyInStreetAddress(street: string, needle: string): boolean {
  const s = street.trim().toLowerCase();
  const n = needle.trim().toLowerCase();
  if (!s || !n) return false;
  return s.includes(n);
}

/** HIMS-aligned single-line address for reports and print previews. */
export function formatEmpiAddressForDisplay(
  address: EmpiAddressParts | null | undefined,
): string {
  if (!address) return '';

  const stateName = resolveStateDisplayName(address.state);
  const districtName = resolveDistrictDisplayName(
    address.state,
    address.district ?? address.city,
  );
  const street = address.street?.trim() ?? '';

  const parts: string[] = [];
  if (street) parts.push(street);
  if (address.city && !isNumericCode(address.city)) {
    parts.push(address.city.trim());
  }
  if (districtName && !isRegionAlreadyInStreetAddress(street, districtName)) {
    parts.push(districtName);
  }
  if (stateName && !isRegionAlreadyInStreetAddress(street, stateName)) {
    parts.push(stateName);
  }
  if (address.pincode?.trim()) parts.push(address.pincode.trim());

  return parts.join(', ');
}

export function formatPatientAddressForReport(
  address: VisitRegistrationAddressBlock | undefined,
): string | undefined {
  if (!address) return undefined;

  const street = [address.line1?.trim(), address.line2?.trim()].filter(Boolean).join(', ');
  const formatted = formatEmpiAddressForDisplay({
    street,
    city: address.city,
    district: address.district,
    state: address.state,
    pincode: address.pincode,
  });

  return formatted || undefined;
}

export function registrationAddressBlockFromForm(
  address: VisitRegistrationAddressBlock | undefined,
): VisitRegistrationAddressBlock | undefined {
  if (!address) return undefined;
  const hasContent = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.district,
    address.pincode,
  ].some((part) => part?.trim());
  return hasContent ? address : undefined;
}
