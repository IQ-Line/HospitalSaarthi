import { describe, expect, it, vi } from "vitest";
import type { DispenseRecordRepo, QueueProjectionRepo, UserLookupPort } from "../ports.js";
import { mockQueueProjectionRow } from "../test-fixtures/queue-projection.js";
import {
  applyOpdQueueProjectionUpsert,
  removeOpdQueueProjection,
} from "./upsert-opd-queue-projection.js";

const TENANT = "00000000-0000-0000-0000-000000000001";
const VISIT = "00000000-0000-0000-0000-0000000000aa";

function deps(projection: QueueProjectionRepo) {
  const dispenseRecordRepo: DispenseRecordRepo = {
    findByVisit: vi.fn(async () => undefined),
    listByVisitIds: vi.fn(),
    findLinesByRecordId: vi.fn(),
    upsertForVisit: vi.fn(),
  };
  return {
    queueProjectionRepo: projection,
    dispenseRecordRepo,
    userLookup: { resolveDoctorNames: vi.fn(async () => new Map()) } satisfies UserLookupPort,
  };
}

function projectionRepo(overrides: Partial<QueueProjectionRepo> = {}): QueueProjectionRepo {
  return {
    listForQueue: vi.fn(),
    upsert: vi.fn(),
    updateDispenseStatus: vi.fn(),
    deleteByVisitId: vi.fn(),
    deleteByEncounterId: vi.fn(),
    findByEncounterId: vi.fn(),
    findByVisitId: vi.fn(),
    ...overrides,
  };
}

describe("applyOpdQueueProjectionUpsert", () => {
  it("upserts eligible completed final prescriptions", async () => {
    const upsert = vi.fn(async () =>
      mockQueueProjectionRow({
        encounter_id: VISIT,
        iq_tenant_id: TENANT,
        patient_name: "Alice",
      }),
    );
    const deleteByVisitId = vi.fn();
    const projection = projectionRepo({ upsert, deleteByVisitId });

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

    expect(row?.encounter_id).toBe(VISIT);
    expect(upsert).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        source_kind: "opd",
        source_ref_id: "rx-1",
        encounter_id: VISIT,
      }),
    );
    expect(deleteByVisitId).not.toHaveBeenCalled();
  });

  it("removes ineligible rows", async () => {
    const deleteByVisitId = vi.fn();
    const projection = projectionRepo({ deleteByVisitId });

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
      { queueProjectionRepo: { deleteByVisitId } as unknown as QueueProjectionRepo },
      TENANT,
      VISIT,
    );
    expect(deleteByVisitId).toHaveBeenCalledWith(TENANT, VISIT);
  });
});
