import { describe, expect, it } from "vitest";
import { toGatewayAbhaNumberPlain } from "../../../../../src/integrations/abdm/lib/m2-gateway-abha-number.js";

describe("toGatewayAbhaNumberPlain", () => {
  it("strips dashes for NHA gateway wire format", () => {
    expect(toGatewayAbhaNumberPlain("91-3488-3776-0621")).toBe("91348837760621");
  });

  it("returns undefined for missing or invalid input", () => {
    expect(toGatewayAbhaNumberPlain(undefined)).toBeUndefined();
    expect(toGatewayAbhaNumberPlain("123")).toBeUndefined();
  });
});
