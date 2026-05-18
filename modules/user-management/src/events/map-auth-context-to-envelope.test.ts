import { describe, expect, it } from "vitest";
import { mapAuthContextToEventEnvelope } from "./map-auth-context-to-envelope.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("mapAuthContextToEventEnvelope", () => {
  it("generates deterministic UUIDs for the same tenant and actor inputs", () => {
    const first = mapAuthContextToEventEnvelope({
      tenantId: "tenant-slug-1",
      actorId: "actor-slug-1",
    });
    const second = mapAuthContextToEventEnvelope({
      tenantId: "tenant-slug-1",
      actorId: "actor-slug-1",
    });

    expect(first).toEqual(second);
  });

  it("generates different IDs for different tenant or actor values", () => {
    const baseline = mapAuthContextToEventEnvelope({
      tenantId: "tenant-a",
      actorId: "actor-a",
    });
    const differentTenant = mapAuthContextToEventEnvelope({
      tenantId: "tenant-b",
      actorId: "actor-a",
    });
    const differentActor = mapAuthContextToEventEnvelope({
      tenantId: "tenant-a",
      actorId: "actor-b",
    });

    expect(baseline.iq_tenant_id).not.toBe(differentTenant.iq_tenant_id);
    expect(baseline.actor_id).not.toBe(differentActor.actor_id);
  });

  it("returns valid envelope shape and normalizes UUID inputs to lowercase", () => {
    const result = mapAuthContextToEventEnvelope({
      tenantId: "F47AC10B-58CC-4372-A567-0E02B2C3D480",
      actorId: "F47AC10B-58CC-4372-A567-0E02B2C3D481",
    });

    expect(Object.keys(result).sort()).toEqual(["actor_id", "iq_tenant_id"]);
    expect(result.iq_tenant_id).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d480");
    expect(result.actor_id).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d481");
    expect(UUID_RE.test(result.iq_tenant_id)).toBe(true);
    expect(UUID_RE.test(result.actor_id)).toBe(true);
  });
});
