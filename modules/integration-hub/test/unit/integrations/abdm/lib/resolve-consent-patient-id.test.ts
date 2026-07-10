import { describe, expect, it } from "vitest";
import {
  patientIdFromConsentCareContexts,
  resolveConsentPatientId,
} from "../../../../../src/integrations/abdm/lib/resolve-consent-patient-id.js";

describe("patientIdFromConsentCareContexts", () => {
  it("returns patientReference from consent careContexts", () => {
    expect(
      patientIdFromConsentCareContexts([
        {
          patientReference: "52d1f69a-c028-41a0-9741-db961460ef07",
          careContextReference: "visit-1",
        },
      ]),
    ).toBe("52d1f69a-c028-41a0-9741-db961460ef07");
  });

  it("skips abha-style patientReference", () => {
    expect(
      patientIdFromConsentCareContexts([
        {
          patientReference: "patient@sbx",
          careContextReference: "visit-1",
        },
      ]),
    ).toBeUndefined();
  });
});

describe("resolveConsentPatientId", () => {
  it("prefers EMPI lookup over careContext patientReference", async () => {
    const empiPatientId = "empi-canonical-patient-id";
    const patientId = await resolveConsentPatientId({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      abhaAddress: "patient@sbx",
      empi: {
        findPatientByAbhaAddress: async () => ({
          patientId: empiPatientId,
          demographics: {},
        }),
        findPatientByAbhaNumber: async () => null,
        findPatientByDemographics: async () => null,
        findAbhaAddressByPatientId: async () => "patient@sbx",
        findM2PatientProfile: async () => null,
      },
      careContexts: [
        {
          patientReference: "52d1f69a-c028-41a0-9741-db961460ef07",
          careContextReference: "cc-1",
        },
      ],
    });
    expect(patientId).toBe(empiPatientId);
  });

  it("uses validated careContext patientReference when EMPI miss and ref matches ABHA", async () => {
    const refPatientId = "52d1f69a-c028-41a0-9741-db961460ef07";
    const patientId = await resolveConsentPatientId({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      abhaAddress: "patient@sbx",
      empi: {
        findPatientByAbhaAddress: async () => null,
        findPatientByAbhaNumber: async () => null,
        findPatientByDemographics: async () => null,
        findAbhaAddressByPatientId: async () => "patient@sbx",
        findM2PatientProfile: async () => null,
      },
      careContexts: [
        {
          patientReference: refPatientId,
          careContextReference: "cc-1",
        },
      ],
    });
    expect(patientId).toBe(refPatientId);
  });

  it("rejects unvalidated careContext patientReference when EMPI miss", async () => {
    await expect(
      resolveConsentPatientId({
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        abhaAddress: "patient@sbx",
        empi: {
          findPatientByAbhaAddress: async () => null,
          findPatientByAbhaNumber: async () => null,
          findPatientByDemographics: async () => null,
          findAbhaAddressByPatientId: async () => "other@sbx",
          findM2PatientProfile: async () => null,
        },
        careContexts: [
          {
            patientReference: "52d1f69a-c028-41a0-9741-db961460ef07",
            careContextReference: "cc-1",
          },
        ],
      }),
    ).rejects.toThrow(/No EMPI patient/);
  });

  it("uses user-initiated link session patientId when EMPI and careContext ref miss", async () => {
    const patientId = await resolveConsentPatientId({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      abhaAddress: "patient@sbx",
      userLinkPatientId: "link-session-patient-id",
      empi: {
        findPatientByAbhaAddress: async () => null,
        findPatientByAbhaNumber: async () => null,
        findPatientByDemographics: async () => null,
        findAbhaAddressByPatientId: async () => null,
        findM2PatientProfile: async () => null,
      },
    });
    expect(patientId).toBe("link-session-patient-id");
  });
});
