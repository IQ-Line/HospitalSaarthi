import { describe, expect, it } from "vitest";
import { extractAttachmentContent, parseFhirBundleForDisplay } from "./fhir-bundle-display.js";
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

describe("extractAttachmentContent", () => {
  // presentedForm[] (DiagnosticReport) then content[].attachment (DocumentReference),
  // collected in entry order.
  const twoAttachmentBundle = JSON.stringify({
    resourceType: "Bundle",
    entry: [
      {
        resource: {
          resourceType: "DiagnosticReport",
          presentedForm: [
            { data: "FIRST_B64", title: "Lab Report", contentType: "application/pdf" },
          ],
        },
      },
      {
        resource: {
          resourceType: "DocumentReference",
          content: [
            { attachment: { data: "SECOND_B64", title: "Scan", contentType: "image/png" } },
          ],
        },
      },
    ],
  });

  it("returns the num-th attachment (1-based) across entries in collection order", () => {
    expect(extractAttachmentContent(twoAttachmentBundle, 1)).toEqual({
      content: "FIRST_B64",
      title: "Lab Report",
      contentType: "application/pdf",
    });
    expect(extractAttachmentContent(twoAttachmentBundle, 2)).toEqual({
      content: "SECOND_B64",
      title: "Scan",
      contentType: "image/png",
    });
  });

  it("returns null when num is out of range", () => {
    expect(extractAttachmentContent(twoAttachmentBundle, 3)).toBeNull();
    expect(extractAttachmentContent(twoAttachmentBundle, 0)).toBeNull();
  });

  it("skips entries without an extractable attachment and applies title/contentType defaults", () => {
    const bundle = JSON.stringify({
      resourceType: "Bundle",
      entry: [
        "not-an-object", // no resource → skipped
        { resource: { resourceType: "Composition", title: "OP Consultation" } }, // no attachment → skipped
        { resource: { resourceType: "DiagnosticReport", presentedForm: [{ title: "no data" }] } }, // missing data → skipped
        { resource: { resourceType: "DocumentReference", content: [{ attachment: { data: "ONLY_B64" } }] } },
      ],
    });
    // Skipped entries do not consume a num; missing title/contentType fall back to defaults.
    expect(extractAttachmentContent(bundle, 1)).toEqual({
      content: "ONLY_B64",
      title: "Document",
      contentType: "application/pdf",
    });
    expect(extractAttachmentContent(bundle, 2)).toBeNull();
  });

  it("returns null for non-JSON content or a bundle without an entry array", () => {
    expect(extractAttachmentContent("<<not json>>", 1)).toBeNull();
    expect(extractAttachmentContent(JSON.stringify({ resourceType: "Bundle" }), 1)).toBeNull();
  });
});
