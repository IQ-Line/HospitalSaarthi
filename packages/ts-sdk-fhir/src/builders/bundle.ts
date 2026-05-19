/**
 * `Bundle` builder for FHIR Document Bundles (NRCeS profile-bound).
 *
 * Per ADR-0023, Record Foundation calls this once per finalised clinical
 * event after it has the Composition + entry resources from the owning module.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://hl7.org/fhir/R4/documents.html
 */

import type { Bundle, Composition, FhirResourceBase, FhirIdentifier, FhirInstant } from "../types/index.js";
import { deepCloneJson } from "../lib/deep-clone.js";
import { randomUuid } from "../lib/random-uuid.js";
import { buildReferenceMap, rewriteReferencesInPlace } from "../lib/reference-rewrite.js";

export interface BuildDocumentBundleInput {
  identifier?: FhirIdentifier;
  timestamp?: FhirInstant;
  composition: Composition;
  /** Resources referenced by Composition (excluding the Composition itself). */
  entries: FhirResourceBase[];
}

/**
 * Build a `Bundle` of `type: 'document'` whose first entry is the Composition.
 *
 * Assigns `urn:uuid:` `fullUrl`s, sets matching `resource.id`, and rewrites
 * `Reference.reference` values of the form `ResourceType/id` to those URLs
 * when the target resource is present in the bundle.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildDocumentBundle(input: BuildDocumentBundleInput): Bundle {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const bundleId = randomUuid();
  const identifier: FhirIdentifier =
    input.identifier ?? {
      system: "urn:ietf:rfc:3986",
      value: `urn:uuid:${randomUuid()}`,
    };

  const composition = deepCloneJson(input.composition);
  const compUuid = randomUuid();
  composition.id = compUuid;

  const entryResources: FhirResourceBase[] = [composition, ...input.entries.map((r) => deepCloneJson(r))];

  const fullUrls: string[] = [];
  for (let i = 1; i < entryResources.length; i++) {
    const r = entryResources[i]!;
    if (!r.id) {
      r.id = randomUuid();
    }
  }

  for (const r of entryResources) {
    if (!r.id) {
      r.id = randomUuid();
    }
    fullUrls.push(`urn:uuid:${r.id}`);
  }

  const refMap = buildReferenceMap(
    entryResources as { resourceType: string; id?: string }[],
    fullUrls,
  );

  for (const r of entryResources) {
    rewriteReferencesInPlace(r, refMap);
  }

  const bundle: Bundle = {
    resourceType: "Bundle",
    id: bundleId,
    identifier,
    type: "document",
    timestamp,
    entry: entryResources.map((resource, i) => ({
      fullUrl: fullUrls[i],
      resource,
    })),
  };

  return bundle;
}
