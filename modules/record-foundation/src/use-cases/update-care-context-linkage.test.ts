import { describe, expect, it, vi } from "vitest";
import type { CareContextRepo } from "../ports.js";
import type { CareContext } from "../domain/care-context.js";
import { updateCareContextLinkage } from "./update-care-context-linkage.js";

describe("updateCareContextLinkage", () => {
  it("updates linkage and returns the updated care context", async () => {
    const updated: CareContext = {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      iq_tenant_id: "tenant-1",
      patient_id: "patient-1",
      abha_linkage_status: "linked",
      abdm_reference_number: "REF-123",
      source_origin: "platform_module",
      source_system_id: "opd",
      source_record_type: "opd_visit",
      source_record_id: null,
      encounter_id: null,
      display: "Test",
      period_start: new Date(),
      period_end: null,
      status: "final",
      supersedes_id: null,
      sensitivity_labels: null,
      consent_disclosable: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
      linked_at: new Date(),
      data_erase_at: null,
    };

    const careContextRepo = {
      updateLinkage: vi.fn().mockResolvedValue(updated),
    } as unknown as CareContextRepo;

    const result = await updateCareContextLinkage(
      { careContextRepo },
      {
        tenantId: "tenant-1",
        careContextId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        abhaLinkageStatus: "linked",
        abdmReferenceNumber: "REF-123",
      },
    );

    expect(careContextRepo.updateLinkage).toHaveBeenCalledWith(
      "tenant-1",
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "linked",
      "REF-123",
      undefined,
    );
    expect(result?.abha_linkage_status).toBe("linked");
    expect(result?.abdm_reference_number).toBe("REF-123");
  });

  it("returns null when care context not found", async () => {
    const careContextRepo = {
      updateLinkage: vi.fn().mockResolvedValue(null),
    } as unknown as CareContextRepo;

    const result = await updateCareContextLinkage(
      { careContextRepo },
      {
        tenantId: "tenant-1",
        careContextId: "nonexistent-id",
        abhaLinkageStatus: "linked",
      },
    );

    expect(result).toBeNull();
  });
});
