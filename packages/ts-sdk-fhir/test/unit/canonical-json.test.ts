import { describe, expect, it } from "vitest";
import { serializeCanonical } from "../../src/canonical-json.js";

describe("serializeCanonical (RFC 8785 §3.2)", () => {
  it("sorts object keys by UTF-16 code unit order", () => {
    expect(serializeCanonical({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("serialises minimal escapes for control characters", () => {
    expect(serializeCanonical({ x: "\n\t" })).toBe('{"x":"\\n\\t"}');
  });

  it("rejects non-finite numbers", () => {
    expect(() => serializeCanonical({ x: NaN })).toThrow(/finite/);
    expect(() => serializeCanonical({ x: Number.POSITIVE_INFINITY })).toThrow(/finite/);
  });

  it("normalises negative zero to zero", () => {
    expect(serializeCanonical({ x: -0 })).toBe('{"x":0}');
  });
});
