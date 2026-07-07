import type {
  DiscoveryPatientRequest,
  DiscoveryRequest,
} from "@hims/ts-sdk-abha/protocol/m2";

/** ABDM §5.3.2 sends `patient` as an object; some sandboxes use a one-element array. */
export function normalizeDiscoveryPatient(
  patient: DiscoveryRequest["patient"] | DiscoveryPatientRequest | undefined,
): DiscoveryPatientRequest | null {
  if (patient == null) return null;
  if (Array.isArray(patient)) return patient[0] ?? null;
  if (typeof patient === "object") return patient;
  return null;
}

function identifierValue(
  identifiers: DiscoveryPatientRequest["verifiedIdentifiers"] | undefined,
  ...types: string[]
): string | undefined {
  if (!identifiers?.length) return undefined;
  const normalized = new Set(types.map((t) => t.toUpperCase()));
  for (const id of identifiers) {
    if (normalized.has(id.type.toUpperCase()) && id.value?.trim()) {
      return id.value.trim();
    }
  }
  return undefined;
}

/** Resolve PHR address / ABHA address from CM discover callback (§5.3.2). */
export function resolveDiscoveryAbhaAddress(
  patient: DiscoveryPatientRequest | null,
): string | undefined {
  if (!patient) return undefined;
  const fromId = patient.id?.trim();
  if (fromId?.includes("@")) return fromId;

  return (
    identifierValue(patient.verifiedIdentifiers, "ABHA", "ABHA_ADDRESS") ??
    identifierValue(patient.unverifiedIdentifiers, "ABHA", "ABHA_ADDRESS") ??
    (fromId || undefined)
  );
}

export function resolveDiscoveryAbhaNumber(
  patient: DiscoveryPatientRequest | null,
): string | undefined {
  return identifierValue(patient?.verifiedIdentifiers, "ABHA_NUMBER");
}

export function resolveDiscoveryMobile(
  patient: DiscoveryPatientRequest | null,
): string | undefined {
  return (
    identifierValue(patient?.verifiedIdentifiers, "MOBILE", "MOBILE_NUMBER") ??
    identifierValue(patient?.unverifiedIdentifiers, "MOBILE", "MOBILE_NUMBER")
  );
}

function mapAbdmGenderToEmpi(gender: string | undefined): "male" | "female" | "other" | undefined {
  const g = (gender ?? "").trim().toUpperCase();
  if (g === "M" || g === "MALE") return "male";
  if (g === "F" || g === "FEMALE") return "female";
  if (g === "O" || g === "OTHER" || g === "D" || g === "TRANS") return "other";
  return undefined;
}

/** Map §5.3.2 patient block to EMPI find-by-demographics body. */
export function buildEmpiDemographicsFromDiscovery(
  patient: DiscoveryPatientRequest | null,
): {
  first_name?: string;
  gender?: "male" | "female" | "other";
  phone_number?: string;
  year_of_birth?: number;
} | null {
  if (!patient) return null;
  const phone = resolveDiscoveryMobile(patient);
  const gender = mapAbdmGenderToEmpi(patient.gender);
  const name = patient.name?.trim();
  if (!phone || !gender || !name) return null;

  const yearOfBirth =
    typeof patient.yearOfBirth === "number" && patient.yearOfBirth > 1900
      ? patient.yearOfBirth
      : undefined;

  return {
    first_name: name.split(/\s+/)[0] ?? name,
    gender,
    phone_number: phone,
    ...(yearOfBirth ? { year_of_birth: yearOfBirth } : {}),
  };
}
