import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { Principal } from "@hims/ts-sdk-identity";
import { authzPlugin } from "@hims/ts-sdk-authz";
import {
  createRouter,
  createEmpiAuthzTargetResolver,
  type PatientRepo,
  type AddressRepo,
  type IdentifierRepo,
  type SourceRecordRepo,
} from "@hims/empi";
import type { EventBus } from "@hims/ts-sdk-events";

// ---------------------------------------------------------------------------
// PROVES empi-svc's Cerbos PEP actually enforces (mirrors
// services/configurator-svc/test/integration/authz-pep-wiring.integration.test.ts).
//
// The pre-existing identity-authz-wiring.test.ts hand-builds stand-in routes and
// never registers authzPlugin, so deleting the authzPlugin registration in
// src/main.ts left every test green. This test closes that hole: it composes the
// REAL empi router + REAL createEmpiAuthzTargetResolver + REAL authzPlugin and
// asserts the capability decision reaches Cerbos and is honoured —
//   (a) 403 when the principal lacks empi:patient:read,
//   (b) 200 when the principal holds it,
//   (c) the onReady mapping-completeness probe passes for the real route surface.
//
// MUTATION-PROOF (d): dropping the `authzPlugin` registration in buildApp() makes
// case (a) return 200 (the handler runs unguarded) — verified once by commenting
// it out and watching this suite fail, then restored. That is exactly the mutation
// the old test could not catch.
//
// Cerbos itself is stubbed (no live PDP, CI-safe): the fake grants iff the
// principal's `capabilities` include `empi:<kind>:<action>` — the same
// capability the real empi policy gates on (infra/cerbos/policies/empi_*). It is
// the PEP *wiring* (resolver -> checkResource -> 403/allow) under test here; the
// policy logic itself is covered by infra/cerbos/tests/empi_permissions_test.yaml.
//
// Identity/enrichment are faked by name (fastify-plugin dependency contract) and
// inject a fixed principal — the real identity 401 gate is covered by
// identity-authz-wiring.test.ts; here we need an *authenticated* principal to
// exercise the authz decision, so we stand it in directly.
// ---------------------------------------------------------------------------

// The Cerbos gRPC client (packages/ts-sdk-authz/src/client.ts) constructs `new GRPC(...)`.
// Replace it with a capability-driven stub so no network/PDP is needed.
vi.mock("@cerbos/grpc", () => {
  class FakeGRPC {
    async checkResource(input: {
      principal: { attr?: Record<string, unknown> };
      resource: { kind: string };
      actions: string[];
    }): Promise<{ isAllowed: (action: string) => boolean }> {
      const attr = input.principal.attr ?? {};
      const held = new Set<string>([
        ...((attr["capabilities"] as string[] | undefined) ?? []),
        ...((attr["delegated_capabilities"] as string[] | undefined) ?? []),
      ]);
      const action = input.actions[0] ?? "";
      // Resolver emits actions like "patient.read"; the policy capability is
      // "empi:patient:read". Grant iff the principal holds that capability.
      const requiredCapability = `empi:${action.replace(/\./g, ":")}`;
      const allowed = held.has(requiredCapability);
      return { isAllowed: (a: string) => a === action && allowed };
    }
    async planResources(): Promise<never> {
      throw new Error("planResources not used in this test");
    }
    close(): void {
      /* no gRPC connection to close in the stub */
    }
  }
  return { GRPC: FakeGRPC };
});

const TENANT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PATIENT_ID = "11111111-1111-4111-8111-111111111111";

function principalWith(capabilities: string[]): Principal {
  return {
    userId: "00000000-0000-4000-8000-0000000000c1",
    tenantId: TENANT_ID,
    orgId: "",
    roles: ["frontdesk"],
    sessionId: "sess-1",
    iat: 0,
    exp: 0,
    iss: "https://test.issuer",
    capabilities,
    delegatedCapabilities: [],
    clearances: {},
    umClearanceEffectiveTier: 0,
  };
}

// Fake identity plugin: satisfies authzPlugin's fastify-plugin dependency on
// "@hims/ts-sdk-identity" AND injects the authenticated principal (matching main.ts's
// identity -> enricher -> authz ordering). The real identity gate is tested separately.
function fakeIdentityPlugin(principal: Principal) {
  return fp(
    async (app) => {
      app.decorateRequest("user", null as unknown as Principal);
      app.decorateRequest("tenantId", "");
      app.addHook("onRequest", async (request) => {
        request.user = principal;
        request.tenantId = principal.tenantId;
      });
    },
    { name: "@hims/ts-sdk-identity", fastify: "5.x" },
  );
}

// Fake enricher: satisfies authzPlugin's dependency on the principal-enrichment plugin.
const fakeEnricherPlugin = fp(
  async () => {
    /* no-op: present only to satisfy authzPlugin's dependency-by-name contract */
  },
  {
    name: "@hims/user-management-principal-enrichment",
    fastify: "5.x",
  },
);

const patient = {
  id: PATIENT_ID,
  iq_tenant_id: TENANT_ID,
  uhid: "2501011234500001",
  full_name: "Test Patient",
  first_name: "Test",
  last_name: "Patient",
  gender: "male",
  phone_number: "+919876500000",
  status: "active",
};

// Minimal fakes — only the methods the exercised route (GET /patients/:id -> getPatient)
// invokes are real; the rest are never called on the tested paths.
const patientRepo = {
  findById: async () => patient,
} as unknown as PatientRepo;
const addressRepo = { findByPatient: async () => [] } as unknown as AddressRepo;
const identifierRepo = { findByPatient: async () => [] } as unknown as IdentifierRepo;
const sourceRecordRepo = {} as unknown as SourceRecordRepo;
const eventBus = {
  publish: async () => {
    /* no-op: the exercised read path publishes no events */
  },
} as unknown as EventBus;

async function buildApp(principal: Principal): Promise<FastifyInstance> {
  const app = Fastify();

  const empiRouter = createRouter({
    patientRepo,
    addressRepo,
    identifierRepo,
    sourceRecordRepo,
    eventBus,
    allocatePatientUhid: async () => "2501011234500001",
  });

  await app.register(
    async (api) => {
      await api.register(fakeIdentityPlugin(principal));
      await api.register(fakeEnricherPlugin);
      // MUTATION POINT (d): comment out this authzPlugin registration and case (a)
      // returns 200 instead of 403 — the exact regression the old wiring test missed.
      await api.register(authzPlugin, {
        cerbosUrl: "localhost:3593",
        resolveTarget: createEmpiAuthzTargetResolver(),
      });
      await api.register(empiRouter);
    },
    { prefix: "/api/empi/v1" },
  );

  await app.ready();
  return app;
}

describe("empi-svc Cerbos PEP enforcement", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it("(c) boots: onReady mapping-completeness probe passes for the real empi route surface", async () => {
    const app = await buildApp(principalWith(["empi:patient:read"]));
    apps.push(app);
    expect(app.hasRoute({ method: "GET", url: "/api/empi/v1/patients/:id" })).toBe(true);
  });

  it("(a) 403 when the principal lacks empi:patient:read (PEP denies, handler never runs)", async () => {
    const app = await buildApp(principalWith([]));
    apps.push(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/empi/v1/patients/${PATIENT_ID}`,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("AUTHZ_FORBIDDEN");
  });

  it("(b) 200 when the principal holds empi:patient:read (PEP allows, route reached)", async () => {
    const app = await buildApp(principalWith(["empi:patient:read"]));
    apps.push(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/empi/v1/patients/${PATIENT_ID}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().patient.id).toBe(PATIENT_ID);
  });

  // Structural guard bound to the REAL src/main.ts: the composition test above proves the PEP
  // enforces, but it rebuilds the stack, so it would stay green if authzPlugin were deleted from
  // main.ts. This case closes that exact hole (the M1 concern) — matching on identifiers, not lines.
  it("main.ts registers authzPlugin with the empi resolver (guards the real composition)", () => {
    const mainPath = fileURLToPath(new URL("../../src/main.ts", import.meta.url));
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed path from import.meta.url
    const mainSrc = readFileSync(mainPath, "utf8");
    expect(mainSrc).toMatch(/register\(\s*authzPlugin/);
    expect(mainSrc).toMatch(/createEmpiAuthzTargetResolver\s*\(/);
  });

  it("delegated capability also grants (delegated_capabilities honoured by the wire)", async () => {
    const app = await buildApp({
      ...principalWith([]),
      delegatedCapabilities: ["empi:patient:read"],
    });
    apps.push(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/empi/v1/patients/${PATIENT_ID}`,
    });
    expect(res.statusCode).toBe(200);
  });
});
