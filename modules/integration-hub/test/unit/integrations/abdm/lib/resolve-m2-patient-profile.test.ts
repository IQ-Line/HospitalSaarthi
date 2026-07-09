import { describe, expect, it, vi } from "vitest";
import { resolveM2PatientProfile } from "../../../../../src/integrations/abdm/lib/resolve-m2-patient-profile.js";
import type { AbdmAdapterDeps } from "../../../../../src/integrations/abdm/ports.js";

const tenantId = "00000000-0000-4000-8000-0000000000aa";
const patientId = "00000000-0000-4000-8000-000000000001";

const registrationProfile = {
  abhaAddress: "yashi@sbx",
  abhaNumber: "91-5682-4304-3771",
  patientName: "Yashi Verma",
  gender: "F" as const,
  yearOfBirth: 2000,
};

function deps(overrides: {
  empi?: Partial<AbdmAdapterDeps["empi"]>;
  registration?: Partial<AbdmAdapterDeps["registration"]>;
}): Pick<AbdmAdapterDeps, "empi" | "registration"> {
  return {
    empi: {
      findM2PatientProfile: vi.fn(async () => null),
      findPatientByAbhaAddress: async () => null,
      findPatientByAbhaNumber: async () => null,
      findPatientByDemographics: async () => null,
      findAbhaAddressByPatientId: async () => null,
      ...overrides.empi,
    },
    registration: {
      findM2PatientProfile: vi.fn(async () => null),
      findPatientIdByAbhaAddress: async () => null,
      findAllPatientIdsByAbhaAddress: async () => [],
      ...overrides.registration,
    },
  };
}

describe("resolveM2PatientProfile", () => {
  it("prefers EMPI when ABHA address is linked there", async () => {
    const empiProfile = { ...registrationProfile, abhaAddress: "empi@sbx" };
    const d = deps({
      empi: { findM2PatientProfile: vi.fn(async () => empiProfile) },
      registration: {
        findM2PatientProfile: vi.fn(async () => registrationProfile),
      },
    });

    const result = await resolveM2PatientProfile(d, { iqTenantId: tenantId, patientId });
    expect(result?.abhaAddress).toBe("empi@sbx");
    expect(d.registration.findM2PatientProfile).not.toHaveBeenCalled();
  });

  it("falls back to registration snapshot when EMPI has no abha_address", async () => {
    const d = deps({
      registration: {
        findM2PatientProfile: vi.fn(async () => registrationProfile),
      },
    });

    const result = await resolveM2PatientProfile(d, { iqTenantId: tenantId, patientId });
    expect(result).toEqual(registrationProfile);
  });
});
