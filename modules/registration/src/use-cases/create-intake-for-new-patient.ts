import type { EmpiHttpPort, RegistrationRepo } from "../ports.js";
import type { NewPatientIntakeInput, RegistrationRecord } from "../domain/registration.types.js";

export async function createIntakeForNewPatient(
  deps: {
    registrationRepo: RegistrationRepo;
    empiGateway: EmpiHttpPort;
  },
  tenantId: string,
  input: NewPatientIntakeInput,
): Promise<
  | { ok: true; registration: RegistrationRecord }
  | { ok: false; kind: "duplicate"; body: unknown }
  | { ok: false; kind: "empi_error"; status: number; body: string }
> {
  const empiResult = await deps.empiGateway.registerPatient(tenantId, input.patient);
  if (!empiResult.ok) {
    if (empiResult.status === 409) {
      return { ok: false, kind: "duplicate", body: empiResult.body };
    }
    return {
      ok: false,
      kind: "empi_error",
      status: empiResult.status,
      body: empiResult.body,
    };
  }

  const registration = await deps.registrationRepo.insert(tenantId, {
    patient_id: empiResult.patientId,
    visit_id: input.visit_id,
    facility_id: input.facility_id,
    visit_type: input.visit_type,
    department_id: input.department_id,
    provider_id: input.provider_id,
    appointment_id: input.appointment_id,
    registration_status: input.registration_status,
    created_by: input.created_by,
  });

  return { ok: true, registration };
}
