import { EmpiPatientGatewayNotConfiguredError } from "../errors.js";
import type { EmpiPatientsPort, RegistrationRepo } from "../ports.js";
import type { CreateRegistrationData, Registration } from "../domain/registration.types.js";
import { createRegistration } from "./create-registration.js";

export interface NewPatientIntakeInput {
  patient: Record<string, unknown>;
  visit_id?: string | null;
  facility_id?: string | null;
  visit_type?: string | null;
  department_id?: string | null;
  provider_id?: string | null;
  appointment_id?: string | null;
  registration_status?: string | null;
  created_by?: string | null;
}

interface Deps {
  registrationRepo: RegistrationRepo;
  empiPatientsPort: EmpiPatientsPort | undefined;
}

export async function createIntakeForNewPatient(
  deps: Deps,
  tenantId: string,
  input: NewPatientIntakeInput,
): Promise<Registration> {
  if (!deps.empiPatientsPort) {
    throw new EmpiPatientGatewayNotConfiguredError();
  }
  const { patient_id } = await deps.empiPatientsPort.createPatient(
    tenantId,
    input.patient,
  );
  const data: CreateRegistrationData = {
    patient_id,
    visit_id: input.visit_id,
    facility_id: input.facility_id,
    visit_type: input.visit_type,
    department_id: input.department_id,
    provider_id: input.provider_id,
    appointment_id: input.appointment_id,
    registration_status: input.registration_status ?? undefined,
    created_by: input.created_by,
  };
  return createRegistration({ registrationRepo: deps.registrationRepo }, tenantId, data);
}
