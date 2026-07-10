import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import type { Principal } from "@hims/ts-sdk-identity";
import { buildCerbosPrincipalWire } from "../../src/principal-wire.js";

describe("buildCerbosPrincipalWire", () => {
  it("uses cerbosPrincipal snapshot attrs and merges roles", () => {
    const identity: Principal = {
      userId: "user-1",
      tenantId: "tenant-home",
      orgId: "org-1",
      roles: ["super-admin"],
      sessionId: "s1",
      iat: 1,
      exp: 9,
      iss: "issuer",
    };

    const request = {
      user: identity,
      cerbosPrincipal: {
        id: "user-1",
        roles: ["tenant-admin"],
        attributes: {
          iq_tenant_id: "tenant-home",
          capabilities: ["um:user:create", "um:role:assign"],
          delegated_capabilities: [],
          clearances: {},
          um_clearance_effective_tier: 0,
        },
      },
    } as unknown as FastifyRequest;

    const wire = buildCerbosPrincipalWire(request);
    expect(wire.attr.capabilities).toEqual(["um:user:create", "um:role:assign"]);
    expect(wire.attr.role_codes).toEqual(expect.arrayContaining(["super-admin", "tenant-admin"]));
    expect(wire.roles).toEqual(expect.arrayContaining(["super-admin", "tenant-admin"]));
  });
});
