import { describe, expect, it } from "vitest";
import { InvalidCapabilityProvenanceError } from "../../../src/domain/errors.js";
import { normalizeCapabilityProvenance } from "../../../src/domain/capability-provenance.js";

describe("normalizeCapabilityProvenance", () => {
  it("allows all-null provenance", () => {
    expect(normalizeCapabilityProvenance({})).toEqual({
      source_module_slug: null,
      source_permission_slug: null,
      source_catalog: null,
    });
  });

  it("requires master_data catalog when set", () => {
    expect(() =>
      normalizeCapabilityProvenance({ source_catalog: "other" }),
    ).toThrow(InvalidCapabilityProvenanceError);
  });

  it("requires source_module_slug when source_permission_slug is set", () => {
    expect(() =>
      normalizeCapabilityProvenance({ source_permission_slug: "read_chart" }),
    ).toThrow(InvalidCapabilityProvenanceError);
  });

  it("normalizes module slug and pairs with permission", () => {
    expect(
      normalizeCapabilityProvenance({
        source_module_slug: " OPD ",
        source_permission_slug: "read_visit ",
        source_catalog: "master_data",
      }),
    ).toEqual({
      source_module_slug: "opd",
      source_permission_slug: "read_visit",
      source_catalog: "master_data",
    });
  });
});
