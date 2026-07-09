import { describe, expect, it, vi } from "vitest";
import type { EventBus } from "@hims/ts-sdk-events";
import { createVisit } from "../../../src/use-cases/create-visit.js";
import { RegistrationValidationError } from "../../../src/lib/follow-up.js";
import type {
  ConfiguratorHttpPort,
  OpdHttpPort,
  RegistrationLogger,
  VisitRepo,
} from "../../../src/ports.js";
import type { CreateVisitInput, VisitRecord } from "../../../src/domain/visit.types.js";

const TENANT = "t1";
const PATIENT = "p1";
const DEPT = "d1";

function makeRecord(over: Partial<VisitRecord> = {}): VisitRecord {
  return {
    id: "v1",
    visit_id: "OP-1",
    iq_tenant_id: TENANT,
    patient_id: PATIENT,
    visit_type: null,
    consultation_type: "new",
    is_free_follow_up: false,
    free_follow_up_visit_count: 0,
    free_follow_up_valid_till: null,
    free_follow_up_details: null,
    parent_visit_id: null,
    status: "pending",
    facility_id: null,
    department_id: DEPT,
    doctor_id: "doc1",
    appointment_id: null,
    idempotency_key: "idem-1",
    created_by: null,
    updated_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

const daysAgo = (n: number): Date => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const eventBus: EventBus = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  publish: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockResolvedValue({ unsubscribe: vi.fn() }),
};

function makeVisitRepo(opts: {
  lastVisit?: VisitRecord;
  usedCount?: number;
  created?: boolean;
}): { repo: VisitRepo; insert: ReturnType<typeof vi.fn> } {
  const insert = vi.fn(async (_t: string, input: CreateVisitInput) => ({
    created: opts.created ?? true,
    // Mirror the real repo's defaulting: CreateVisitInput.consultation_type is
    // optional/nullable, but a persisted VisitRecord always has a concrete type.
    record: makeRecord({ ...input, id: "v1", consultation_type: input.consultation_type ?? "new" }),
  }));
  const repo: VisitRepo = {
    findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
    insert,
    findById: vi.fn().mockResolvedValue(undefined),
    listPage: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(false),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    findLatestByPatientId: vi.fn().mockResolvedValue(undefined),
    findLatestByPatientIds: vi.fn().mockResolvedValue(new Map()),
    findLatestByPatientAndDepartment: vi.fn().mockResolvedValue(opts.lastVisit),
    countFreeFollowUpVisits: vi.fn().mockResolvedValue(opts.usedCount ?? 0),
    getDashboardMetrics: vi.fn().mockResolvedValue({}),
  };
  return { repo, insert };
}

function configGateway(days: number, visits: number): ConfiguratorHttpPort {
  return {
    getTenantFollowUpConfig: vi
      .fn()
      .mockResolvedValue({ freeFollowUpDays: days, freeFollowUpVisits: visits }),
  };
}

const ctx = { idempotencyKey: "idem-1", actorId: "actor-1" };

describe("createVisit free-follow-up eligibility", () => {
  const freeInput: CreateVisitInput = {
    patient_id: PATIENT,
    department_id: DEPT,
    consultation_type: "free-followup",
  };

  // Non-default config (7 days, 2 visits) so each case discriminates the TENANT
  // config from the platform defaults (15 days, 1 visit): the grant uses
  // usedCount=1 (denied under default quota 1, allowed under config quota 2) and
  // the window-elapsed case uses 10 days (within default 15, outside config 7).
  it("grants free follow-up within the tenant window+quota (enriches the insert)", async () => {
    const { repo, insert } = makeVisitRepo({ lastVisit: makeRecord({ created_at: daysAgo(5) }), usedCount: 1 });
    await createVisit(
      { visitRepo: repo, allocateOpVisitId: async () => "OP-1", eventBus, configuratorGateway: configGateway(7, 2) },
      TENANT,
      freeInput,
      ctx,
    );
    const enriched = insert.mock.calls[0]?.[1] as CreateVisitInput;
    expect(enriched.is_free_follow_up).toBe(true);
    expect(enriched.free_follow_up_visit_count).toBe(2);
    expect(enriched.consultation_type).toBe("free-followup");
  });

  it("denies when the tenant follow-up window has elapsed (10d > configured 7d)", async () => {
    const { repo } = makeVisitRepo({ lastVisit: makeRecord({ created_at: daysAgo(10) }), usedCount: 0 });
    await expect(
      createVisit(
        { visitRepo: repo, allocateOpVisitId: async () => "OP-1", eventBus, configuratorGateway: configGateway(7, 2) },
        TENANT,
        freeInput,
        ctx,
      ),
    ).rejects.toBeInstanceOf(RegistrationValidationError);
  });

  it("denies when the tenant free-follow-up quota is exhausted", async () => {
    const { repo } = makeVisitRepo({ lastVisit: makeRecord({ created_at: daysAgo(5) }), usedCount: 2 });
    await expect(
      createVisit(
        { visitRepo: repo, allocateOpVisitId: async () => "OP-1", eventBus, configuratorGateway: configGateway(7, 2) },
        TENANT,
        freeInput,
        ctx,
      ),
    ).rejects.toBeInstanceOf(RegistrationValidationError);
  });

  it("denies when there is no prior visit to follow up", async () => {
    const { repo } = makeVisitRepo({ lastVisit: undefined });
    await expect(
      createVisit(
        { visitRepo: repo, allocateOpVisitId: async () => "OP-1", eventBus, configuratorGateway: configGateway(7, 2) },
        TENANT,
        freeInput,
        ctx,
      ),
    ).rejects.toBeInstanceOf(RegistrationValidationError);
  });

  it("requires a department for a free follow-up", async () => {
    const { repo } = makeVisitRepo({});
    await expect(
      createVisit(
        { visitRepo: repo, allocateOpVisitId: async () => "OP-1", eventBus, configuratorGateway: configGateway(7, 2) },
        TENANT,
        { patient_id: PATIENT, consultation_type: "free-followup" },
        ctx,
      ),
    ).rejects.toBeInstanceOf(RegistrationValidationError);
  });
});

describe("createVisit surfaces a failed OPD encounter (no silent swallow)", () => {
  const normalInput: CreateVisitInput = { patient_id: PATIENT, department_id: DEPT, consultation_type: "new" };

  it("logs a warning when ensureEncounter fails", async () => {
    const { repo } = makeVisitRepo({ created: true });
    const warn = vi.fn();
    const logger: RegistrationLogger = { warn };
    const opdGateway: OpdHttpPort = {
      ensureEncounter: vi.fn().mockResolvedValue({ ok: false, status: 502, body: "opd down" }),
    };
    await createVisit(
      { visitRepo: repo, allocateOpVisitId: async () => "OP-1", eventBus, opdGateway, logger },
      TENANT,
      normalInput,
      ctx,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatchObject({ status: 502, visitId: "v1" });
  });

  it("does NOT warn when ensureEncounter succeeds", async () => {
    const { repo } = makeVisitRepo({ created: true });
    const warn = vi.fn();
    const opdGateway: OpdHttpPort = {
      ensureEncounter: vi.fn().mockResolvedValue({ ok: true }),
    };
    await createVisit(
      { visitRepo: repo, allocateOpVisitId: async () => "OP-1", eventBus, opdGateway, logger: { warn } },
      TENANT,
      normalInput,
      ctx,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
