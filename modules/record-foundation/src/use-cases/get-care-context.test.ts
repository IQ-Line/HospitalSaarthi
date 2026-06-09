import { describe, expect, it, vi } from "vitest";
import type { CareContextRepo } from "../ports.js";
import { getCareContext } from "./get-care-context.js";

describe("getCareContext", () => {
  it("returns null when care context is not found", async () => {
    const careContextRepo = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as CareContextRepo;

    const result = await getCareContext(
      { careContextRepo },
      "tenant-1",
      "00000000-0000-4000-8000-000000000000",
    );

    expect(careContextRepo.findById).toHaveBeenCalledWith(
      "tenant-1",
      "00000000-0000-4000-8000-000000000000",
    );
    expect(result).toBeNull();
  });

  it("returns the care context when found", async () => {
    const cc = {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      iq_tenant_id: "tenant-1",
      patient_id: "patient-1",
      source_origin: "platform_module",
      source_system_id: "opd",
      source_record_type: "opd_visit",
      source_record_id: null,
      encounter_id: null,
      display: "OPD Visit",
      period_start: new Date("2026-03-12T10:00:00Z"),
      period_end: null,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
    };

    const careContextRepo = {
      findById: vi.fn().mockResolvedValue(cc),
    } as unknown as CareContextRepo;

    const result = await getCareContext(
      { careContextRepo },
      "tenant-1",
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );

    expect(result).toEqual(cc);
  });
});
