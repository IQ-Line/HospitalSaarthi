import { describe, expect, it, vi } from "vitest";
import type { DbInstance } from "@hims/ts-sdk-db";
import {
  DrizzleBedRepo,
  InMemoryBedRepo,
  occupyBedWhere,
  releaseBedReservationWhere,
  reserveBedWhere,
} from "../data-access/bed.repo.js";

describe("DrizzleBedRepo atomic preconditions", () => {
  function mockUpdateDb(returning: unknown[]) {
    const returningFn = vi.fn().mockResolvedValue(returning);
    const whereFn = vi.fn().mockReturnValue({ returning: returningFn });
    const setFn = vi.fn().mockReturnValue({ where: whereFn });
    const updateFn = vi.fn().mockReturnValue({ set: setFn });
    const db = { update: updateFn } as unknown as DbInstance;
    return { db, updateFn, setFn, whereFn, returningFn };
  }

  it("reserveForEpisode returns null when UPDATE matches no row", async () => {
    const { db, whereFn } = mockUpdateDb([]);
    const repo = new DrizzleBedRepo(db);
    const result = await repo.reserveForEpisode("tenant-1", "bed-1", "ep-1");
    expect(result).toBeNull();
    expect(whereFn).toHaveBeenCalledWith(reserveBedWhere("tenant-1", "bed-1", "ep-1"));
  });

  it("occupyForEpisode returns null when bed is taken by another episode", async () => {
    const { db } = mockUpdateDb([]);
    const repo = new DrizzleBedRepo(db);
    const result = await repo.occupyForEpisode("tenant-1", "bed-1", "ep-2", "patient-1");
    expect(result).toBeNull();
  });

  it("occupyForEpisode uses atomic occupy precondition in WHERE", async () => {
    const { db, whereFn } = mockUpdateDb([
      {
        id: "bed-1",
        iq_tenant_id: "tenant-1",
        ward_id: "ward-1",
        bed_code: "B1",
        bed_status: "occupied",
        current_patient_id: "patient-1",
        current_episode_id: "ep-1",
        reserved_for_episode_id: null,
      },
    ]);
    const repo = new DrizzleBedRepo(db);
    const result = await repo.occupyForEpisode("tenant-1", "bed-1", "ep-1", "patient-1");
    expect(result?.bed_status).toBe("occupied");
    expect(whereFn).toHaveBeenCalledWith(occupyBedWhere("tenant-1", "bed-1", "ep-1"));
  });

  it("releaseReservation uses reserved + episode WHERE clause", async () => {
    const { db, whereFn } = mockUpdateDb([]);
    const repo = new DrizzleBedRepo(db);
    await repo.releaseReservation("tenant-1", "bed-1", "ep-1");
    expect(whereFn).toHaveBeenCalledWith(releaseBedReservationWhere("tenant-1", "bed-1", "ep-1"));
  });
});

describe("InMemoryBedRepo occupy rejection", () => {
  it("returns null when bed is reserved for a different episode", async () => {
    const repo = new InMemoryBedRepo();
    await repo.reserveForEpisode("tenant-1", "bed-1", "ep-a");
    const result = await repo.occupyForEpisode("tenant-1", "bed-1", "ep-b", "patient-b");
    expect(result).toBeNull();
  });
});
