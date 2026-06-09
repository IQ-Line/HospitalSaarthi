import type {
  Patient,
  CreatePatientData,
  UpdatePatientData,
  PatientFilters,
  PatientAddress,
  CreateAddressData,
  UpdateAddressData,
  PatientIdentifier,
  CreateIdentifierData,
  PatientSourceRecord,
  CreateSourceRecordData,
} from "./domain/patient.types.js";

export interface PatientRepo {
  findAll(
    tenantId: string,
    filters?: PatientFilters,
  ): Promise<{ data: Patient[]; total: number }>;
  findById(tenantId: string, id: string): Promise<Patient | undefined>;
  findByUhid(tenantId: string, uhid: string): Promise<Patient | undefined>;
  findByPhone(tenantId: string, phone: string): Promise<Patient[]>;
  /** Same tenant, phone, gender, not merged — Phase 2 registration dedup blocking query. */
  findDedupCandidates(
    tenantId: string,
    phone: string,
    gender: string,
  ): Promise<Patient[]>;
  create(data: CreatePatientData & { uhid: string; full_name: string }): Promise<Patient>;
  update(
    tenantId: string,
    id: string,
    data: UpdatePatientData,
  ): Promise<Patient | undefined>;
  updateStatus(
    tenantId: string,
    id: string,
    status: string,
    updatedBy: string | null,
  ): Promise<Patient | undefined>;
}

export interface AddressRepo {
  findByPatient(tenantId: string, patientId: string): Promise<PatientAddress[]>;
  create(data: CreateAddressData): Promise<PatientAddress>;
  update(
    tenantId: string,
    id: string,
    data: UpdateAddressData,
  ): Promise<PatientAddress | undefined>;
}

export interface IdentifierRepo {
  findByPatient(
    tenantId: string,
    patientId: string,
  ): Promise<PatientIdentifier[]>;
  findActivePatientIdByIdentifier(
    tenantId: string,
    identifierType: string,
    identifierValue: string,
  ): Promise<string | undefined>;
  create(data: CreateIdentifierData): Promise<PatientIdentifier>;
  deactivate(
    tenantId: string,
    id: string,
  ): Promise<PatientIdentifier | undefined>;
}

export interface SourceRecordRepo {
  findByPatient(
    tenantId: string,
    patientId: string,
  ): Promise<PatientSourceRecord[]>;
  create(data: CreateSourceRecordData): Promise<PatientSourceRecord>;
}

export interface SequenceRepo {
  nextValue(tenantId: string, sequenceName: string): Promise<number>;
}
