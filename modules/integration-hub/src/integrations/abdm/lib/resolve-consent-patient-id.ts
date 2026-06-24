import { AbdmUseCaseError } from "./m1-errors.js";
import { abdmWarn } from "./abdm-adapter-log.js";
import type { EmpiClient, RegistrationClient } from "../ports.js";

const DEFAULT_MOCK_PATIENT_ID = "00000000-0000-4000-8000-000000000001";

/** `patientReference` from consent notify careContexts (discover/link patient id). */
export function patientIdFromConsentCareContexts(careContexts: unknown): string | undefined {
  if (!Array.isArray(careContexts)) return undefined;
  for (const item of careContexts) {
    if (!item || typeof item !== "object") continue;
    const ref = String(
      (item as Record<string, unknown>).patientReference ?? "",
    ).trim();
    if (!ref || ref.includes("@")) continue;
    return ref;
  }
  return undefined;
}

/**
 * Resolves patient for consent persistence — LIMS order:
 * careContext patientReference → user-initiated link session → EMPI → registration.
 */
export async function resolveConsentPatientId(input: {
  iqTenantId: string;
  abhaAddress: string;
  empi: EmpiClient;
  registration?: RegistrationClient;
  careContexts?: unknown;
  userLinkPatientId?: string | null;
}): Promise<string> {
  const fromCareContexts = patientIdFromConsentCareContexts(input.careContexts);
  if (fromCareContexts) {
    abdmWarn("abdm.m2.consent.care_context_patient_ref", {
      abhaAddress: input.abhaAddress,
      patientId: fromCareContexts,
    });
    return fromCareContexts;
  }

  const fromLinkSession = input.userLinkPatientId?.trim();
  if (fromLinkSession) {
    abdmWarn("abdm.m2.consent.user_link_session_patient", {
      abhaAddress: input.abhaAddress,
      patientId: fromLinkSession,
    });
    return fromLinkSession;
  }

  const empiPatient = await input.empi.findPatientByAbhaAddress({
    iqTenantId: input.iqTenantId,
    abhaAddress: input.abhaAddress,
  });
  if (empiPatient?.patientId) {
    return empiPatient.patientId;
  }

  const registrationPatientId = await input.registration?.findPatientIdByAbhaAddress({
    iqTenantId: input.iqTenantId,
    abhaAddress: input.abhaAddress,
  });
  if (registrationPatientId) {
    abdmWarn("abdm.m2.consent.registration_patient_fallback", {
      abhaAddress: input.abhaAddress,
      patientId: registrationPatientId,
    });
    return registrationPatientId;
  }
  if (process.env["ABDM_M2_MOCK_PLATFORM"] === "true") {
    const mockId =
      process.env["ABDM_MOCK_PATIENT_ID"]?.trim() || DEFAULT_MOCK_PATIENT_ID;
    abdmWarn("abdm.m2.consent.empi_mock_patient", {
      abhaAddress: input.abhaAddress,
      patientId: mockId,
    });
    return mockId;
  }
  throw new AbdmUseCaseError(
    `No EMPI patient for ABHA ${input.abhaAddress}`,
    422,
    "PATIENT_NOT_FOUND",
  );
}
