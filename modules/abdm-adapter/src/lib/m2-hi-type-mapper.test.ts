import { describe, expect, it } from "vitest";
import { toLinkCareContextHiType } from "./m2-hi-type-mapper.js";

describe("toLinkCareContextHiType", () => {
  it("maps ALL CAPS to PascalCase for link/carecontext", () => {
    expect(toLinkCareContextHiType("OPCONSULTATION")).toBe("OPConsultation");
    expect(toLinkCareContextHiType("PRESCRIPTION")).toBe("Prescription");
  });

  it("passes through PascalCase", () => {
    expect(toLinkCareContextHiType("OPConsultation")).toBe("OPConsultation");
  });
});
