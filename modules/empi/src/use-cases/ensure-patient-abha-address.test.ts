import { describe, expect, it, vi } from "vitest";
import { ensurePatientAbhaAddress } from "./ensure-patient-abha-address.js";

const TENANT = "1e8b5a2b-c4a2-4405-baad-c39b515a3426";
const PATIENT = "ade41f80-bcbd-4d58-9bdb-a80056ebef33";
const OTHER = "00000000-0000-4000-8000-000000000001";

describe("ensurePatientAbhaAddress", () => {
  it("links when no existing identifier", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "id-1",
      iq_tenant_id: TENANT,
      patient_id: PATIENT,
      identifier_type: "abha_address",
      identifier_value: "wardhan_111121@sbx",
    });
    const publish = vi.fn().mockResolvedValue(undefined);

    const result = await ensurePatientAbhaAddress(
      {
        identifierRepo: {
          findActivePatientIdByIdentifier: vi.fn().mockResolvedValue(undefined),
          create,
          findByPatient: vi.fn(),
          deactivate: vi.fn(),
        },
        eventBus: { publish },
      },
      TENANT,
      PATIENT,
      "wardhan_111121@sbx",
      "actor-1",
    );

    expect(result.status).toBe("linked");
    expect(create).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledOnce();
  });

  it("is idempotent for the same patient", async () => {
    const create = vi.fn();

    const result = await ensurePatientAbhaAddress(
      {
        identifierRepo: {
          findActivePatientIdByIdentifier: vi
            .fn()
            .mockResolvedValue(PATIENT),
          create,
          findByPatient: vi.fn(),
          deactivate: vi.fn(),
        },
        eventBus: { publish: vi.fn() },
      },
      TENANT,
      PATIENT,
      "wardhan_111121@sbx",
    );

    expect(result.status).toBe("already_linked");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns conflict when address belongs to another patient", async () => {
    const result = await ensurePatientAbhaAddress(
      {
        identifierRepo: {
          findActivePatientIdByIdentifier: vi.fn().mockResolvedValue(OTHER),
          create: vi.fn(),
          findByPatient: vi.fn(),
          deactivate: vi.fn(),
        },
        eventBus: { publish: vi.fn() },
      },
      TENANT,
      PATIENT,
      "wardhan_111121@sbx",
    );

    expect(result).toEqual({ status: "conflict", existingPatientId: OTHER });
  });
});
