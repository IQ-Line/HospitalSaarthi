/**
 * Identifier system URI constants used across FHIR resources produced by HIMS.
 *
 * These values are referenced by `@hims/ts-sdk-abha` when attaching ABHA
 * identifiers to a FHIR Patient, and by clinical modules when issuing
 * MRN-typed identifiers on `Patient`, `Encounter`, etc.
 *
 * TODO: confirm exact NRCeS / NHA-published values during Phase 1
 * implementation. The placeholder URIs below match the convention published in
 * the NRCeS R4 IG examples.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://nrces.in/ndhm/fhir/r4/index.html
 */

/** ABHA Number (14-digit health ID). */
export const ABHA_NUMBER_SYSTEM_URI =
  'https://healthid.ndhm.gov.in';

/** ABHA Address (alias@suffix, e.g. `ramesh@sbx`). */
export const ABHA_ADDRESS_SYSTEM_URI =
  'https://abdm.gov.in/identifier/abha-address';

/** Tenant-issued Medical Record Number. The host is intentionally a HIMS
 *  placeholder; tenants override per their own assigning authority. */
export const MRN_SYSTEM_URI =
  'https://hims.local/identifier/mrn';
