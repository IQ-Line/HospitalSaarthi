import type {
  AbhaAddressPrefill,
  AbhaCreatedPayload,
  AbhaProfileDisplay,
  EnrolAadhaarVerifyResponse,
  NhaAbhaProfile,
} from '@/features/abha/types';
import {
  findDistrictCodeByName,
  findStateCodeByName,
} from '@/features/frontdesk/utils/state-district-catalog';

function pickString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === 'string' ? v.trim() : '';
}

/** NHA profile may be flat or nested under `ABHAProfile` / `data`. */
export function normalizeNhaProfile(profile: NhaAbhaProfile): NhaAbhaProfile {
  const record = profile as Record<string, unknown>;
  const nested = record.ABHAProfile ?? record.abhaProfile ?? record.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return { ...record, ...(nested as NhaAbhaProfile) };
  }
  return profile;
}

function pickProfileString(profile: NhaAbhaProfile, ...keys: string[]): string {
  const flat = normalizeNhaProfile(profile) as Record<string, unknown>;
  for (const key of keys) {
    const v = flat[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
}

function formatDob(profile: NhaAbhaProfile): string {
  const direct = profile.dob?.trim();
  if (direct) {
    const iso = direct.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
    return direct;
  }
  const d = profile.dayOfBirth?.padStart(2, '0');
  const m = profile.monthOfBirth?.padStart(2, '0');
  const y = profile.yearOfBirth;
  if (d && m && y) return `${d}-${m}-${y}`;
  return '';
}

function formatGenderDisplay(gender: string): string {
  const g = gender.trim().toUpperCase();
  if (g === 'M' || g === 'MALE') return 'M';
  if (g === 'F' || g === 'FEMALE') return 'F';
  if (g === 'O' || g === 'OTHER') return 'Other';
  return gender;
}

export function mapGenderToForm(gender: string): 'male' | 'female' | 'other' | undefined {
  const g = gender.trim().toUpperCase();
  if (g === 'M' || g === 'MALE') return 'male';
  if (g === 'F' || g === 'FEMALE') return 'female';
  if (g === 'O' || g === 'OTHER' || g === 'T' || g === 'TRANSGENDER') return 'other';
  return undefined;
}

function patientName(profile: NhaAbhaProfile): string {
  const full = profile.name?.trim();
  if (full) return full;
  return [profile.firstName, profile.middleName, profile.lastName]
    .filter((p) => typeof p === 'string' && p.trim())
    .join(' ')
    .trim();
}

function abhaAddress(profile: NhaAbhaProfile): string {
  const flat = normalizeNhaProfile(profile);
  const direct = pickProfileString(flat, 'abhaAddress', 'abha_address');
  if (direct) return direct;
  const preferred = pickProfileString(flat, 'preferredAbhaAddress', 'preferredAddress');
  if (preferred) return preferred;
  const phr = flat.phrAddress?.find((a) => typeof a === 'string' && a.trim());
  return phr?.trim() ?? '';
}

function physicalAddress(profile: NhaAbhaProfile): string {
  const line = profile.address?.trim();
  if (line) return line;
  const parts = [profile.districtName, profile.stateName, profile.pinCode]
    .filter((p) => typeof p === 'string' && p.trim())
    .map((p) => (p as string).trim());
  return parts.join(', ');
}

function abhaNumber(profile: NhaAbhaProfile, verify?: EnrolAadhaarVerifyResponse): string {
  return (
    pickProfileString(profile, 'ABHANumber', 'abhaNumber', 'healthIdNumber') ||
    verify?.healthIdNumber?.trim() ||
    ''
  );
}

export function mapAbhaProfileDisplay(
  profile: NhaAbhaProfile,
  verify?: EnrolAadhaarVerifyResponse,
): AbhaProfileDisplay {
  const flat = normalizeNhaProfile(profile);
  const genderRaw = flat.gender?.trim() ?? '';
  return {
    abhaNumber: abhaNumber(flat, verify),
    abhaAddress: abhaAddress(flat),
    patientName: patientName(flat),
    gender: formatGenderDisplay(genderRaw),
    dateOfBirth: formatDob(flat),
    mobile: flat.mobile?.replace(/\D/g, '').slice(-10) ?? '',
    address: physicalAddress(flat),
  };
}

export function mapAbhaProfileAddressPrefill(profile: NhaAbhaProfile): AbhaAddressPrefill | undefined {
  const flat = normalizeNhaProfile(profile);
  const line1 = pickProfileString(flat, 'address');
  const pincode = pickProfileString(flat, 'pinCode', 'pincode').replace(/\D/g, '').slice(0, 6);

  let state = pickProfileString(flat, 'stateCode', 'state_code');
  let district = pickProfileString(flat, 'districtCode', 'district_code');

  const stateName = pickProfileString(flat, 'stateName');
  const districtName = pickProfileString(flat, 'districtName');

  if (!state && stateName) {
    state = findStateCodeByName(stateName) ?? '';
  }
  if (!district && districtName && state) {
    district = findDistrictCodeByName(state, districtName) ?? '';
  }

  const out: AbhaAddressPrefill = {};
  if (line1) out.line1 = line1;
  if (state) out.state = state;
  if (district) out.district = district;
  if (pincode) out.pincode = pincode;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mapAbhaProfileToFormPrefill(
  profile: NhaAbhaProfile,
  verify?: EnrolAadhaarVerifyResponse,
): AbhaCreatedPayload {
  const flat = normalizeNhaProfile(profile);
  const display = mapAbhaProfileDisplay(flat, verify);
  const fullName = patientName(flat);
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = flat.firstName?.trim() || nameParts[0] || '';
  const lastName =
    flat.lastName?.trim() || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

  const dobIso = (() => {
    const d = display.dateOfBirth.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (d) return `${d[3]}-${d[2]}-${d[1]}`;
    const iso = flat.dob?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    return undefined;
  })();

  return {
    sessionId: '',
    abhaNumber: display.abhaNumber,
    abhaAddress: display.abhaAddress,
    phone: display.mobile || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    gender: mapGenderToForm(flat.gender ?? ''),
    dateOfBirth: dobIso,
    address: mapAbhaProfileAddressPrefill(flat),
  };
}
