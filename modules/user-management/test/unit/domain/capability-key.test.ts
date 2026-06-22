import { describe, expect, it } from "vitest";
import { InvalidCapabilityKeyError } from "../../../src/domain/errors.js";
import {
  assertCapabilityKeyMatchesCatalogModule,
  assertValidCapabilityKey,
  assertValidRuntimeCapabilityRow,
  findDuplicateCapabilityKeys,
  normalizeCapabilityKey,
  parseCapabilityKey,
  runtimeModuleKeyForCatalogSlug,
} from "../../../src/domain/capability-key.js";

describe("capability-key", () => {
  it("parses canonical three-segment keys", () => {
    expect(parseCapabilityKey("users:users:create")).toEqual({
      moduleKey: "users",
      resource: "users",
      action: "create",
      raw: "users:users:create",
    });
  });

  it("normalizes to lowercase", () => {
    expect(normalizeCapabilityKey("  Users:Users:READ  ")).toBe("users:users:read");
  });

  it("rejects malformed keys", () => {
    expect(() => assertValidCapabilityKey("users:users")).toThrow(InvalidCapabilityKeyError);
    expect(() => assertValidCapabilityKey("users:users:create:extra")).toThrow(
      InvalidCapabilityKeyError,
    );
    expect(() => assertValidCapabilityKey("users:us er:read")).toThrow(InvalidCapabilityKeyError);
    expect(() => assertValidCapabilityKey("bad segment:users:read")).toThrow(
      InvalidCapabilityKeyError,
    );
    expect(() => assertValidCapabilityKey("users:users:invalid-action")).toThrow(
      InvalidCapabilityKeyError,
    );
  });

  it("uses catalog module slug as runtime module key", () => {
    expect(runtimeModuleKeyForCatalogSlug("user-management")).toBe("user-management");
    expect(runtimeModuleKeyForCatalogSlug("users")).toBe("users");
    expect(runtimeModuleKeyForCatalogSlug("visitpad-master")).toBe("visitpad-master");
  });

  it("asserts capability_key module segment matches catalog module slug", () => {
    expect(() =>
      assertCapabilityKeyMatchesCatalogModule("billing:user:read", "users"),
    ).toThrow(InvalidCapabilityKeyError);
    expect(() =>
      assertCapabilityKeyMatchesCatalogModule("users:users:read", "users"),
    ).not.toThrow();
    expect(() =>
      assertCapabilityKeyMatchesCatalogModule("master-data:shell:access", "master-data"),
    ).not.toThrow();
  });

  it("validates synced catalog rows", () => {
    expect(() =>
      assertValidRuntimeCapabilityRow({
        capability_key: "users:users:create",
        module: "users",
        feature: "users",
        action: "create",
      }),
    ).not.toThrow();
  });

  it("validates demo shell capabilities", () => {
    expect(() =>
      assertValidRuntimeCapabilityRow({
        capability_key: "master-data:shell:access",
        module: "master-data",
        feature: "shell",
        action: "access",
      }),
    ).not.toThrow();
    expect(() =>
      assertValidRuntimeCapabilityRow({
        capability_key: "configurator:shell:access",
        module: "configurator",
        feature: "shell",
        action: "access",
      }),
    ).not.toThrow();
  });

  it("detects duplicate normalized capability keys", () => {
    expect(
      findDuplicateCapabilityKeys([
        { capability_key: "users:users:read" },
        { capability_key: "Users:users:read" },
      ]),
    ).toEqual(["users:users:read"]);
  });
});
