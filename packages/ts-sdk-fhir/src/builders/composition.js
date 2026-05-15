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
/**
 * Build a `Composition` resource for the given NRCeS profile.
 *
 * TODO: implement. The body must:
 *   1. Resolve the profile's canonical URL + version from `NRCeS_PROFILES` and
 *      stamp them on `meta.profile`.
 *   2. Default `status` to `'final'` when omitted.
 *   3. Default `text` to a minimal `generated` narrative if not provided.
 *   4. Validate `sections[]` against the profile's required section codes
 *      (delegated to `validateAgainstProfile` post-assembly).
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildComposition(_input) {
    // TODO: implement per ADR-0023.
    // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
    throw new Error('buildComposition: not implemented');
}
//# sourceMappingURL=composition.js.map