import { describe, expect, it } from "vitest";
import { toLinkCareContextHiType } from "./m2-hi-type-mapper.js";

describe("toLinkCareContextHiType", () => {
  it("maps loose input to PascalCase for link/carecontext", () => {
    expect(toLinkCareContextHiType("OPCONSULTATION")).toBe("OPConsultation");
    expect(toLinkCareContextHiType("OPConsultation")).toBe("OPConsultation");
    expect(toLinkCareContextHiType("PRESCRIPTION")).toBe("Prescription");
  });
});
