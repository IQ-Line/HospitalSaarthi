/**
 * `MedicationRequest` builder.
 *
 * Used by OPD and Pharmacy modules when serialising prescription rows.
 * Attached to `consultation.finalized` / `prescription.issued` events
 * per ADR-0023.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://hl7.org/fhir/R4/medicationrequest.html
 */
/**
 * Build a `MedicationRequest` resource.
 *
 * TODO: implement. The body must:
 *   1. Enforce the `medicationCodeableConcept` / `medicationReference` XOR.
 *   2. Stamp `meta.profile` with the Prescription profile when callers
 *      indicate they're producing a NRCeS Prescription bundle.
 *   3. Default `authoredOn` to current ISO 8601 when omitted.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function buildMedicationRequest(_input) {
    // TODO: implement per ADR-0023.
    // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
    throw new Error('buildMedicationRequest: not implemented');
}
//# sourceMappingURL=medication-request.js.map