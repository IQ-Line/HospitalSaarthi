import { describe, expect, it, vi } from "vitest";
import type { CareContextRepo, CareContextRow } from "../../../src/ports.js";
import { createCareContext } from "../../../src/use-cases/create-care-context.js";

const existing: CareContextRow = {
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  iq_tenant_id: "tenant-1",
  patient_id: "patient-1",
  source_origin: "platform_module",
  source_system_id: "opd",
  source_record_type: "opd_visit",
  source_record_id: "visit-9",
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

const baseInput = {
  patient_id: "patient-1",
  source_origin: "platform_module",
  source_system_id: "opd",
  source_record_type: "opd_visit",
  display: "OPD Visit -- 12 Mar 2026",
  period_start: new Date("2026-03-12T10:00:00Z"),
};

describe("createCareContext", () => {
  it("inserts and reports created=true on a fresh source tuple", async () => {
    const careContextRepo = {
      insert: vi.fn().mockResolvedValue({ ...existing, source_record_id: null }),
      findBySource: vi.fn(),
    } as unknown as CareContextRepo;

    const result = await createCareContext({ careContextRepo }, "tenant-1", baseInput);

    expect(result.created).toBe(true);
    expect(result.row.id).toBe(existing.id);
    expect(careContextRepo.insert).toHaveBeenCalledOnce();
    expect(careContextRepo.findBySource).not.toHaveBeenCalled();
  });

  it("is idempotent: a unique violation re-fetches by the source tuple, created=false", async () => {
    const careContextRepo = {
      insert: vi.fn().mockRejectedValue({ code: "23505" }),
      findBySource: vi.fn().mockResolvedValue(existing),
    } as unknown as CareContextRepo;

    const result = await createCareContext(
      { careContextRepo },
      "tenant-1",
      { ...baseInput, source_record_id: "visit-9" },
    );

    expect(result.created).toBe(false);
    expect(result.row).toBe(existing);
    expect(careContextRepo.findBySource).toHaveBeenCalledWith("tenant-1", {
      source_origin: "platform_module",
      source_system_id: "opd",
      source_record_type: "opd_visit",
      source_record_id: "visit-9",
    });
  });

  it("re-throws a non-unique error (does not swallow real failures)", async () => {
    const careContextRepo = {
      insert: vi.fn().mockRejectedValue(new Error("connection reset")),
      findBySource: vi.fn(),
    } as unknown as CareContextRepo;

    await expect(
      createCareContext({ careContextRepo }, "tenant-1", {
        ...baseInput,
        source_record_id: "visit-9",
      }),
    ).rejects.toThrow("connection reset");
    expect(careContextRepo.findBySource).not.toHaveBeenCalled();
  });

  it("re-throws a unique violation when source_record_id is absent (NULL never dedupes)", async () => {
    const careContextRepo = {
      insert: vi.fn().mockRejectedValue({ code: "23505" }),
      findBySource: vi.fn(),
    } as unknown as CareContextRepo;

    await expect(
      createCareContext({ careContextRepo }, "tenant-1", baseInput),
    ).rejects.toMatchObject({ code: "23505" });
    expect(careContextRepo.findBySource).not.toHaveBeenCalled();
  });
});
