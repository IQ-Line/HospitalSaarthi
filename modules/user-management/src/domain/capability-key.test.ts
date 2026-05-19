import { describe, expect, it } from "vitest";
import { InvalidCapabilityKeyError } from "./errors.js";
import {
  assertCapabilityKeyMatchesCatalogModule,
  assertValidCapabilityKey,
  assertValidRuntimeCapabilityRow,
  findDuplicateCapabilityKeys,
  normalizeCapabilityKey,
  parseCapabilityKey,
  runtimeModuleKeyForCatalogSlug,
} from "./capability-key.js";

describe("capability-key", () => {
  it("parses canonical three-segment keys", () => {
    expect(parseCapabilityKey("um:user:create")).toEqual({
      moduleKey: "um",
      resource: "user",
      action: "create",
      raw: "um:user:create",
    });
  });

  it("normalizes to lowercase", () => {
    expect(normalizeCapabilityKey("  UM:User:READ  ")).toBe("um:user:read");
  });

  it("rejects malformed keys", () => {
    expect(() => assertValidCapabilityKey("um:user")).toThrow(InvalidCapabilityKeyError);
    expect(() => assertValidCapabilityKey("um:user:create:extra")).toThrow(InvalidCapabilityKeyError);
    expect(() => assertValidCapabilityKey("um:us er:read")).toThrow(InvalidCapabilityKeyError);
    expect(() => assertValidCapabilityKey("bad segment:user:read")).toThrow(InvalidCapabilityKeyError);
    expect(() => assertValidCapabilityKey("um:user:invalid-action")).toThrow(InvalidCapabilityKeyError);
  });

  it("maps platform catalog slugs to short runtime module keys", () => {
    expect(runtimeModuleKeyForCatalogSlug("user-management")).toBe("um");
    expect(runtimeModuleKeyForCatalogSlug("master-data")).toBe("md");
    expect(runtimeModuleKeyForCatalogSlug("configurator")).toBe("cfg");
    expect(runtimeModuleKeyForCatalogSlug("frontdesk")).toBe("fd");
    expect(runtimeModuleKeyForCatalogSlug("billing")).toBe("billing");
  });

  it("asserts capability_key module segment matches catalog module slug", () => {
    expect(() =>
      assertCapabilityKeyMatchesCatalogModule("billing:user:read", "user-management"),
    ).toThrow(InvalidCapabilityKeyError);
    expect(() =>
      assertCapabilityKeyMatchesCatalogModule("um:user:read", "user-management"),
    ).not.toThrow();
    expect(() =>
      assertCapabilityKeyMatchesCatalogModule("user-management:user:read", "user-management"),
    ).not.toThrow();
    expect(() =>
      assertCapabilityKeyMatchesCatalogModule("md:shell:access", "master-data"),
    ).not.toThrow();
    expect(() =>
      assertCapabilityKeyMatchesCatalogModule("master-data:shell:access", "master-data"),
    ).not.toThrow();
    expect(() =>
      assertCapabilityKeyMatchesCatalogModule("cfg:shell:access", "configurator"),
    ).not.toThrow();
    expect(() =>
      assertCapabilityKeyMatchesCatalogModule("configurator:shell:access", "configurator"),
    ).not.toThrow();
  });

  it("validates foundational UM seed rows", () => {
    expect(() =>
      assertValidRuntimeCapabilityRow({
        capability_key: "um:user:create",
        module: "user-management",
        feature: "users",
        action: "create",
      }),
    ).not.toThrow();
  });

  it("validates demo shell capabilities with short runtime prefixes", () => {
    expect(() =>
      assertValidRuntimeCapabilityRow({
        capability_key: "md:shell:access",
        module: "master-data",
        feature: "shell",
        action: "access",
      }),
    ).not.toThrow();
    expect(() =>
      assertValidRuntimeCapabilityRow({
        capability_key: "cfg:shell:access",
        module: "configurator",
        feature: "shell",
        action: "access",
      }),
    ).not.toThrow();
    expect(() =>
      assertValidRuntimeCapabilityRow({
        capability_key: "fd:shell:access",
        module: "frontdesk",
        feature: "shell",
        action: "access",
      }),
    ).not.toThrow();
  });

  it("detects duplicate normalized capability keys", () => {
    expect(
      findDuplicateCapabilityKeys([
        { capability_key: "um:user:read" },
        { capability_key: "UM:user:read" },
      ]),
    ).toEqual(["um:user:read"]);
  });
});
