import { describe, expect, it, vi } from "vitest";
import type { CareContextRepo, CareContextRow } from "../../../src/ports.js";
import { createCareContext } from "../../../src/use-cases/create-care-context.js";

describe("createCareContext", () => {
  it("creates a care context and returns it", async () => {
    const created: CareContextRow = {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      iq_tenant_id: "tenant-1",
      patient_id: "patient-1",
      source_origin: "platform_module",
      source_system_id: "opd",
      source_record_type: "opd_visit",
      source_record_id: null,
      encounter_id: null,
      display: "OPD Visit -- 12 Mar 2026",
      period_start: new Date("2026-03-12T10:00:00Z"),
      period_end: null,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
    };

    const careContextRepo = {
      insert: vi.fn().mockResolvedValue(created),
    } as unknown as CareContextRepo;

    const result = await createCareContext(
      { careContextRepo },
      "tenant-1",
      {
        patient_id: "patient-1",
        source_origin: "platform_module",
        source_system_id: "opd",
        source_record_type: "opd_visit",
        display: "OPD Visit -- 12 Mar 2026",
        period_start: new Date("2026-03-12T10:00:00Z"),
      },
    );

    expect(careContextRepo.insert).toHaveBeenCalledOnce();
    expect(result.id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(result.source_origin).toBe("platform_module");
  });

  it("throws when a duplicate care context is created", async () => {
    const duplicateError = new Error("duplicate key value violates unique constraint \"uq_care_contexts_source\"");
    const careContextRepo = {
      insert: vi.fn().mockRejectedValue(duplicateError),
    } as unknown as CareContextRepo;

    await expect(
      createCareContext(
        { careContextRepo },
        "tenant-1",
        {
          patient_id: "patient-1",
          source_origin: "platform_module",
          source_system_id: "opd",
          source_record_type: "opd_visit",
          display: "OPD Visit -- 12 Mar 2026",
          period_start: new Date("2026-03-12T10:00:00Z"),
        },
      ),
    ).rejects.toThrow("duplicate key value violates unique constraint");
  });
});
