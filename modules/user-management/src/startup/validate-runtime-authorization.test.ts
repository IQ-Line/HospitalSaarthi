import { describe, expect, it } from "vitest";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import {
  formatRuntimeAuthorizationStartupFailure,
  validateRuntimeAuthorizationStartup,
} from "./validate-runtime-authorization.js";

describe("validateRuntimeAuthorizationStartup", () => {
  it("fails when required upstream URLs are missing", async () => {
    const result = await validateRuntimeAuthorizationStartup({
      configuratorUrl: "",
      masterDataUrl: "http://localhost:8010",
      capabilityRepository: new InMemoryCapabilityRepository(),
    });

    expect(result.ok).toBe(false);
    expect(formatRuntimeAuthorizationStartupFailure(result.diagnostics)).toContain(
      "CONFIGURATOR_URL",
    );
  });

  it("passes with valid platform slugs and capability catalog", async () => {
    const result = await validateRuntimeAuthorizationStartup({
      configuratorUrl: "http://localhost:3001",
      masterDataUrl: "http://localhost:8010",
      capabilityRepository: new InMemoryCapabilityRepository([
        {
          capability: {
            id: "f47ac10b-58cc-4372-a567-0e02b2c3d610",
            capability_key: "um:user:read",
            module: "user-management",
            feature: "users",
            action: "read",
            display_name: "Read users",
            description: null,
            is_active: true,
          },
        },
      ]),
    });

    expect(result.ok).toBe(true);
  });

  it("fails when capability_key vocabulary is invalid", async () => {
    const result = await validateRuntimeAuthorizationStartup({
      configuratorUrl: "http://localhost:3001",
      masterDataUrl: "http://localhost:8010",
      capabilityRepository: {
        async listCapabilities() {
          return [
            {
              id: "f47ac10b-58cc-4372-a567-0e02b2c3d699",
              capability_key: "not-a-valid-key",
              module: "user-management",
              feature: "users",
              action: "read",
              display_name: "Bad",
              description: null,
              is_active: true,
            },
          ];
        },
        async getCapabilityById() {
          return null;
        },
        async listCapabilitiesByIds() {
          return [];
        },
        async listCapabilitiesByKeys() {
          return [];
        },
        async listActiveRuntimeCapabilitiesByModuleSlugs() {
          return [];
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === "CAPABILITY_CATALOG_INVALID")).toBe(true);
  });
});
