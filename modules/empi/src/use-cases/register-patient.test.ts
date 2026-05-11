import { describe, expect, it, vi } from "vitest";
import type { EventBus } from "@hims/ts-sdk-events";
import type { PatientRepo, SequenceRepo } from "../ports.js";
import type { Patient } from "../domain/patient.types.js";
import { isValidUhidFormat } from "../domain/uhid.js";
import { registerPatient } from "./register-patient.js";

describe("registerPatient", () => {
  it("publishes empi.patient.created with a valid UHID and payload", async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const eventBus = { publish } as unknown as EventBus;

    const sequenceRepo = {
      nextValue: vi.fn().mockResolvedValue(7),
    } as unknown as SequenceRepo;

    const created: Patient = {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      iq_tenant_id: "11111111-2222-4333-8444-555555555555",
      uhid: "",
      abha_number: null,
      salutation: null,
      first_name: "A",
      middle_name: null,
      last_name: null,
      full_name: "A",
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

    const patientRepo = {
      findDedupCandidates: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async (data: { uhid: string }) => ({
        ...created,
        uhid: data.uhid,
      })),
    } as unknown as PatientRepo;

    await registerPatient(
      {
        patientRepo,
        sequenceRepo,
        eventBus,
        getTenantNumericCode: vi.fn().mockResolvedValue("00001"),
      },
      {
        iq_tenant_id: "11111111-2222-4333-8444-555555555555",
        first_name: "A",
        gender: "male",
        phone_number: "9999999999",
        nationality: "Indian",
      },
    );

    expect(sequenceRepo.nextValue).toHaveBeenCalled();
    expect(patientRepo.create).toHaveBeenCalled();
    const createdArg = (patientRepo.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { uhid: string };
    expect(isValidUhidFormat(createdArg.uhid)).toBe(true);

    expect(publish).toHaveBeenCalledTimes(1);
    const envelope = publish.mock.calls[0][0] as {
      event_type: string;
      payload: { uhid: string };
    };
    expect(envelope.event_type).toBe("empi.patient.created");
    expect(isValidUhidFormat(envelope.payload.uhid)).toBe(true);
  });
});
