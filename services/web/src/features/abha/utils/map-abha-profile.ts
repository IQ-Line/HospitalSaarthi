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
  const preferred = profile.preferredAbhaAddress?.trim();
  if (preferred) return preferred;
  const phr = profile.phrAddress?.find((a) => typeof a === 'string' && a.trim());
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
    pickString(profile as Record<string, unknown>, 'ABHANumber') ||
    verify?.healthIdNumber?.trim() ||
    ''
  );
}

export function mapAbhaProfileDisplay(
  profile: NhaAbhaProfile,
  verify?: EnrolAadhaarVerifyResponse,
): AbhaProfileDisplay {
  const genderRaw = profile.gender?.trim() ?? '';
  return {
    abhaNumber: abhaNumber(profile, verify),
    abhaAddress: abhaAddress(profile),
    patientName: patientName(profile),
    gender: formatGenderDisplay(genderRaw),
    dateOfBirth: formatDob(profile),
    mobile: profile.mobile?.replace(/\D/g, '').slice(-10) ?? '',
    address: physicalAddress(profile),
  };
}

function profileField(profile: NhaAbhaProfile, ...keys: string[]): string {
  for (const key of keys) {
    const v = profile[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
}

export function mapAbhaProfileAddressPrefill(profile: NhaAbhaProfile): AbhaAddressPrefill | undefined {
  const line1 = profileField(profile, 'address');
  const pincode = profileField(profile, 'pinCode', 'pincode').replace(/\D/g, '').slice(0, 6);

  let state = profileField(profile, 'stateCode', 'state_code');
  let district = profileField(profile, 'districtCode', 'district_code');

  const stateName = profileField(profile, 'stateName');
  const districtName = profileField(profile, 'districtName');

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
  const display = mapAbhaProfileDisplay(profile, verify);
  const fullName = patientName(profile);
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = profile.firstName?.trim() || nameParts[0] || '';
  const lastName =
    profile.lastName?.trim() || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

  const dobIso = (() => {
    const d = display.dateOfBirth.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (d) return `${d[3]}-${d[2]}-${d[1]}`;
    const iso = profile.dob?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    return undefined;
  })();

  return {
    abhaNumber: display.abhaNumber,
    abhaAddress: display.abhaAddress,
    phone: display.mobile || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    gender: mapGenderToForm(profile.gender ?? ''),
    dateOfBirth: dobIso,
    address: mapAbhaProfileAddressPrefill(profile),
  };
}
