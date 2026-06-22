import { describe, expect, it, vi } from "vitest";
import type { EventBus } from "@hims/ts-sdk-events";
import type { RegistrationRecord } from "../../../src/domain/registration.types.js";
import { publishRegistrationCreated } from "../../../src/events/publish-registration-created.js";
import { REGISTRATION_EVENT_REGISTRATION_CREATED } from "../../../src/lib/registration-helpers.js";

const sampleRecord: RegistrationRecord = {
  registration_id: "11111111-1111-4111-8111-111111111111",
  iq_tenant_id: "22222222-2222-4222-8222-222222222222",
  patient_id: "33333333-3333-4333-8333-333333333333",
  patient_uhid: "MH240001",
  patient_abha_number: null,
  patient_abha_address: null,
  patient_full_name: "Asha Patil",
  patient_phone_number: "+919876543210",
  patient_gender: "female",
  patient_date_of_birth: "1985-03-12",
  patient_year_of_birth: 1985,
  patient_source_record_id: "44444444-4444-4444-8444-444444444444",
  idempotency_key: "desk-1",
  created_by: null,
  updated_by: null,
  created_at: new Date("2026-05-18T10:00:00.000Z"),
  updated_at: new Date("2026-05-18T10:00:00.000Z"),
};

describe("publishRegistrationCreated", () => {
  it("publishes registration.registration.created with snapshot fields", async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const eventBus = { publish } as unknown as EventBus;

    await publishRegistrationCreated({ eventBus }, sampleRecord, null);

    expect(publish).toHaveBeenCalledOnce();
    const envelope = publish.mock.calls[0]![0];
    expect(envelope.event_type).toBe(REGISTRATION_EVENT_REGISTRATION_CREATED);
    expect(envelope.payload.patient_uhid).toBe("MH240001");
    expect(envelope.payload.patient_source_record_id).toBe(
      "44444444-4444-4444-8444-444444444444",
    );
  });
});
