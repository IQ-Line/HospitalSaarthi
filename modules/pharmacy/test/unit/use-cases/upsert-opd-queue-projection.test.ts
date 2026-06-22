import { describe, expect, it, vi } from "vitest";
import type { OpdQueueProjectionRow } from "../../../src/domain/pharmacy.types.js";
import type { DispenseRecordRepo, OpdQueueProjectionRepo, UserLookupPort } from "../../../src/ports.js";
import {
  applyOpdQueueProjectionUpsert,
  removeOpdQueueProjection,
} from "../../../src/use-cases/upsert-opd-queue-projection.js";

const TENANT = "00000000-0000-0000-0000-000000000001";
const VISIT = "00000000-0000-0000-0000-0000000000aa";

function deps(projection: OpdQueueProjectionRepo) {
  const dispenseRecordRepo: DispenseRecordRepo = {
    findByVisit: vi.fn(async () => undefined),
    listByVisitIds: vi.fn(),
    findLinesByRecordId: vi.fn(),
    upsertForVisit: vi.fn(),
  };
  return {
    opdQueueProjectionRepo: projection,
    dispenseRecordRepo,
    userLookup: { resolveDoctorNames: vi.fn(async () => new Map()) } satisfies UserLookupPort,
  };
}

describe("applyOpdQueueProjectionUpsert", () => {
  it("upserts eligible completed final prescriptions", async () => {
    const upsert = vi.fn(async (): Promise<OpdQueueProjectionRow> => ({
      visit_id: VISIT,
      iq_tenant_id: TENANT,
      patient_id: "patient-1",
      prescription_id: "rx-1",
      doctor_id: "doctor-1",
      visit_status: "completed",
      prescription_status: "final",
      medicine_count: 2,
      queued_at: new Date("2026-06-01T12:00:00.000Z"),
      patient_name: "Alice",
      uhid: null,
      phone: null,
      age_years: null,
      gender: null,
      doctor_name: null,
      formatted_visit_id: null,
      dispense_status: "pending",
      last_synced_at: new Date("2026-06-01T12:00:00.000Z"),
    }));
    const deleteByVisitId = vi.fn();
    const projection: OpdQueueProjectionRepo = {
      listForQueue: vi.fn(),
      upsert,
      updateDispenseStatus: vi.fn(),
      deleteByVisitId,
      findByVisitId: vi.fn(),
    };

    const row = await applyOpdQueueProjectionUpsert(deps(projection), TENANT, VISIT, {
      patient_id: "patient-1",
      prescription_id: "rx-1",
      doctor_id: "doctor-1",
      visit_status: "completed",
      prescription_status: "final",
      medicine_count: 2,
      updated_at: "2026-06-01T12:00:00.000Z",
      finalized_at: "2026-06-01T12:00:00.000Z",
      patient_name: "Alice",
    });

    expect(row?.visit_id).toBe(VISIT);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(deleteByVisitId).not.toHaveBeenCalled();
  });

  it("removes ineligible rows", async () => {
    const deleteByVisitId = vi.fn();
    const projection: OpdQueueProjectionRepo = {
      listForQueue: vi.fn(),
      upsert: vi.fn(),
      updateDispenseStatus: vi.fn(),
      deleteByVisitId,
      findByVisitId: vi.fn(),
    };

    const row = await applyOpdQueueProjectionUpsert(deps(projection), TENANT, VISIT, {
      patient_id: "patient-1",
      prescription_id: "rx-1",
      visit_status: "in_progress",
      prescription_status: "draft",
      medicine_count: 1,
      updated_at: "2026-06-01T12:00:00.000Z",
    });

    expect(row).toBeNull();
    expect(deleteByVisitId).toHaveBeenCalledWith(TENANT, VISIT);
  });
});

describe("removeOpdQueueProjection", () => {
  it("deletes by visit id", async () => {
    const deleteByVisitId = vi.fn();
    await removeOpdQueueProjection(
      { opdQueueProjectionRepo: { deleteByVisitId } as unknown as OpdQueueProjectionRepo },
      TENANT,
      VISIT,
    );
    expect(deleteByVisitId).toHaveBeenCalledWith(TENANT, VISIT);
  });
});
