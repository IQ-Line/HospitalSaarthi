/**
 * `Composition` builder.
 *
 * The Composition is the head of every NRCeS Document Bundle: it names the
 * document type, narrative, sections, subject, and authoring practitioner.
 * Record Foundation owns Composition assembly per ADR-0023.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://hl7.org/fhir/R4/composition.html
 */

import type {
  Composition,
  CompositionAttester,
  CompositionSection,
  FhirCodeableConcept,
  FhirDateTime,
  FhirReference,
  FhirIdentifier,
} from "../types/index.js";
import { NRCeS_PROFILES, type NrcesProfileName } from "../profile-registry/index.js";

export interface BuildCompositionInput {
  profile: NrcesProfileName;
  identifier?: FhirIdentifier;
  status?: "preliminary" | "final";
  type: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  subject: FhirReference;
  encounter?: FhirReference;
  date: FhirDateTime;
  author: FhirReference[];
  title: string;
  attester?: CompositionAttester[];
  /** Maps to FHIR `Composition.section`. */
  sections: CompositionSection[];
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build a `Composition` resource for the given NRCeS profile.
 *
 * Stamps `meta.profile` from the registry, defaults `status` to `final`, and
 * supplies a minimal generated narrative from `title`. Full NRCeS IG
 * cardinality and slicing are enforced by `validateAgainstProfile` (structural
 * pre-checks today; CI may run the HL7 Java validator).
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildComposition(input: BuildCompositionInput): Composition {
  const pinned = NRCeS_PROFILES[input.profile];
  const status = input.status ?? "final";
  const div = `<div xmlns="http://www.w3.org/1999/xhtml"><p>${escapeXml(input.title)}</p></div>`;
  return {
    resourceType: "Composition",
    meta: {
      profile: [`${pinned.canonicalUrl}|${pinned.version}`],
    },
    ...(input.identifier ? { identifier: input.identifier } : {}),
    status,
    type: input.type,
    ...(input.category ? { category: input.category } : {}),
    subject: input.subject,
    ...(input.encounter ? { encounter: input.encounter } : {}),
    date: input.date,
    author: input.author,
    title: input.title,
    ...(input.attester ? { attester: input.attester } : {}),
    section: input.sections,
    text: {
      status: "generated",
      div,
    },
  };
}
