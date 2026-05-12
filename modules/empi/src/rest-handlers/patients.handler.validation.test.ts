/// <reference path="../fastify.d.ts" />
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventBus } from "@hims/ts-sdk-events";
import type { Patient } from "../domain/patient.types.js";
import type {
  AddressRepo,
  IdentifierRepo,
  PatientRepo,
  SequenceRepo,
  SourceRecordRepo,
} from "../ports.js";
import { registerPatientsHandler } from "./patients.handler.js";

const TENANT = "a0000000-0000-4000-8000-000000000001";
const PATIENT_ID = "b0000000-0000-4000-8000-000000000002";

function samplePatient(): Patient {
  return {
    id: PATIENT_ID,
    iq_tenant_id: TENANT,
    uhid: "25010112345000001",
    abha_number: null,
    salutation: null,
    first_name: "Test",
    middle_name: null,
    last_name: null,
    full_name: "Test",
    father_name: null,
    mother_name: null,
    date_of_birth: null,
    year_of_birth: null,
    age_years: null,
    age_months: null,
    age_days: null,
    gender: "male",
    phone_number: "9999999999",
    alternate_phone: null,
    blood_group: null,
    occupation: null,
    nationality: "Indian",
    education: null,
    emergency_contact_name: null,
    emergency_contact_relationship: null,
    emergency_contact_phone: null,
    status: "active",
    merged_into_id: null,
    registered_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: null,
    updated_by: null,
  };
}

function mockDeps(): {
  patientRepo: PatientRepo;
  addressRepo: AddressRepo;
  identifierRepo: IdentifierRepo;
  sequenceRepo: SequenceRepo;
  sourceRecordRepo: SourceRecordRepo;
  eventBus: EventBus;
  getTenantNumericCode: (tenantId: string) => Promise<string>;
} {
  const patient = samplePatient();
  return {
    patientRepo: {
      findAll: vi.fn().mockResolvedValue({ data: [patient], total: 1 }),
      findById: vi.fn().mockResolvedValue(patient),
      findByUhid: vi.fn().mockResolvedValue(undefined),
      findByPhone: vi.fn().mockResolvedValue([patient]),
      findDedupCandidates: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async (data) => ({
        ...patient,
        ...data,
        id: PATIENT_ID,
      })),
      update: vi.fn().mockResolvedValue(patient),
      updateStatus: vi.fn().mockResolvedValue(patient),
    },
    addressRepo: {
      findByPatient: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({} as never),
      update: vi.fn().mockResolvedValue(undefined),
    },
    identifierRepo: {
      findByPatient: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({} as never),
      deactivate: vi.fn().mockResolvedValue(undefined),
    },
    sequenceRepo: {
      nextValue: vi.fn().mockResolvedValue(1),
    },
    sourceRecordRepo: {
      findByPatient: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "sr-1" }),
    } as unknown as SourceRecordRepo,
    eventBus: {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue({ unsubscribe: vi.fn() }),
    } as unknown as EventBus,
    getTenantNumericCode: vi.fn().mockResolvedValue("12345"),
  };
}

async function buildTestApp(
  deps: ReturnType<typeof mockDeps> = mockDeps(),
): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({
    logger: false,
    ajv: {
      customOptions: {
        removeAdditional: false as const,
        coerceTypes: true,
        useDefaults: true,
      },
    },
  });
  app.addHook("preHandler", async (request) => {
    request.tenantId = TENANT;
  });
  registerPatientsHandler(app, deps);
  await app.ready();
  return app;
}

describe("patients.handler HTTP validation (Fastify JSON schema)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /patients rejects empty body (required fields)", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/patients",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("POST /patients rejects invalid gender enum", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/patients",
      payload: {
        first_name: "A",
        gender: "invalid",
        phone_number: "1",
        source_system: "opd_registration",
      },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("POST /patients rejects valid demographics without source_system", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/patients",
      payload: {
        first_name: "Ada",
        gender: "female",
        phone_number: "9800000000",
      },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("PATCH /patients/:id rejects demographic change without source_system", async () => {
    const deps = mockDeps();
    const app = await buildTestApp(deps);
    const res = await app.inject({
      method: "PATCH",
      url: `/patients/${PATIENT_ID}`,
      payload: { first_name: "Renamed" },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: string };
    expect(body.error).toBe("source_system_required");
    expect(deps.sourceRecordRepo.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("PATCH /patients/:id accepts demographic change with source_system", async () => {
    const deps = mockDeps();
    const app = await buildTestApp(deps);
    const res = await app.inject({
      method: "PATCH",
      url: `/patients/${PATIENT_ID}`,
      payload: { first_name: "Renamed", source_system: "abdm_kyc" },
    });
    expect(res.statusCode).toBe(200);
    expect(deps.sourceRecordRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ source_system: "abdm_kyc" }),
    );
    await app.close();
  });

  it("PATCH /patients/:id accepts updated_by only without source_system", async () => {
    const deps = mockDeps();
    const app = await buildTestApp(deps);
    const res = await app.inject({
      method: "PATCH",
      url: `/patients/${PATIENT_ID}`,
      payload: {
        updated_by: "c0000000-0000-4000-8000-000000000003",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(deps.sourceRecordRepo.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("POST /patients accepts minimal valid body and reaches use-case", async () => {
    const deps = mockDeps();
    const app = await buildTestApp(deps);
    const res = await app.inject({
      method: "POST",
      url: "/patients",
      payload: {
        first_name: "Ada",
        gender: "female",
        phone_number: "9800000000",
        source_system: "opd_registration",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(deps.patientRepo.create).toHaveBeenCalled();
    expect(deps.eventBus.publish).toHaveBeenCalled();
    await app.close();
  });

  it("PATCH /patients/:id rejects unknown properties (e.g. uhid)", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/patients/${PATIENT_ID}`,
      payload: { uhid: "tamper", first_name: "X" },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("GET /patients rejects invalid page query", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/patients?page=0",
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("GET /patients/:id rejects malformed UUID param", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/patients/not-a-uuid",
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("PATCH /patients/:id/status rejects missing status", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/patients/${PATIENT_ID}/status`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("POST /patients/:id/identifiers rejects missing required fields", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: `/patients/${PATIENT_ID}/identifiers`,
      payload: { identifier_type: "legacy_mrn" },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
