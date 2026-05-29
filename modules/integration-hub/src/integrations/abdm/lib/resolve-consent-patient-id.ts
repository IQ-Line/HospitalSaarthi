import { AbdmUseCaseError } from "./m1-errors.js";
import { abdmWarn } from "./abdm-adapter-log.js";
import type { EmpiClient } from "../ports.js";

const DEFAULT_MOCK_PATIENT_ID = "00000000-0000-4000-8000-000000000001";

/** Resolves patient for consent persistence — never anonymous random UUIDs. */
export async function resolveConsentPatientId(input: {
  iqTenantId: string;
  abhaAddress: string;
  empi: EmpiClient;
}): Promise<string> {
  const empiPatient = await input.empi.findPatientByAbhaAddress({
    iqTenantId: input.iqTenantId,
    abhaAddress: input.abhaAddress,
  });
  if (empiPatient?.patientId) {
    return empiPatient.patientId;
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
