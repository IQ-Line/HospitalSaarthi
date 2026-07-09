import { describe, expect, it, vi } from "vitest";
import type { EventBus } from "@hims/ts-sdk-events";
import {
  createIntakeForNewPatient,
  createVisitForExistingPatient,
} from "../../../src/use-cases/create-intake-for-new-patient.js";
import type {
  EmpiHttpPort,
  RegistrationLogger,
  RegistrationRepo,
  VisitRepo,
} from "../../../src/ports.js";
import type {
  PatientDemographicsSnapshot,
  RegistrationRecord,
} from "../../../src/domain/registration.types.js";
import type { VisitRecord } from "../../../src/domain/visit.types.js";

// ---------------------------------------------------------------------------
// EMPI-saga use-case coverage (registration vet 2026-06-22, P1). These two
// functions are the primary intake flow and had ZERO direct tests. Free-follow-up
// boundaries and the ensureEncounter-failure log live in create-visit.test.ts;
// this file owns the saga orchestration: idempotent replay (no EMPI re-hit),
// the EMPI duplicate / unavailable / error branches, the abha_address strip
// (EMPI rejects it) + snapshot merge, and the ABHA-link / not-found failure
// handling. All against fake repos+gateways with real branch assertions.
// ---------------------------------------------------------------------------

const TENANT = "11111111-1111-4111-8111-111111111111";
const PATIENT = "22222222-2222-4222-8222-222222222222";
const KEY = "idem-key-1";
const ACTOR = "actor-1";
const ctx = { idempotencyKey: KEY, actorId: ACTOR, bearerToken: "bearer-xyz" };

function snapshot(over: Partial<PatientDemographicsSnapshot> = {}): PatientDemographicsSnapshot {
  return {
    uhid: "UHID-1",
    abha_number: null,
    abha_address: null,
    full_name: "Asha Rao",
    phone_number: "+919876500000",
    gender: "female",
    date_of_birth: null,
    year_of_birth: null,
    ...over,
  };
}

function regRecord(over: Partial<RegistrationRecord> = {}): RegistrationRecord {
  return {
    registration_id: "reg-1",
    iq_tenant_id: TENANT,
    patient_id: PATIENT,
    patient_uhid: "UHID-1",
    patient_abha_number: null,
    patient_abha_address: null,
    patient_full_name: "Asha Rao",
    patient_phone_number: "+919876500000",
    patient_gender: "female",
    patient_date_of_birth: null,
    patient_year_of_birth: null,
    patient_source_record_id: "src-1",
    idempotency_key: KEY,
    created_by: ACTOR,
    updated_by: ACTOR,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

function visitRecord(over: Partial<VisitRecord> = {}): VisitRecord {
  return {
    id: "visit-1",
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
    status: "in_progress",
    facility_id: null,
    department_id: null,
    doctor_id: null,
    appointment_id: null,
    idempotency_key: KEY,
    created_by: ACTOR,
    updated_by: ACTOR,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  };
}

function makeEventBus(): EventBus {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue({ unsubscribe: vi.fn() }),
  };
}

function makeVisitRepo(over: Partial<Record<keyof VisitRepo, unknown>> = {}): VisitRepo {
  return {
    findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn(async (_t, input) => ({
      created: true as const,
      record: visitRecord({ patient_id: input.patient_id }),
    })),
    findById: vi.fn().mockResolvedValue(undefined),
    listPage: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(false),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    findLatestByPatientId: vi.fn().mockResolvedValue(undefined),
    findLatestByPatientIds: vi.fn().mockResolvedValue(new Map()),
    findLatestByPatientAndDepartment: vi.fn().mockResolvedValue(undefined),
    countFreeFollowUpVisits: vi.fn().mockResolvedValue(0),
    getDashboardMetrics: vi.fn().mockResolvedValue({}),
    ...over,
  } as VisitRepo;
}

function makeRegistrationRepo(
  over: Partial<Record<keyof RegistrationRepo, unknown>> = {},
): RegistrationRepo {
  return {
    findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
    findByPatientId: vi.fn().mockResolvedValue(undefined),
    findPatientIdByAbhaAddress: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn(async (_t, input) => ({
      created: true as const,
      record: regRecord({
        patient_id: input.patient_id,
        patient_source_record_id: input.patient_source_record_id,
        patient_abha_address: input.patient_snapshot.abha_address ?? null,
        patient_abha_number: input.patient_snapshot.abha_number ?? null,
      }),
    })),
    findById: vi.fn().mockResolvedValue(undefined),
    listPage: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    ...over,
  } as RegistrationRepo;
}

function makeEmpiGateway(over: Partial<Record<keyof EmpiHttpPort, unknown>> = {}): EmpiHttpPort {
  return {
    registerPatient: vi.fn().mockResolvedValue({
      ok: true,
      patientId: PATIENT,
      sourceRecordId: "src-1",
      snapshot: snapshot(),
    }),
    linkAbhaAddress: vi.fn().mockResolvedValue({ ok: true }),
    resolvePatientId: vi.fn().mockResolvedValue(null),
    fetchPatientDetail: vi.fn().mockResolvedValue(null),
    upsertPermanentAddress: vi.fn().mockResolvedValue(undefined),
    ...over,
  } as EmpiHttpPort;
}

const allocateOpVisitId = async (): Promise<string> => "OP-1";

describe("createIntakeForNewPatient", () => {
  it("replays idempotently without re-hitting EMPI (created:false)", async () => {
    const existingVisit = visitRecord({ id: "existing-visit" });
    const existingReg = regRecord({ registration_id: "existing-reg" });
    const empiGateway = makeEmpiGateway();
    const registrationRepo = makeRegistrationRepo({
      findByIdempotencyKey: vi.fn().mockResolvedValue(existingReg),
    });
    const visitRepo = makeVisitRepo({
      findByIdempotencyKey: vi.fn().mockResolvedValue(existingVisit),
    });

    const res = await createIntakeForNewPatient(
      { registrationRepo, visitRepo, empiGateway, eventBus: makeEventBus(), allocateOpVisitId },
      TENANT,
      { patient: { full_name: "Asha Rao" } },
      ctx,
    );

    expect(res).toEqual({
      ok: true,
      created: false,
      result: { registration: existingReg, visit: existingVisit },
    });
    // A replay must NOT create a new EMPI patient or a new visit row.
    expect(empiGateway.registerPatient).not.toHaveBeenCalled();
    expect(visitRepo.insert).not.toHaveBeenCalled();
    expect(registrationRepo.insert).not.toHaveBeenCalled();
  });

  it("on replay, falls back to findByPatientId when no registration matches the key", async () => {
    const existingVisit = visitRecord({ id: "existing-visit", patient_id: PATIENT });
    const byPatient = regRecord({ registration_id: "reg-by-patient" });
    const registrationRepo = makeRegistrationRepo({
      findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
      findByPatientId: vi.fn().mockResolvedValue(byPatient),
    });
    const visitRepo = makeVisitRepo({
      findByIdempotencyKey: vi.fn().mockResolvedValue(existingVisit),
    });

    const res = await createIntakeForNewPatient(
      { registrationRepo, visitRepo, empiGateway: makeEmpiGateway(), eventBus: makeEventBus(), allocateOpVisitId },
      TENANT,
      { patient: { full_name: "Asha Rao" } },
      ctx,
    );

    expect(res).toMatchObject({ ok: true, created: false, result: { registration: byPatient } });
    expect(registrationRepo.findByPatientId).toHaveBeenCalledWith(TENANT, PATIENT);
  });

  it("returns a structured duplicate body when EMPI reports an existing patient id", async () => {
    const dupSnapshot = snapshot({ uhid: "UHID-EXIST" });
    const registrationRepo = makeRegistrationRepo();
    const empiGateway = makeEmpiGateway({
      registerPatient: vi.fn().mockResolvedValue({
        ok: false,
        kind: "duplicate",
        existingPatientId: "patient-existing",
        sourceRecordId: "src-x",
        snapshot: dupSnapshot,
        body: { detail: "dup" },
      }),
    });

    const res = await createIntakeForNewPatient(
      { registrationRepo, visitRepo: makeVisitRepo(), empiGateway, eventBus: makeEventBus(), allocateOpVisitId },
      TENANT,
      { patient: { full_name: "Asha Rao" } },
      ctx,
    );

    expect(res).toEqual({
      ok: false,
      kind: "duplicate",
      body: {
        code: "patient_already_exists",
        message: "Patient already exists.",
        patient_id: "patient-existing",
        patient_snapshot: dupSnapshot,
      },
    });
    // A duplicate must NOT create a registration.
    expect(registrationRepo.insert).not.toHaveBeenCalled();
  });

  it("maps a duplicate WITHOUT an existing id to a 409 empi_error (stringified body)", async () => {
    const empiGateway = makeEmpiGateway({
      registerPatient: vi.fn().mockResolvedValue({
        ok: false,
        kind: "duplicate",
        existingPatientId: "",
        sourceRecordId: "src-x",
        snapshot: snapshot(),
        body: { raw: "weird" },
      }),
    });

    const res = await createIntakeForNewPatient(
      { registrationRepo: makeRegistrationRepo(), visitRepo: makeVisitRepo(), empiGateway, eventBus: makeEventBus(), allocateOpVisitId },
      TENANT,
      { patient: { full_name: "Asha Rao" } },
      ctx,
    );

    expect(res).toEqual({
      ok: false,
      kind: "empi_error",
      status: 409,
      body: JSON.stringify({ raw: "weird" }),
    });
  });

  it("passes through an empi_unavailable as a 503-bearing result", async () => {
    const empiGateway = makeEmpiGateway({
      registerPatient: vi.fn().mockResolvedValue({
        ok: false,
        kind: "empi_unavailable",
        status: 503,
        body: "empi down",
      }),
    });

    const res = await createIntakeForNewPatient(
      { registrationRepo: makeRegistrationRepo(), visitRepo: makeVisitRepo(), empiGateway, eventBus: makeEventBus(), allocateOpVisitId },
      TENANT,
      { patient: { full_name: "Asha Rao" } },
      ctx,
    );

    expect(res).toEqual({ ok: false, kind: "empi_unavailable", status: 503, body: "empi down" });
  });

  it("passes through a generic EMPI error with its status and body", async () => {
    const empiGateway = makeEmpiGateway({
      registerPatient: vi.fn().mockResolvedValue({
        ok: false,
        kind: "error",
        status: 500,
        body: "boom",
      }),
    });

    const res = await createIntakeForNewPatient(
      { registrationRepo: makeRegistrationRepo(), visitRepo: makeVisitRepo(), empiGateway, eventBus: makeEventBus(), allocateOpVisitId },
      TENANT,
      { patient: { full_name: "Asha Rao" } },
      ctx,
    );

    expect(res).toEqual({ ok: false, kind: "empi_error", status: 500, body: "boom" });
  });

  it("creates registration+visit, strips abha_address from the EMPI body, and merges it into the snapshot", async () => {
    const registrationRepo = makeRegistrationRepo();
    const visitRepo = makeVisitRepo();
    const empiGateway = makeEmpiGateway({
      registerPatient: vi.fn().mockResolvedValue({
        ok: true,
        patientId: "patient-new",
        sourceRecordId: "src-new",
        snapshot: snapshot({ uhid: "UHID-NEW" }),
      }),
    });

    const res = await createIntakeForNewPatient(
      { registrationRepo, visitRepo, empiGateway, eventBus: makeEventBus(), allocateOpVisitId },
      TENANT,
      {
        patient: {
          full_name: "Asha Rao",
          phone_number: "+919876500000",
          abha_number: "12-3456-7890-1234",
          abha_address: "asha@abdm",
        },
        intake_completion: "partial",
      },
      ctx,
    );

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.created).toBe(true);
    expect(res.result.registration?.patient_id).toBe("patient-new");
    expect(res.result.visit?.patient_id).toBe("patient-new");

    // EMPI register body must NOT carry abha_address (EMPI create rejects it)...
    const empiBody = (empiGateway.registerPatient as ReturnType<typeof vi.fn>).mock.calls[0]?.[2];
    expect(empiBody).toMatchObject({ full_name: "Asha Rao", abha_number: "12-3456-7890-1234" });
    expect(empiBody).not.toHaveProperty("abha_address");

    // ...but the registration snapshot must KEEP it (merged back in).
    const regInput = (registrationRepo.insert as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(regInput?.patient_snapshot.abha_address).toBe("asha@abdm");
    expect(regInput?.patient_source_record_id).toBe("src-new");

    // ABHA address is linked in EMPI after the patient exists.
    expect(empiGateway.linkAbhaAddress).toHaveBeenCalledWith(
      TENANT,
      "patient-new",
      "asha@abdm",
      ACTOR,
      "bearer-xyz",
    );
  });

  it("still succeeds (and logs) when the ABHA-address link fails", async () => {
    const warn = vi.fn();
    const logger: RegistrationLogger = { warn };
    const empiGateway = makeEmpiGateway({
      registerPatient: vi.fn().mockResolvedValue({
        ok: true,
        patientId: "patient-new",
        sourceRecordId: "src-new",
        snapshot: snapshot(),
      }),
      linkAbhaAddress: vi.fn().mockResolvedValue({ ok: false, reason: "conflict", status: 409 }),
    });

    const res = await createIntakeForNewPatient(
      { registrationRepo: makeRegistrationRepo(), visitRepo: makeVisitRepo(), empiGateway, eventBus: makeEventBus(), allocateOpVisitId, logger },
      TENANT,
      { patient: { full_name: "Asha Rao", abha_address: "asha@abdm" } },
      ctx,
    );

    expect(res.ok).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatchObject({ patientId: "patient-new", reason: "conflict", status: 409 });
  });
});

describe("createVisitForExistingPatient", () => {
  it("replays idempotently without re-hitting EMPI (created:false)", async () => {
    const existingVisit = visitRecord({ id: "existing-visit" });
    const existingReg = regRecord({ registration_id: "existing-reg" });
    const empiGateway = makeEmpiGateway();
    const registrationRepo = makeRegistrationRepo({
      findByIdempotencyKey: vi.fn().mockResolvedValue(existingReg),
    });
    const visitRepo = makeVisitRepo({
      findByIdempotencyKey: vi.fn().mockResolvedValue(existingVisit),
    });

    const res = await createVisitForExistingPatient(
      { registrationRepo, visitRepo, empiGateway, eventBus: makeEventBus(), allocateOpVisitId },
      TENANT,
      { patient_id: PATIENT },
      ctx,
    );

    expect(res).toEqual({ visit: existingVisit, registration: existingReg, created: false });
    expect(empiGateway.fetchPatientDetail).not.toHaveBeenCalled();
  });

  it("throws when an idempotent replay finds a visit but no registration", async () => {
    const existingVisit = visitRecord({ id: "existing-visit" });
    const registrationRepo = makeRegistrationRepo({
      findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
      findByPatientId: vi.fn().mockResolvedValue(undefined),
    });
    const visitRepo = makeVisitRepo({
      findByIdempotencyKey: vi.fn().mockResolvedValue(existingVisit),
    });

    await expect(
      createVisitForExistingPatient(
        { registrationRepo, visitRepo, empiGateway: makeEmpiGateway(), eventBus: makeEventBus(), allocateOpVisitId },
        TENANT,
        { patient_id: PATIENT },
        ctx,
      ),
    ).rejects.toThrow("registration_missing_for_existing_patient_visit");
  });

  it("throws empi_patient_not_found when EMPI has no such patient", async () => {
    const empiGateway = makeEmpiGateway({
      fetchPatientDetail: vi.fn().mockResolvedValue(null),
    });

    await expect(
      createVisitForExistingPatient(
        { registrationRepo: makeRegistrationRepo(), visitRepo: makeVisitRepo(), empiGateway, eventBus: makeEventBus(), allocateOpVisitId },
        TENANT,
        { patient_id: PATIENT },
        ctx,
      ),
    ).rejects.toThrow("empi_patient_not_found");
  });

  it("creates the visit+registration, links ABHA overlay, and upserts the permanent address", async () => {
    const registrationRepo = makeRegistrationRepo();
    const visitRepo = makeVisitRepo();
    const empiGateway = makeEmpiGateway({
      fetchPatientDetail: vi.fn().mockResolvedValue({
        patient: {
          id: PATIENT,
          uhid: "UHID-EXIST",
          full_name: "Asha Rao",
          phone_number: "+919876500000",
        },
        abha_number: null,
        abha_address: null,
      }),
    });

    const res = await createVisitForExistingPatient(
      { registrationRepo, visitRepo, empiGateway, eventBus: makeEventBus(), allocateOpVisitId },
      TENANT,
      {
        patient_id: PATIENT,
        abha_address: "asha@abdm",
        permanent_address: { line1: "1 MG Road", city: "Pune", state: "MH", pincode: "411001" },
      },
      ctx,
    );

    expect(res.created).toBe(true);
    expect(res.visit.patient_id).toBe(PATIENT);
    expect(res.registration.patient_id).toBe(PATIENT);

    // Desk-captured ABHA overlay is linked in EMPI.
    expect(empiGateway.linkAbhaAddress).toHaveBeenCalledWith(
      TENANT,
      PATIENT,
      "asha@abdm",
      ACTOR,
      "bearer-xyz",
    );
    // Permanent address is pushed to EMPI as the canonical store.
    expect(empiGateway.upsertPermanentAddress).toHaveBeenCalledTimes(1);
    const addrArg = (empiGateway.upsertPermanentAddress as ReturnType<typeof vi.fn>).mock.calls[0]?.[2];
    expect(addrArg).toMatchObject({ address_type: "permanent", city: "Pune", pincode: "411001" });
  });

  it("still succeeds (and logs) when the ABHA-address link fails", async () => {
    const warn = vi.fn();
    const logger: RegistrationLogger = { warn };
    const empiGateway = makeEmpiGateway({
      fetchPatientDetail: vi.fn().mockResolvedValue({
        patient: { id: PATIENT, uhid: "UHID-EXIST", full_name: "Asha Rao", phone_number: "+919876500000" },
        abha_number: null,
        abha_address: null,
      }),
      linkAbhaAddress: vi.fn().mockResolvedValue({ ok: false, reason: "error", status: 502 }),
    });

    const res = await createVisitForExistingPatient(
      { registrationRepo: makeRegistrationRepo(), visitRepo: makeVisitRepo(), empiGateway, eventBus: makeEventBus(), allocateOpVisitId, logger },
      TENANT,
      { patient_id: PATIENT, abha_address: "asha@abdm" },
      ctx,
    );

    // The intake still completes; the failed ABHA link is surfaced as a warning.
    expect(res.created).toBe(true);
    expect(res.visit.patient_id).toBe(PATIENT);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatchObject({ patientId: PATIENT, reason: "error", status: 502 });
  });
});
