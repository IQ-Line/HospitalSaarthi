import { describe, expect, it } from "vitest";
import {
  PLATFORM_RUNTIME_MODULE_SLUGS,
  isPlatformRuntimeModuleSlug,
} from "../../../src/domain/platform-module-slugs.js";

describe("platform runtime module slugs", () => {
  it("lists only validated unique infrastructure slugs", () => {
    expect(new Set(PLATFORM_RUNTIME_MODULE_SLUGS).size).toBe(PLATFORM_RUNTIME_MODULE_SLUGS.length);
    for (const slug of PLATFORM_RUNTIME_MODULE_SLUGS) {
      expect(isPlatformRuntimeModuleSlug(slug)).toBe(true);
      expect(isPlatformRuntimeModuleSlug(`  ${slug.toUpperCase()}  `)).toBe(true);
    }
  });

  it("returns false for line-of-business modules", () => {
    expect(isPlatformRuntimeModuleSlug("opd")).toBe(false);
    expect(isPlatformRuntimeModuleSlug("")).toBe(false);
  });
});
