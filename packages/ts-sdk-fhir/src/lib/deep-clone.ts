/** JSON-round-trip clone (FHIR resources are JSON-serialisable). */
export function deepCloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
