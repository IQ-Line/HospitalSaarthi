import { describe, expect, it, vi } from "vitest";
import type { PatientRepo } from "../../../src/ports.js";
import { searchPatients } from "../../../src/use-cases/search-patients.js";

describe("searchPatients", () => {
  it("normalizes phone and ABHA filters before querying the repo", async () => {
    const patientRepo = {
      findAll: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    } as unknown as PatientRepo;

    await searchPatients({ patientRepo }, "tenant-1", {
      phone_number: "8527020272",
      abha_number: "91568243043771",
    });

    expect(patientRepo.findAll).toHaveBeenCalledWith("tenant-1", {
      phone_number: "+918527020272",
      abha_number: "91-5682-4304-3771",
    });
  });
});
