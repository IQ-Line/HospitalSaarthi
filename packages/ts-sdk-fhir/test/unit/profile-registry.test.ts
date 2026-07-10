import { describe, expect, it } from "vitest";
import {
  NRCeS_PROFILES,
  NRCeS_PROFILE_BUNDLE_TYPES,
  resolveNrcesBundleType,
  firstProfileUrl,
} from "../../src/profile-registry/index.js";

describe("NRCeS_PROFILE_BUNDLE_TYPES", () => {
  it("derives one entry per registered profile, keyed by canonical URL", () => {
    const registered = Object.values(NRCeS_PROFILES).map((p) => p.canonicalUrl).sort();
    expect(Object.keys(NRCeS_PROFILE_BUNDLE_TYPES).sort()).toEqual(registered);
  });

  it("maps each canonical URL to its last path segment", () => {
    expect(
      NRCeS_PROFILE_BUNDLE_TYPES[
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord"
      ],
    ).toBe("OPConsultRecord");
    expect(
      NRCeS_PROFILE_BUNDLE_TYPES[
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord"
      ],
    ).toBe("PrescriptionRecord");
  });
});

describe("resolveNrcesBundleType", () => {
  it("strips the version suffix before lookup", () => {
    expect(
      resolveNrcesBundleType(
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord|6.5.0",
      ),
    ).toBe("OPConsultRecord");
  });

  it("resolves an unversioned profile URL", () => {
    expect(
      resolveNrcesBundleType(
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryRecord",
      ),
    ).toBe("DischargeSummaryRecord");
  });

  it("returns undefined for empty, whitespace, or unknown URLs", () => {
    expect(resolveNrcesBundleType(undefined)).toBeUndefined();
    expect(resolveNrcesBundleType("   ")).toBeUndefined();
    expect(resolveNrcesBundleType("https://example.com/not-a-profile")).toBeUndefined();
  });
});

describe("firstProfileUrl", () => {
  it("returns meta.profile[0] when present", () => {
    expect(
      firstProfileUrl({
        meta: {
          profile: ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord|6.5.0"],
        },
      }),
    ).toBe("https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord|6.5.0");
  });

  it("returns undefined when meta/profile is missing, empty, or non-object", () => {
    expect(firstProfileUrl(undefined)).toBeUndefined();
    expect(firstProfileUrl(null)).toBeUndefined();
    expect(firstProfileUrl("resource")).toBeUndefined();
    expect(firstProfileUrl({})).toBeUndefined();
    expect(firstProfileUrl({ meta: {} })).toBeUndefined();
    expect(firstProfileUrl({ meta: { profile: [] } })).toBeUndefined();
  });
});
