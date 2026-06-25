import { describe, expect, it } from "vitest";
import {
  parseFhirBundleForDisplay,
  resolveNrcesProfileBundleType,
} from "./fhir-bundle-display.js";
import { filterDataPushedEntry } from "./fhir-hi-type-filter.js";

const HI_TYPES = [
  "Prescription",
  "DiagnosticReport",
  "DischargeSummary",
  "OPConsultation",
  "ImmunizationRecord",
  "HealthDocumentRecord",
  "WellnessRecord",
];

describe("resolveNrcesProfileBundleType", () => {
  it("strips profile version suffix", () => {
    expect(
      resolveNrcesProfileBundleType(
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord|6.5.0",
      ),
    ).toBe("OPConsultRecord");
  });
});

describe("parseFhirBundleForDisplay", () => {
  it("maps versioned OPConsult composition profile for HI-type filter", () => {
    const bundle = {
      resourceType: "Bundle",
      type: "document",
      id: "bundle-1",
      entry: [
        {
          resource: {
            resourceType: "Composition",
            title: "OP Consultation",
            meta: {
              profile: [
                "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord|6.5.0",
              ],
            },
          },
        },
      ],
    };
    const display = parseFhirBundleForDisplay(JSON.stringify(bundle), {
      sessionId: "sess-1",
      careContextReference: "visit_OPConsultNote",
    });
    expect(display.bundleType).toBe("OPConsultRecord");
    expect(filterDataPushedEntry({ bundleType: display.bundleType }, HI_TYPES)).toBe(true);
  });
});
