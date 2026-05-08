import { describe, expect, it, vi } from "vitest";
import type { EventBus } from "@hims/ts-sdk-events";
import type { PatientRepo } from "../ports.js";
import type { Patient } from "../domain/patient.types.js";
import { changePatientStatus } from "./change-patient-status.js";

const basePatient = (status: Patient["status"]): Patient => ({
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  iq_tenant_id: "11111111-2222-4333-8444-555555555555",
  uhid: "260507000010000001",
  abha_number: null,
  salutation: null,
  first_name: "X",
  middle_name: null,
  last_name: null,
  full_name: "X",
  father_name: null,
  mother_name: null,
  date_of_birth: null,
  year_of_birth: null,
  age_years: null,
  age_months: null,
  age_days: null,
  gender: "male",
  phone_number: "1",
  alternate_phone: null,
  blood_group: null,
  occupation: null,
  nationality: "Indian",
  education: null,
  emergency_contact_name: null,
  emergency_contact_relationship: null,
  emergency_contact_phone: null,
  status,
  merged_into_id: null,
  registered_by: null,
  created_at: new Date(),
  updated_at: new Date(),
  created_by: null,
  updated_by: null,
});

describe("changePatientStatus", () => {
  it("rejects deceased → active", async () => {
    const patientRepo = {
      findById: vi.fn().mockResolvedValue(basePatient("deceased")),
      updateStatus: vi.fn(),
    } as unknown as PatientRepo;

    const result = await changePatientStatus(
      { patientRepo, eventBus: { publish: vi.fn() } as unknown as EventBus },
      "11111111-2222-4333-8444-555555555555",
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "active",
      null,
    );

    expect(result).toEqual({
      ok: false,
      error: "invalid_status_transition",
      from: "deceased",
      to: "active",
    });
    expect(patientRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("allows inactive → active and publishes event", async () => {
    const updated = { ...basePatient("active"), updated_by: null };
    const patientRepo = {
      findById: vi.fn().mockResolvedValue(basePatient("inactive")),
      updateStatus: vi.fn().mockResolvedValue(updated),
    } as unknown as PatientRepo;
    const publish = vi.fn().mockResolvedValue(undefined);

    const result = await changePatientStatus(
      { patientRepo, eventBus: { publish } as unknown as EventBus },
      "11111111-2222-4333-8444-555555555555",
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "active",
      null,
    );

    expect(result.ok && result.patient.status).toBe("active");
    expect(publish).toHaveBeenCalledTimes(1);
  });
});
