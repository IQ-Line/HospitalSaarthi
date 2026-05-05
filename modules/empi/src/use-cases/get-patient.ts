import type { PatientRepo, AddressRepo, IdentifierRepo } from "../ports.js";
import type {
  Patient,
  PatientAddress,
  PatientIdentifier,
} from "../domain/patient.types.js";

interface Deps {
  patientRepo: PatientRepo;
  addressRepo: AddressRepo;
  identifierRepo: IdentifierRepo;
}

interface PatientDetail {
  patient: Patient;
  addresses: PatientAddress[];
  identifiers: PatientIdentifier[];
}

export async function getPatient(
  deps: Deps,
  tenantId: string,
  patientId: string,
): Promise<PatientDetail | undefined> {
  const patient = await deps.patientRepo.findById(tenantId, patientId);
  if (!patient) return undefined;

  const [addresses, identifiers] = await Promise.all([
    deps.addressRepo.findByPatient(tenantId, patientId),
    deps.identifierRepo.findByPatient(tenantId, patientId),
  ]);

  return { patient, addresses, identifiers };
}
