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

function compareUtf16(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ca = a.charCodeAt(i);
    const cb = b.charCodeAt(i);
    if (ca !== cb) return ca < cb ? -1 : 1;
  }
  return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
}

function serializeString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    switch (c) {
      case 0x22:
        out += '\\"';
        break;
      case 0x5c:
        out += "\\\\";
        break;
      case 0x08:
        out += "\\b";
        break;
      case 0x0c:
        out += "\\f";
        break;
      case 0x0a:
        out += "\\n";
        break;
      case 0x0d:
        out += "\\r";
        break;
      case 0x09:
        out += "\\t";
        break;
      default:
        if (c < 0x20) {
          out += "\\u" + ("0000" + c.toString(16)).slice(-4);
        } else {
          out += s[i]!;
        }
    }
  }
  return `${out}"`;
}

/**
 * Serialise a finite JSON number per RFC 8785 / ES `NumberToString` rules
 * sufficient for FHIR payloads (no `BigInt`; reject non-finite).
 */
function serializeNumber(n: number): string {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new TypeError(`JCS: number must be finite (got ${String(n)})`);
  }
  const v = Object.is(n, -0) ? 0 : n;
  return JSON.stringify(v);
}

function serializeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return serializeNumber(value);
  if (typeof value === "string") return serializeString(value);
  if (Array.isArray(value)) {
    return `[${value.map((e) => serializeValue(e)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as object).sort(compareUtf16);
    const parts: string[] = [];
    for (const k of keys) {
      parts.push(`${serializeString(k)}:${serializeValue((value as Record<string, unknown>)[k])}`);
    }
    return `{${parts.join(",")}}`;
  }
  throw new TypeError(`JCS: unsupported type ${typeof value}`);
}

/**
 * Serialise an arbitrary JSON-safe value to its canonical RFC 8785 form.
 *
 * Implements RFC 8785 §3.2 for JSON data model values: UTF-16 key ordering,
 * no insignificant whitespace, minimal string escapes, finite numbers only.
 *
 * @see https://www.rfc-editor.org/rfc/rfc8785#section-3.2
 */
export function serializeCanonical(value: unknown): string {
  return serializeValue(value);
}
