import { describe, expect, it, vi } from "vitest";
import type { PatientRepo } from "../../../src/ports.js";
import {
  hasSearchCriteria,
  MAX_SEARCH_LIMIT,
  searchPatients,
} from "../../../src/use-cases/search-patients.js";

function repoReturning(data: unknown[], total: number): PatientRepo {
  return {
    findAll: vi.fn().mockResolvedValue({ data, total }),
  } as unknown as PatientRepo;
}

describe("searchPatients", () => {
  it("rejects a criterion-less query WITHOUT touching the repo (no tenant leak)", async () => {
    const patientRepo = repoReturning([], 0);
    const result = await searchPatients({ patientRepo }, "tenant-1", {});
    expect(result).toEqual({ ok: false, reason: "no_criteria" });
    expect(patientRepo.findAll).not.toHaveBeenCalled();
  });

  it("treats a name shorter than 2 chars as no criterion", async () => {
    const patientRepo = repoReturning([], 0);
    const result = await searchPatients({ patientRepo }, "tenant-1", { name: "a" });
    expect(result.ok).toBe(false);
    expect(patientRepo.findAll).not.toHaveBeenCalled();
  });

  it("normalizes phone and ABHA filters before querying the repo", async () => {
    const patientRepo = repoReturning([], 0);
    await searchPatients({ patientRepo }, "tenant-1", {
      phone_number: "8527020272",
      abha_number: "91568243043771",
    });
    expect(patientRepo.findAll).toHaveBeenCalledWith("tenant-1", {
      phone_number: "+918527020272",
      abha_number: "91-5682-4304-3771",
      page: 1,
      limit: 20,
    });
  });

  it("caps the limit at MAX_SEARCH_LIMIT and computes total_pages", async () => {
    const patientRepo = repoReturning([], 250);
    const result = await searchPatients({ patientRepo }, "tenant-1", {
      uhid: "UHID-1",
      limit: 500,
      page: 2,
    });
    // repo receives the clamped limit, not the requested 500
    expect(patientRepo.findAll).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ limit: MAX_SEARCH_LIMIT, page: 2 }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.limit).toBe(MAX_SEARCH_LIMIT);
      expect(result.page.total).toBe(250);
      expect(result.page.total_pages).toBe(3); // ceil(250 / 100)
      expect(result.page.page).toBe(2);
    }
  });

  it("returns total_pages 0 when there are no matches", async () => {
    const patientRepo = repoReturning([], 0);
    const result = await searchPatients({ patientRepo }, "tenant-1", { uhid: "X" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.total_pages).toBe(0);
    }
  });

  it("hasSearchCriteria accepts any single identity key and rejects empties", () => {
    expect(hasSearchCriteria({ uhid: "U" })).toBe(true);
    expect(hasSearchCriteria({ phone_number: "9" })).toBe(true);
    expect(hasSearchCriteria({ abha_number: "91-..." })).toBe(true);
    expect(hasSearchCriteria({ name: "Jo" })).toBe(true);
    expect(hasSearchCriteria({ name: "J" })).toBe(false);
    expect(hasSearchCriteria({ status: "active" })).toBe(false);
    expect(hasSearchCriteria({})).toBe(false);
  });
});
