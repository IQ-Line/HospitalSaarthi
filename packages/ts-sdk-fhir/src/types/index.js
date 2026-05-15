/**
 * Minimal hand-typed subset of FHIR R4 types used by the HIMS platform.
 *
 * Scope: only the resources and fields the platform produces, consumes, or
 * validates today. The shape mirrors `hl7.fhir.r4.core` ImplementationGuide
 * but stripped of unused choice-types and extensions.
 *
 * TODO: when the surface stabilises (post-Phase-1), evaluate replacing this
 * with `@types/fhir` or `@medplum/fhirtypes`. Until then, hand-typing keeps
 * the dependency surface minimal and the polyglot mirror with
 * `@hims/py-sdk-fhir` straightforward.
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see https://hl7.org/fhir/R4/
 */
export {};
//# sourceMappingURL=index.js.map