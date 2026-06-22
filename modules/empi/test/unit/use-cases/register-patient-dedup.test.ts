import { describe, expect, it, vi } from "vitest";
import type { EventBus } from "@hims/ts-sdk-events";
import type { PatientRepo } from "../../../src/ports.js";
import type { Patient } from "../../../src/domain/patient.types.js";
import { findPatientByDedupDemographics, registerPatient } from "../../../src/use-cases/register-patient.js";
import { isDuplicateRegistrationResult } from "../../../src/use-cases/register-patient.types.js";

const TENANT = "11111111-2222-4333-8444-555555555555";

function basePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    iq_tenant_id: TENANT,
    uhid: "25010100001000001",
    abha_number: null,
    salutation: null,
    first_name: "Jon",
    middle_name: null,
    last_name: "Smyth",
    full_name: "Jon Smyth",
    father_name: null,
    mother_name: null,
    date_of_birth: "1991-06-01",
    year_of_birth: null,
    age_years: null,
    age_months: null,
    age_days: null,
    gender: "male",
    phone_number: "+919999999999",
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
    ...overrides,
  };
}

describe("registerPatient deduplication (Phase 2)", () => {
  it("returns 409-shaped duplicate when blocking keys all match", async () => {
    const existing = basePatient();
    const publish = vi.fn().mockResolvedValue(undefined);
    const eventBus = { publish } as unknown as EventBus;
    const allocatePatientUhid = vi.fn().mockResolvedValue("25010100001000001");

    const patientRepo = {
      findDedupCandidates: vi.fn().mockResolvedValue([existing]),
      create: vi.fn(),
    } as unknown as PatientRepo;

    const result = await registerPatient(
      {
        patientRepo,
        allocatePatientUhid,
        eventBus,
      },
      {
        iq_tenant_id: TENANT,
        first_name: "John",
        last_name: "Smith",
        gender: "male",
        phone_number: "+919999999999",
        nationality: "Indian",
        date_of_birth: "1990-06-01",
      },
    );

    expect(isDuplicateRegistrationResult(result)).toBe(true);
    if (isDuplicateRegistrationResult(result)) {
      expect(result.potential_duplicate).toBe(true);
      expect(result.existing_patient.id).toBe(existing.id);
      expect(result.match_details.matched_fields.sort()).toEqual(
        ["age", "full_name", "gender", "phone_number"].sort(),
      );
    }
    expect(patientRepo.create).not.toHaveBeenCalled();
    expect(allocatePatientUhid).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not flag when name is not phonetically similar (same phone/gender)", async () => {
    const existing = basePatient({
      full_name: "Jane Doe",
      first_name: "Jane",
      last_name: "Doe",
    });
    const publish = vi.fn().mockResolvedValue(undefined);
    const eventBus = { publish } as unknown as EventBus;
    const allocatePatientUhid = vi.fn().mockResolvedValue("25010100001000001");

    const patientRepo = {
      findDedupCandidates: vi.fn().mockResolvedValue([existing]),
      create: vi.fn().mockImplementation(async (data: { uhid: string }) => ({
        ...existing,
        id: "new-id-new-id-new-id-new-id-newid00",
        uhid: data.uhid,
        full_name: "John Smith",
        first_name: "John",
        last_name: "Smith",
      })),
    } as unknown as PatientRepo;

    const result = await registerPatient(
      {
        patientRepo,
        allocatePatientUhid,
        eventBus,
      },
      {
        iq_tenant_id: TENANT,
        first_name: "John",
        last_name: "Smith",
        gender: "male",
        phone_number: "+919999999999",
        nationality: "Indian",
        date_of_birth: "1990-06-01",
      },
    );

    expect(isDuplicateRegistrationResult(result)).toBe(false);
    expect(patientRepo.create).toHaveBeenCalled();
  });

  it("force_create bypasses dedup even when candidate would match", async () => {
    const existing = basePatient();
    const publish = vi.fn().mockResolvedValue(undefined);
    const eventBus = { publish } as unknown as EventBus;
    const allocatePatientUhid = vi.fn().mockResolvedValue("25010100001000001");

    const patientRepo = {
      findDedupCandidates: vi.fn(),
      create: vi.fn().mockImplementation(async (data: { uhid: string }) => ({
        ...existing,
        id: "new-id-new-id-new-id-new-id-newid01",
        uhid: data.uhid,
      })),
    } as unknown as PatientRepo;

    const result = await registerPatient(
      {
        patientRepo,
        allocatePatientUhid,
        eventBus,
      },
      {
        iq_tenant_id: TENANT,
        first_name: "John",
        last_name: "Smith",
        gender: "male",
        phone_number: "+919999999999",
        nationality: "Indian",
        date_of_birth: "1990-06-01",
        force_create: true,
      },
    );

    expect(isDuplicateRegistrationResult(result)).toBe(false);
    expect(patientRepo.findDedupCandidates).not.toHaveBeenCalled();
    expect(patientRepo.create).toHaveBeenCalled();
  });
});

describe("findPatientByDedupDemographics", () => {
  it("returns null when name differs on same phone and gender", async () => {
    const existing = basePatient();
    const patientRepo = {
      findDedupCandidates: vi.fn().mockResolvedValue([existing]),
    } as unknown as PatientRepo;

    const match = await findPatientByDedupDemographics(
      { patientRepo },
      TENANT,
      {
        first_name: "Different",
        gender: "male",
        phone_number: "+919999999999",
        age_years: 34,
      },
    );

    expect(match).toBeNull();
  });

  it("returns candidate when dedup rules match", async () => {
    const existing = basePatient();
    const patientRepo = {
      findDedupCandidates: vi.fn().mockResolvedValue([existing]),
    } as unknown as PatientRepo;

    const match = await findPatientByDedupDemographics(
      { patientRepo },
      TENANT,
      {
        first_name: "John",
        last_name: "Smith",
        gender: "male",
        phone_number: "+919999999999",
        date_of_birth: "1990-06-01",
      },
    );

    expect(match?.id).toBe(existing.id);
  });

  it("matches dedup when query phone is 10-digit and EMPI stores +91", async () => {
    const existing = basePatient();
    const patientRepo = {
      findDedupCandidates: vi.fn().mockResolvedValue([existing]),
    } as unknown as PatientRepo;

    const match = await findPatientByDedupDemographics(
      { patientRepo },
      TENANT,
      {
        first_name: "Jon",
        last_name: "Smyth",
        gender: "male",
        phone_number: "9999999999",
        date_of_birth: "1991-06-01",
      },
    );

    expect(patientRepo.findDedupCandidates).toHaveBeenCalledWith(
      TENANT,
      "+919999999999",
      "male",
    );
    expect(match?.id).toBe(existing.id);
  });
});
