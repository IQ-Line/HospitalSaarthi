import { describe, expect, it } from "vitest";
import { filterConsentCareContexts } from "./filter-consent-care-contexts.js";

describe("filterConsentCareContexts", () => {
  const careContexts = [
    {
      patientReference: "patient-1",
      careContextReference: "cc-1",
    },
  ];

  it("returns empty when hiTypes is empty (fail-closed)", () => {
    expect(
      filterConsentCareContexts({
        hiTypes: [],
        careContexts,
      }),
    ).toEqual([]);
  });

  it("returns empty when no requested hiTypes are supported", () => {
    expect(
      filterConsentCareContexts({
        hiTypes: ["WellnessRecord"],
        careContexts,
      }),
    ).toEqual([]);
  });

  it("returns care contexts when a supported hiType is requested", () => {
    expect(
      filterConsentCareContexts({
        hiTypes: ["OPConsultation"],
        careContexts,
      }),
    ).toEqual([
      {
        patientReference: "patient-1",
        careContextReference: "cc-1",
      },
    ]);
  });
});
