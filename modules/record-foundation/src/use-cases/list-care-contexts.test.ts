import { describe, expect, it, vi } from "vitest";
import type { CareContextRepo } from "../ports.js";
import { listCareContexts } from "./list-care-contexts.js";

describe("listCareContexts", () => {
  it("returns care contexts filtered by patient_id", async () => {
    const careContextRepo = {
      findAll: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    } as unknown as CareContextRepo;

    const result = await listCareContexts(
      { careContextRepo },
      "tenant-1",
      { patient_id: "patient-1" },
    );

    expect(careContextRepo.findAll).toHaveBeenCalledWith("tenant-1", {
      patient_id: "patient-1",
    });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("returns all contexts when no filter provided", async () => {
    const careContextRepo = {
      findAll: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    } as unknown as CareContextRepo;

    await listCareContexts({ careContextRepo }, "tenant-1");

    expect(careContextRepo.findAll).toHaveBeenCalledWith("tenant-1", undefined);
  });
});
