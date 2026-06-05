/**
 * Phase 1A.12 — smoke: RS256 JWT (HLD-04 identity claims) → identity verify → authz stub → user.created event.
 */
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import sensible from "@fastify/sensible";
import { forbidden } from "@hims/ts-sdk-http";
import type { EventBus } from "@hims/ts-sdk-events";
import { identityPlugin } from "@hims/ts-sdk-identity";
import {
  InMemoryCapabilityRepository,
  InMemoryPrincipalAuthorizationRepository,
  InMemoryPrincipalRoleProjectionRepository,
  InMemoryRoleCapabilityRepository,
  InMemoryRoleRepository,
  InMemoryUserAccessRepository,
  InMemoryUserProvisioningRepository,
  InMemoryUserRepository,
  buildCerbosUserMgmtResourceAttr,
  createDefaultPrincipalService,
  principalRoleEnricherPlugin,
  userManagementPlugin,
} from "../../../modules/user-management/src/index.js";
import { createMasterDataModuleCatalogPortStub } from "../../../modules/user-management/src/test-support/master-data-catalog-port-stub.js";
import { NoopPartnerPrincipalRepository } from "../../../modules/user-management/src/test-support/noop-partner-principal-repository.js";
import type { CheckResult } from "@hims/ts-sdk-authz";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { createRemoteJWKSet, exportJWK, generateKeyPair, jwtVerify, SignJWT } from "jose";
import { describe, expect, it } from "vitest";

const SMOKE_JWKS_PATH = "/__smoke/jwks.json";
const SMOKE_KID = "smoke-rs256-1";

function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      s.close((err) => {
        if (err) reject(err);
        else if (addr && typeof addr === "object") resolve(addr.port);
        else reject(new Error("no port"));
      });
    });
  });
}

const authzSmokeStub = fp(
  async (fastify: FastifyInstance) => {
    fastify.addHook("onRequest", async (request: FastifyRequest) => {
      const principal = request.user;
      request.checkResource = async (kind: string, id: string, action: string) =>
        ({
          isAllowed: (a: string) => a === action && kind === "user" && id === "new",
        }) as CheckResult;
      request.planResources = async () => ({}) as never;
      void principal;
    });

    fastify.addHook("preHandler", async (request, reply) => {
      if (reply.sent) return;
      const authMode = (request.routeOptions?.config as { authMode?: string } | undefined)?.authMode;
      if (authMode === "public") return;

      const pattern = request.routeOptions?.url ?? "";
      const method = request.method;
      let target: {
        kind: string;
        id: string;
        action: string;
        attr?: ReturnType<typeof buildCerbosUserMgmtResourceAttr>;
      } | null = null;
      if (method === "POST" && pattern === "/users") {
        target = {
          kind: "user",
          id: "new",
          action: "user.create",
          attr: buildCerbosUserMgmtResourceAttr({
            iq_tenant_id: request.user.tenantId,
            department: request.user.department ?? null,
            required_clearance: 0,
          }),
        };
      }
      if (!target) return;

      const result = await request.checkResource(target.kind, target.id, target.action, target.attr);
      if (!result.isAllowed(target.action)) {
        forbidden(reply, request, "AUTHZ_FORBIDDEN", "Forbidden");
      }
    });
  },
  { name: "@hims/ts-sdk-authz", dependencies: ["@hims/ts-sdk-identity"] },
);

describe("Phase 1A.12 smoke", () => {
  it("create user via issued JWT → identity + authz → user.created with correlation_id", async () => {
    const port = await reservePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const issuer = `${baseUrl}`;
    const audience = "hims-platform";

    const { privateKey, publicKey } = await generateKeyPair("RS256", { modulusLength: 2048 });
    const publicJwk = await exportJWK(publicKey);
    publicJwk.kid = SMOKE_KID;
    publicJwk.alg = "RS256";
    publicJwk.use = "sig";

    const tenantId = "f47ac10b-58cc-4372-a567-0e02b2c3d480";
    const orgId = "f47ac10b-58cc-4372-a567-0e02b2c3d481";
    const actorId = "f47ac10b-58cc-4372-a567-0e02b2c3d482";

    const app = Fastify();
    const published: Array<{ correlation_id: string; event_type: string }> = [];
    const eventBus: EventBus = {
      async connect() {},
      async disconnect() {},
      async publish(event) {
        published.push({ correlation_id: event.correlation_id, event_type: event.event_type });
      },
      async subscribe() {
        return { async unsubscribe() {} };
      },
    };

    await app.register(sensible);
    app.get(SMOKE_JWKS_PATH, async (_request, reply) => {
      return reply.send({ keys: [publicJwk] });
    });
    await app.register(identityPlugin, {
      jwksUrl: `${issuer}${SMOKE_JWKS_PATH}`,
      issuer,
      audience,
      skipPathPrefixes: ["/__smoke"],
    });

    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId(tenantId, actorId, { full_name: "Smoke Actor" });
    const roleRepository = new InMemoryRoleRepository();
    const userAccessRepository = new InMemoryUserAccessRepository((currentTenantId, roleId) =>
      roleRepository.getRoleById(currentTenantId, roleId),
    );
    const principalRoleProjectionRepository = new InMemoryPrincipalRoleProjectionRepository(
      userAccessRepository,
      roleRepository,
    );

    const capabilityRepository = new InMemoryCapabilityRepository();
    const roleCapabilityRepository = new InMemoryRoleCapabilityRepository();
    const principalAuthorizationRepository = new InMemoryPrincipalAuthorizationRepository();
    const principalService = createDefaultPrincipalService({
      userRepository,
      principalRoleProjectionRepository,
      principalAuthorizationRepository,
    });

    await app.register(principalRoleEnricherPlugin, {
      principalService,
      userRepository,
    });
    await app.register(authzSmokeStub);
    await app.register(
      async (instance) => {
        await instance.register(userManagementPlugin, {
          eventBus,
          userRepository,
          userProvisioningRepository: new InMemoryUserProvisioningRepository(
            userRepository,
            userAccessRepository,
          ),
          capabilityRepository,
          roleRepository,
          roleCapabilityRepository,
          userAccessRepository,
          principalRoleProjectionRepository,
          principalAuthorizationRepository,
          authAccountProvisioner: {
            async createPasswordAccount(input) {
              return { authUserId: input.platformUserId };
            },
          },
          tenantModuleEntitlementPort: {
            async listTenantEnabledModuleIds() {
              return [];
            },
          },
          masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub(),
          partnerPrincipalRepository: new NoopPartnerPrincipalRepository(),
        });
      },
      { prefix: "/api/user-management" },
    );

    await app.listen({ port, host: "127.0.0.1" });

    try {
      const cid = "f47ac10b-58cc-4372-a567-0e02b2c3d499";
      const accessToken = await new SignJWT({
        iq_tenant_id: tenantId,
        org_id: orgId,
        roles: ["platform_admin"],
        jti: randomUUID(),
      })
        .setProtectedHeader({ alg: "RS256", kid: SMOKE_KID })
        .setSubject(actorId)
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(privateKey);

      const JWKS = createRemoteJWKSet(new URL(`${issuer}${SMOKE_JWKS_PATH}`));
      const { payload } = await jwtVerify(accessToken, JWKS, { issuer, audience });
      expect(payload.iq_tenant_id).toBe(tenantId);
      expect(typeof payload.jti).toBe("string");

      const createRes = await app.inject({
        method: "POST",
        url: "/api/user-management/users",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "x-correlation-id": cid,
        },
        payload: {
          full_name: "Smoke User",
          email: "smoke.user@example.com",
          password: "password123",
        },
      });
      expect(createRes.statusCode).toBe(201);

      expect(published.length).toBeGreaterThanOrEqual(1);
      const created = published.find((e) => e.event_type === "user-management.user.created");
      expect(created).toBeDefined();
      expect(created?.correlation_id).toBe(cid);
    } finally {
      await app.close();
    }
  });
});
