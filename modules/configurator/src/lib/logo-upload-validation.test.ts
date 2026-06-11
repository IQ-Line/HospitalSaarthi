import { describe, expect, it } from "vitest";
import {
  assertAllowedBrandingStorageKey,
  generateBrandingLogoPath,
  validateBrandingLogoUpload,
} from "./logo-upload-validation.js";

describe("logo-upload-validation", () => {
  it("generates scoped branding logo paths", () => {
    expect(generateBrandingLogoPath("organization", "City-Diagnostics", ".png")).toMatch(
      /^configurator\/branding\/organization\/city-diagnostics\/[a-f0-9]+\.png$/,
    );
  });

  it("rejects invalid mime types", () => {
    expect(() => validateBrandingLogoUpload("application/pdf", 1024)).toThrow(
      "Only PNG and JPEG logo images are allowed",
    );
  });

  it("allows only configurator branding storage keys", () => {
    expect(() =>
      assertAllowedBrandingStorageKey("configurator/branding/tenant/demo/logo.png"),
    ).not.toThrow();
    expect(() => assertAllowedBrandingStorageKey("../secrets")).toThrow();
  });
});
