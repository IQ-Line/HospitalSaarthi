import { describe, expect, it } from "vitest";
import { AbdmUseCaseError } from "../../../../../src/integrations/abdm/lib/m1-errors.js";
import { resolveUnifiedLinkHiType } from "../../../../../src/integrations/abdm/lib/m2-link-hi-type.js";

describe("resolveUnifiedLinkHiType", () => {
  it("maps a single context hiType", () => {
    expect(resolveUnifiedLinkHiType([{ hiType: "OPCONSULTATION" }])).toBe(
      "OPConsultation",
    );
  });

  it("rejects mixed hi types", () => {
    expect(() =>
      resolveUnifiedLinkHiType([
        { hiType: "OPCONSULTATION" },
        { hiType: "PRESCRIPTION" },
      ]),
    ).toThrow(AbdmUseCaseError);
  });
});
