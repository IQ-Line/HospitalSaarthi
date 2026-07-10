/**
 * Pure mappers from an NHA share-profile snapshot to registration-desk shapes:
 * the parsed inbound payload, the registration prefill body, and the queue
 * summary row. No I/O — every function is deterministic given its inputs
 * (age computation takes an explicit `now`), so all are unit-testable.
 */

import type { ShareIssuance } from "./ports.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export type ShareProfileJson = Record<string, unknown>;

/** Parsed inbound `POST /hip/patient/share` body, or null when the profile is unusable. */
export function parseSharePatient(body: unknown): {
  abhaAddress: string;
  profile: ShareProfileJson;
  counterContext: string;
} | null {
  const root = body as {
    profile?: { patient?: Record<string, unknown> };
    metaData?: { context?: unknown };
  };
  const patient = root.profile?.patient;
  const abhaAddress = String(patient?.abhaAddress ?? "").trim();
  if (!patient || !abhaAddress) return null;
  const counterContext = String(root.metaData?.context ?? "1").trim() || "1";
  return { abhaAddress, profile: patient, counterContext };
}

export function mapGender(raw: unknown): "male" | "female" | "other" | "" {
  const g = String(raw ?? "").toLowerCase();
  if (g === "m" || g === "male") return "male";
  if (g === "f" || g === "female") return "female";
  if (g) return "other";
  return "";
}

function parseName(fullName: string): {
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", middle_name: null, last_name: null };
  if (parts.length === 1) return { first_name: parts[0]!, middle_name: null, last_name: null };
  return {
    first_name: parts[0]!,
    middle_name: parts.length > 2 ? parts.slice(1, -1).join(" ") : null,
    last_name: parts[parts.length - 1]!,
  };
}

function birthDateFromProfile(profile: ShareProfileJson): string | null {
  const y = profile.yearOfBirth;
  const m = profile.monthOfBirth;
  const d = profile.dayOfBirth;
  if (y == null || m == null || d == null) return null;
  const yy = String(y).padStart(4, "0");
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function ageYearsFromProfile(
  profile: ShareProfileJson,
  birthDate: string | null,
  now: Date,
): number | null {
  if (birthDate) {
    const dob = new Date(`${birthDate}T00:00:00+05:30`);
    const nowIst = new Date(now.getTime() + IST_OFFSET_MS);
    let age = nowIst.getUTCFullYear() - dob.getUTCFullYear();
    const m = nowIst.getUTCMonth() - dob.getUTCMonth();
    if (m < 0 || (m === 0 && nowIst.getUTCDate() < dob.getUTCDate())) age -= 1;
    return age >= 0 ? age : null;
  }
  const age = profile.age;
  return typeof age === "number" ? age : null;
}

function addressFromProfile(profile: ShareProfileJson): {
  line1: string;
  city: string;
  state: string;
  district: string;
  pincode: string;
} {
  const addr = (profile.address ?? {}) as Record<string, unknown>;
  return {
    line1: String(addr.line ?? profile.addressLine ?? "").trim(),
    city: String(addr.city ?? profile.city ?? "").trim(),
    state: String(addr.state ?? profile.state ?? "").trim(),
    district: String(addr.district ?? profile.district ?? "").trim(),
    pincode: String(addr.pincode ?? profile.pin ?? profile.pincode ?? "").trim(),
  };
}

export function buildRegistrationPrefill(profile: ShareProfileJson): Record<string, unknown> {
  const fullName = String(profile.name ?? profile.fullName ?? "").trim();
  const names = parseName(fullName);
  const birthDate = birthDateFromProfile(profile);
  const ageYears = ageYearsFromProfile(profile, birthDate, new Date());
  const addr = addressFromProfile(profile);
  const addressBlock = {
    line1: addr.line1,
    line2: "",
    city: addr.city,
    state: addr.state,
    district: addr.district,
    pincode: addr.pincode,
  };
  return {
    patient: {
      phone: String(profile.phoneNumber ?? profile.phone ?? "").trim(),
      first_name: names.first_name,
      middle_name: names.middle_name,
      last_name: names.last_name,
      gender: mapGender(profile.gender),
      date_of_birth: birthDate,
      age_years: ageYears,
      age_months: birthDate ? 0 : null,
      age_days: birthDate ? 0 : null,
      abha_number: String(profile.abhaNumber ?? profile.aabha_uhid ?? "").trim() || null,
      abha_address: String(profile.abhaAddress ?? profile.aabha_address ?? "").trim() || null,
    },
    permanent_address: addressBlock,
    residential_address: addressBlock,
    residential_same_as_permanent: true,
  };
}

export function listPatientSummary(row: ShareIssuance, now: Date): Record<string, unknown> {
  const profile = row.profile_json ?? {};
  const fullName = String(profile.name ?? profile.fullName ?? "").trim();
  const birthDate = birthDateFromProfile(profile);
  return {
    token_number: row.token_number,
    patient_name: fullName,
    phone_number: String(profile.phoneNumber ?? profile.phone ?? "").trim(),
    abha_address: row.abha_address,
    abha_number: String(profile.abhaNumber ?? profile.aabha_uhid ?? "").trim(),
    age_years: ageYearsFromProfile(profile, birthDate, now),
    gender: mapGender(profile.gender),
  };
}

export interface ResolvedShareToken {
  token_number: number;
  summary: Record<string, unknown>;
  prefill: Record<string, unknown>;
  freeze_abha: true;
}

/** Assemble the lookup/prefill response payload from an issuance row. */
export function buildResolvedToken(row: ShareIssuance, now: Date): ResolvedShareToken {
  return {
    token_number: row.token_number,
    summary: listPatientSummary(row, now),
    prefill: buildRegistrationPrefill(row.profile_json),
    freeze_abha: true,
  };
}
