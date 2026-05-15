/**
 * `Bundle` builder for FHIR Document Bundles (NRCeS profile-bound).
 *
 * Per ADR-0023, Record Foundation calls this once per finalised clinical
 * event after it has the Composition + entry resources from the owning module.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://hl7.org/fhir/R4/documents.html
 */

import type { Bundle, Composition, FhirResourceBase, FhirIdentifier, FhirInstant } from '../types/index.js';

export interface BuildDocumentBundleInput {
  identifier?: FhirIdentifier;
  timestamp?: FhirInstant;
  composition: Composition;
  /** Resources referenced by Composition.section[].entry. The first entry must
   *  be the Composition itself; this builder is responsible for placing it. */
  entries: FhirResourceBase[];
}

/**
 * Build a `Bundle` of `type: 'document'` whose first entry is the Composition.
 *
 * TODO: implement. The body must:
 *   1. Generate `urn:uuid:<v4>` `fullUrl`s for Composition + each entry.
 *   2. Rewrite all internal references in Composition / resources to those
 *      `fullUrl`s (so the bundle is self-contained).
 *   3. Set `Bundle.identifier` from input or default to a fresh urn:uuid.
 *   4. Default `timestamp` to `new Date().toISOString()` when omitted.
 *
 * Note: this function does *not* validate against the NRCeS profile;
 * `validateAgainstProfile` is the validator entry point.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildDocumentBundle(_input: BuildDocumentBundleInput): Bundle {
  // TODO: implement per ADR-0023.
  // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
  throw new Error('buildDocumentBundle: not implemented');
}
