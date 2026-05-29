import type { NhaEnrolByAadhaarResponse } from "@hims/ts-sdk-abha/protocol/m1";

/** Whitelisted enrolment fields safe to persist in `abdm_sessions.context` (no full NHA body). */
export interface EnrolAadhaarContextSnapshot {
  healthIdNumber?: string;
  isNew?: boolean;
  preferredAbhaAddress?: string;
  abhaAddress?: string;
  name?: string;
  gender?: string;
  yearOfBirth?: string;
  monthOfBirth?: string;
  dayOfBirth?: string;
}

function pickString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

/** Extract a minimal, non-PHI-heavy snapshot from NHA enrol/byAadhaar response. */
export function snapshotEnrolByAadhaarResponse(
  nha: NhaEnrolByAadhaarResponse,
): EnrolAadhaarContextSnapshot {
  const profile =
    nha.ABHAProfile && typeof nha.ABHAProfile === "object"
      ? (nha.ABHAProfile as Record<string, unknown>)
      : {};
  return {
    healthIdNumber: nha.healthIdNumber,
    isNew:
      typeof nha.new === "boolean"
        ? nha.new
        : typeof nha.isNew === "boolean"
          ? nha.isNew
          : undefined,
    preferredAbhaAddress: pickString(profile, "preferredAbhaAddress"),
    abhaAddress: pickString(profile, "abhaAddress"),
    name: pickString(profile, "name"),
    gender: pickString(profile, "gender"),
    yearOfBirth: pickString(profile, "yearOfBirth"),
    monthOfBirth: pickString(profile, "monthOfBirth"),
    dayOfBirth: pickString(profile, "dayOfBirth"),
  };
}
