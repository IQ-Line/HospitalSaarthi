/**
 * Canonical JSON serialiser per RFC 8785 (JSON Canonicalization Scheme / JCS).
 *
 * Used by Record Foundation to produce byte-exact, signing-stable
 * representations of FHIR Bundles before persistence
 * (see ADR-0022 — Immutable FHIR Document Storage).
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 * @see docs/architecture/adr/0022-immutable-fhir-document-storage.md
 * @see https://www.rfc-editor.org/rfc/rfc8785
 */
/**
 * Serialise an arbitrary JSON-safe value to its canonical RFC 8785 form.
 *
 * Rules (from RFC 8785):
 * - Object members are sorted lexicographically by member name (UTF-16 code unit).
 * - Whitespace is removed.
 * - Numbers serialised per ECMA-404 with ECMAScript-style minimal representation.
 * - Strings serialised with the smallest escapes mandated by JSON.
 *
 * TODO: implement using the algorithm from RFC 8785 §3.2.
 * Recommended approach: walk the value, sort keys, emit using `JSON.stringify`
 * with manual numeric handling for the cases where JS's default differs from
 * RFC 8785 (e.g. `1e21` vs `1000000000000000000000`).
 *
 * @see docs/architecture/adr/0023-distributed-fhir-assembly.md
 */
export function serializeCanonical(_value) {
    // TODO: implement RFC 8785. Until then, every caller must treat this as not-yet-available.
    // @see docs/architecture/adr/0023-distributed-fhir-assembly.md
    throw new Error('serializeCanonical: not implemented (RFC 8785 / JCS pending)');
}
//# sourceMappingURL=canonical-json.js.map