import { describe, expect, it } from "vitest";
import { resolveConsentPatientId } from "./resolve-consent-patient-id.js";

describe("resolveConsentPatientId", () => {
  it("falls back to registration when EMPI has no abha_address identifier", async () => {
    const patientId = await resolveConsentPatientId({
      iqTenantId: "1e8b5a2b-c4a2-4405-baad-c39b515a3426",
      abhaAddress: "wardhan_111121@sbx",
      empi: { findPatientByAbhaAddress: async () => null },
      registration: {
        findM2PatientProfile: async () => null,
        findPatientIdByAbhaAddress: async () => "ade41f80-bcbd-4d58-9bdb-a80056ebef33",
      },
    });

    expect(patientId).toBe("ade41f80-bcbd-4d58-9bdb-a80056ebef33");
  });
});
