import { describe, expect, it } from "vitest";
import { parseNhaAbhaCardBody } from "../../../../../src/integrations/abdm/lib/parse-nha-abha-card-body.js";

describe("parseNhaAbhaCardBody", () => {
  it("parses JSON wrapper", () => {
    const json = JSON.stringify({ data: "abc123", format: "pdf" });
    const buf = new TextEncoder().encode(json).buffer;
    expect(parseNhaAbhaCardBody(buf, "application/json")).toEqual({
      data: "abc123",
      format: "pdf",
    });
  });

  it("base64-encodes raw PDF bytes", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    const out = parseNhaAbhaCardBody(pdf.buffer, "application/pdf");
    expect(out.format).toBe("pdf");
    expect(out.data).toBe(Buffer.from(pdf).toString("base64"));
  });

  it("accepts plain base64 text body", () => {
    const b64 = "YWJjZGVm".repeat(20);
    const buf = new TextEncoder().encode(b64).buffer;
    const out = parseNhaAbhaCardBody(buf, "text/plain");
    expect(out.data).toBe(b64);
  });
});
