import { describe, expect, it, vi } from "vitest";
import type { CareContextRepo } from "../ports.js";
import type { CareContext } from "../domain/care-context.js";
import { createCareContext } from "./create-care-context.js";

describe("createCareContext", () => {
  it("creates a care context and returns it", async () => {
    const created: CareContext = {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      iq_tenant_id: "11111111-2222-4333-8444-555555555555",
      patient_id: "22222222-3333-4444-8555-666666666666",
      abha_linkage_status: "not_linked",
      abdm_reference_number: null,
      source_origin: "platform_module",
      source_system_id: "opd",
      source_record_type: "opd_visit",
      source_record_id: null,
      encounter_id: null,
      display: "OPD Visit -- 12 Mar 2026",
      period_start: new Date("2026-03-12T10:00:00Z"),
      period_end: null,
      status: "draft",
      supersedes_id: null,
      sensitivity_labels: null,
      consent_disclosable: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
      linked_at: null,
      data_erase_at: null,
    };

    const careContextRepo = {
      create: vi.fn().mockResolvedValue(created),
    } as unknown as CareContextRepo;

    const result = await createCareContext(
      { careContextRepo },
      {
        iq_tenant_id: "11111111-2222-4333-8444-555555555555",
        patient_id: "22222222-3333-4444-8555-666666666666",
        source_origin: "platform_module",
        source_system_id: "opd",
        source_record_type: "opd_visit",
        display: "OPD Visit -- 12 Mar 2026",
        period_start: new Date("2026-03-12T10:00:00Z"),
      },
    );

    expect(careContextRepo.create).toHaveBeenCalledOnce();
    expect(result.id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(result.source_origin).toBe("platform_module");
  });
});
