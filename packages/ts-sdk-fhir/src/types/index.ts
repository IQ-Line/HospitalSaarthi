/**
 * Minimal hand-typed subset of FHIR R4 types used by the HIMS platform.
 *
 * Scope: only the resources and fields the platform produces, consumes, or
 * validates today. The shape mirrors `hl7.fhir.r4.core` ImplementationGuide
 * but stripped of unused choice-types and extensions.
 *
 * Future: when the surface stabilises (post-Phase-1), evaluate replacing this
 * with `@types/fhir` or `@medplum/fhirtypes`. Until then, hand-typing keeps
 * the dependency surface minimal and the polyglot mirror with
 * `@hims/py-sdk-fhir` straightforward.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://hl7.org/fhir/R4/
 */

export type FhirDateTime = string; // ISO 8601, e.g. "2026-05-08T10:30:00+05:30"
export type FhirDate = string; // "YYYY-MM-DD"
export type FhirInstant = string; // ISO 8601 with timezone, millisecond precision
export type FhirUri = string;
export type FhirCode = string;
export type FhirId = string;

export interface FhirCoding {
  system?: FhirUri;
  code?: FhirCode;
  display?: string;
  version?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  system?: FhirUri;
  value?: string;
  type?: FhirCodeableConcept;
}

export interface FhirReference {
  reference?: string; // "ResourceType/id" or "urn:uuid:..."
  type?: FhirUri;
  identifier?: FhirIdentifier;
  display?: string;
}

export interface FhirHumanName {
  use?: 'usual' | 'official' | 'nickname' | 'anonymous' | 'old';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
}

export interface FhirPeriod {
  start?: FhirDateTime;
  end?: FhirDateTime;
}

export interface FhirMeta {
  versionId?: FhirId;
  lastUpdated?: FhirInstant;
  profile?: FhirUri[];
}

export interface FhirNarrative {
  status: 'generated' | 'extensions' | 'additional' | 'empty';
  div: string; // XHTML
}

export interface FhirResourceBase {
  resourceType: string;
  id?: FhirId;
  meta?: FhirMeta;
  text?: FhirNarrative;
}

export interface Patient extends FhirResourceBase {
  resourceType: 'Patient';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: FhirDate;
  // Future: address, telecom, deceased, contact when needed.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
}

export interface Encounter extends FhirResourceBase {
  resourceType: 'Encounter';
  identifier?: FhirIdentifier[];
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  class: FhirCoding;
  type?: FhirCodeableConcept[];
  subject?: FhirReference;
  period?: FhirPeriod;
  // Future: participant, reasonCode, diagnosis, location, serviceProvider.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
}

export interface MedicationRequest extends FhirResourceBase {
  resourceType: 'MedicationRequest';
  identifier?: FhirIdentifier[];
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  medicationCodeableConcept?: FhirCodeableConcept;
  medicationReference?: FhirReference;
  subject: FhirReference;
  encounter?: FhirReference;
  authoredOn?: FhirDateTime;
  requester?: FhirReference;
  // Future: dosageInstruction, dispenseRequest, substitution.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
}

export interface DiagnosticReport extends FhirResourceBase {
  resourceType: 'DiagnosticReport';
  identifier?: FhirIdentifier[];
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: FhirDateTime;
  issued?: FhirInstant;
  performer?: FhirReference[];
  result?: FhirReference[];
  // Future: presentedForm (PDF), conclusion, conclusionCode, media.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
}

export interface Observation extends FhirResourceBase {
  resourceType: 'Observation';
  identifier?: FhirIdentifier[];
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: FhirDateTime;
  valueQuantity?: { value: number; unit?: string; system?: FhirUri; code?: FhirCode };
  valueString?: string;
  valueCodeableConcept?: FhirCodeableConcept;
  // Future: referenceRange, component, interpretation.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
}

export interface CompositionSection {
  title?: string;
  code?: FhirCodeableConcept;
  text?: FhirNarrative;
  entry?: FhirReference[];
  section?: CompositionSection[];
}

export interface CompositionAttester {
  mode: 'personal' | 'professional' | 'legal' | 'official';
  time?: FhirDateTime;
  party?: FhirReference;
}

export interface Composition extends FhirResourceBase {
  resourceType: 'Composition';
  identifier?: FhirIdentifier;
  status: 'preliminary' | 'final' | 'amended' | 'entered-in-error';
  type: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  subject?: FhirReference;
  encounter?: FhirReference;
  date: FhirDateTime;
  author: FhirReference[];
  title: string;
  attester?: CompositionAttester[];
  section?: CompositionSection[];
}

export interface BundleEntry {
  fullUrl?: FhirUri;
  resource?: FhirResourceBase;
  // Future: search, request, response when we use Bundle for transactions.
}

export interface Bundle extends FhirResourceBase {
  resourceType: 'Bundle';
  identifier?: FhirIdentifier;
  type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';
  timestamp?: FhirInstant;
  entry?: BundleEntry[];
}
