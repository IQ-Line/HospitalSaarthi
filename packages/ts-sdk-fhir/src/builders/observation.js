/**
 * `Observation` builder.
 *
 * Used by Lab, Vitals, and other modules that emit individual measurement
 * resources, typically referenced from a `DiagnosticReport.result[]`.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://hl7.org/fhir/R4/observation.html
 */
/**
 * Build an `Observation` resource.
 *
 * TODO: implement. The body must:
 *   1. Enforce the `value[x]` XOR (at most one of the value variants).
 *   2. Default `category` to LOINC `laboratory` when not provided
 *      and the caller hints `category: 'lab'`.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildObservation(_input) {
    // TODO: implement per ADR-0023.
    // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
    throw new Error('buildObservation: not implemented');
}
//# sourceMappingURL=observation.js.map