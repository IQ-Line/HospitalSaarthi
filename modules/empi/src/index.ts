export { createRouter } from "./router.js";
export type { EmpiRouterOptions } from "./router.js";

export type {
  Patient,
  CreatePatientData,
  UpdatePatientData,
  PatientFilters,
  PatientStatus,
  Gender,
  Salutation,
  BloodGroup,
  PatientSourceSystem,
  PatientAddress,
  CreateAddressData,
  UpdateAddressData,
  AddressType,
  PatientIdentifier,
  CreateIdentifierData,
  IdentifierType,
  PatientSourceRecord,
  CreateSourceRecordData,
} from "./domain/patient.types.js";

export type {
  PatientRepo,
  AddressRepo,
  IdentifierRepo,
  SourceRecordRepo,
  SequenceRepo,
} from "./ports.js";

export { DrizzlePatientRepo } from "./data-access/patient.repo.js";
export { DrizzleAddressRepo } from "./data-access/address.repo.js";
export { DrizzleIdentifierRepo } from "./data-access/identifier.repo.js";
export { DrizzleSequenceRepo } from "./data-access/sequence.repo.js";
export { DrizzleSourceRecordRepo } from "./data-access/source-record.repo.js";

export {
  empiSchema,
  patients,
  patientSourceRecords,
  patientIdentifiers,
  patientAddresses,
  sequenceCounters,
  matchCandidates,
  mergeHistory,
} from "./schema/tables.js";
