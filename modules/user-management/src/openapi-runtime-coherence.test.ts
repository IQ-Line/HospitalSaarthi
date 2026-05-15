import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import fp from "fastify-plugin";
import { describe, expect, it } from "vitest";
import { unauthorized } from "@hims/ts-sdk-http";
import { identityPlugin } from "@hims/ts-sdk-identity";
import type {
  AssignRoleInput,
  Capability,
  CreateUserInput,
  ListUsersOptions,
  ReplaceRoleCapabilitiesInput,
  Role,
  RoleAssignment,
  RoleAssignmentRef,
  RoleAssignmentRepository,
  PrincipalRoleProjectionRepository,
  RoleCapabilityRepository,
  RoleRepository,
  UpdateUserInput,
  User,
  UserRepository,
  UserWithTenant,
} from "./ports/index.js";
import { userManagementPlugin } from "./router.js";
import { publishUserManagementEvent } from "./events/publish-user-management-event.js";
import { USER_MANAGEMENT_EVENT_ROLE_ASSIGNED } from "./events/constants.js";

class NoopRoleAssignmentRepository implements RoleAssignmentRepository {
  async assignRole(_tenantId: string, _input: AssignRoleInput): Promise<RoleAssignment> {
    throw new Error("not implemented");
  }
  async revokeRole(_tenantId: string, _input: AssignRoleInput): Promise<RoleAssignment | null> {
    return null;
  }
  async listAssignments(): Promise<RoleAssignmentRef[]> {
    return [];
  }
  async listAssignmentsByUser(_tenantId: string, _userId: string): Promise<RoleAssignmentRef[]> {
    return [];
  }
  async listAssignmentsByRole(_tenantId: string, _roleId: string): Promise<RoleAssignmentRef[]> {
    return [];
  }
  async listAssignmentsByTenant(
    _tenantId: string,
    _filter?: Readonly<{ userId?: string; roleId?: string }>,
  ): Promise<RoleAssignmentRef[]> {
    return [];
  }
}

class StubRoleRepository implements RoleRepository {
  async getRoleById(_tenantId: string, _roleId: string): Promise<Role | null> {
    return null;
  }
  async listRoles(_tenantId: string): Promise<Role[]> {
    return [];
  }
  async listRolesByIds(_tenantId: string, _roleIds: string[]): Promise<Role[]> {
    return [];
  }
  async createRole(): Promise<Role> {
    throw new Error("not implemented");
  }
  async updateRole(): Promise<Role | null> {
    return null;
  }
  async deleteRole(): Promise<Role | null> {
    return null;
  }
}

class StubCapabilityRepository {
  async getCapabilityById(): Promise<Capability | null> {
    return null;
  }
  async listCapabilities(): Promise<Capability[]> {
    return [];
  }
  async listCapabilitiesByIds(): Promise<Capability[]> {
    return [];
  }
  async listCapabilitiesByKeys(): Promise<Capability[]> {
    return [];
  }
}

class NoopRoleCapabilityRepository implements RoleCapabilityRepository {
  async listCapabilitiesByRole(): Promise<Capability[]> {
    return [];
  }
  async replaceCapabilitiesForRole(
    _tenantId: string,
    _roleId: string,
    _input: ReplaceRoleCapabilitiesInput,
  ): Promise<Capability[]> {
    return [];
  }
}

class NoopPrincipalRoleProjectionRepository implements PrincipalRoleProjectionRepository {
  async listRoleCodesByUser(): Promise<string[]> {
    return [];
  }
  clearCache(): void {}
}

const noopAuthAccountProvisioner = {
  async createPasswordAccount(input: { platformUserId: string }) {
    return { authUserId: input.platformUserId };
  },
};

class StubUserRepository implements UserRepository {
  async createUser(_tenantId: string, _input: CreateUserInput): Promise<User> {
    throw new Error("not implemented");
  }
  async getUserById(tenantId: string, userId: string): Promise<User | null> {
    if (tenantId !== "tenant-a" || userId !== "user-1") return null;
    return {
      id: "user-1",
      full_name: "User One",
      email: null,
      phone: null,
      username: null,
      org_id: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
      department: null,
      clearance_tier_required: 0,
      auth_user_id: null,
      status: "active",
    };
  }
  async findUserByGlobalId(): Promise<UserWithTenant | null> {
    return null;
  }
  async listUsers(_tenantId: string, _options?: ListUsersOptions): Promise<User[]> {
    return [];
  }
  async updateUser(
    _tenantId: string,
    _userId: string,
    _input: UpdateUserInput,
  ): Promise<User | null> {
    return null;
  }
}

const identityStubPlugin = fp(
  async (fastify) => {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    fastify.decorateRequest("user", null as unknown as {
      userId: string;
      tenantId: string;
      orgId: string;
      roles: string[];
      sessionId: string;
      iat: number;
      exp: number;
      iss: string;
    });
    fastify.addHook("onRequest", async (request) => {
      const inbound = request.headers["x-correlation-id"];
      request.correlationId =
        typeof inbound === "string" && uuidRe.test(inbound.trim())
          ? inbound.trim()
          : randomUUID();
      request.user = {
        userId: "user-1",
        tenantId: "tenant-a",
        orgId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
        roles: ["doctor"],
        sessionId: "session-1",
        iat: 1,
        exp: 9999999999,
        iss: "issuer",
      };
    });
  },
  { name: "@hims/ts-sdk-identity" },
);

const noopEventBus = {
  async connect() {},
  async disconnect() {},
  async publish() {},
  async subscribe() {
    return { async unsubscribe() {} };
  },
};

describe("OpenAPI/runtime coherence", () => {
  it("protected route without bearer token returns documented auth error structure", async () => {
    const app = Fastify();
    await app.register(identityPlugin, {
      jwksUrl: "http://localhost:3001/.well-known/jwks.json",
      issuer: "http://localhost:3001",
      audience: "hims-platform",
    });

    app.get("/protected", async () => ({ ok: true }));
    const response = await app.inject({ method: "GET", url: "/protected" });

    expect(response.statusCode).toBe(401);
    const body = response.json() as {
      code: string;
      message?: string;
      correlation_id?: string;
    };
    expect(body).toMatchObject({
      code: "AUTH_MISSING_BEARER",
      message: "Missing or malformed Authorization header",
      correlation_id: expect.any(String),
    });
    expect(body.correlation_id).toBeTruthy();
    expect(typeof response.headers["x-correlation-id"]).toBe("string");
    expect(response.headers["x-correlation-id"]).toBe(body.correlation_id);
    await app.close();
  });

  it("auth error body omits correlation_id when request context has no correlationId", async () => {
    const app = Fastify();
    app.get("/raw-unauthorized", async (_request, reply) => {
      unauthorized(reply, {}, "TEST_AUTH_CODE", "synthetic");
    });
    const response = await app.inject({ method: "GET", url: "/raw-unauthorized" });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "TEST_AUTH_CODE",
      message: "synthetic",
    });
    await app.close();
  });

  it("inbound x-correlation-id propagates unchanged to auth error response", async () => {
    const app = Fastify();
    await app.register(identityPlugin, {
      jwksUrl: "http://localhost:3001/.well-known/jwks.json",
      issuer: "http://localhost:3001",
      audience: "hims-platform",
    });

    app.get("/protected-correlation", async () => ({ ok: true }));
    const inboundCorrelation = "f47ac10b-58cc-4372-a567-0e02b2c3d499";
    const response = await app.inject({
      method: "GET",
      url: "/protected-correlation",
      headers: { "x-correlation-id": inboundCorrelation },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["x-correlation-id"]).toBe(inboundCorrelation);
    expect((response.json() as { correlation_id?: string }).correlation_id).toBe(
      inboundCorrelation,
    );
    await app.close();
  });

  it("malformed inbound correlation id is replaced deterministically", async () => {
    const app = Fastify();
    await app.register(identityPlugin, {
      jwksUrl: "http://localhost:3001/.well-known/jwks.json",
      issuer: "http://localhost:3001",
      audience: "hims-platform",
    });

    app.get("/protected-correlation", async () => ({ ok: true }));
    const response = await app.inject({
      method: "GET",
      url: "/protected-correlation",
      headers: { "x-correlation-id": "!!not-safe!!" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["x-correlation-id"]).not.toBe("!!not-safe!!");
    expect(response.headers["x-correlation-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(
      (response.json() as { correlation_id?: string }).correlation_id,
    ).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    await app.close();
  });

  it("generated correlation id is reused across event and error surfaces", async () => {
    const app = Fastify();
    const publishedEvents: Array<{ correlation_id: string }> = [];
    const eventBus = {
      async connect() {},
      async disconnect() {},
      async publish(event: { correlation_id: string }) {
        publishedEvents.push(event);
      },
      async subscribe() {
        return { async unsubscribe() {} };
      },
    };

    await app.register(identityStubPlugin);
    app.post("/correlation-check", async (request, reply) => {
      const correlationId = request.correlationId ?? request.id;
      await publishUserManagementEvent(
        { eventBus: eventBus as never },
        USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
        {
          tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
          actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
          correlationId,
        },
        {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d483",
          user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d484",
          role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d485",
        },
      );

      return reply.status(400).send({
        code: "BAD_REQUEST",
        message: "synthetic",
        correlation_id: correlationId,
      });
    });

    const response = await app.inject({
      method: "POST",
      url: "/correlation-check",
    });

    expect(response.statusCode).toBe(400);
    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]?.correlation_id).toBe(response.json().correlation_id);
    await app.close();
  });

  it("event publisher uses request-scoped correlation id", async () => {
    const app = Fastify();
    const publishedEvents: Array<{ correlation_id: string }> = [];
    const eventBus = {
      async connect() {},
      async disconnect() {},
      async publish(event: { correlation_id: string }) {
        publishedEvents.push(event);
      },
      async subscribe() {
        return { async unsubscribe() {} };
      },
    };

    await app.register(identityStubPlugin);
    app.post("/correlation-event", async (request) => {
      const correlationId = request.correlationId ?? request.id;
      await publishUserManagementEvent(
        { eventBus: eventBus as never },
        USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
        {
          tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
          actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
          correlationId,
        },
        {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d483",
          user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d484",
          role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d485",
        },
      );
      return { ok: true };
    });

    const inboundCorrelation = "f47ac10b-58cc-4372-a567-0e02b2c3d498";
    const response = await app.inject({
      method: "POST",
      url: "/correlation-event",
      headers: { "x-correlation-id": inboundCorrelation },
    });

    expect(response.statusCode).toBe(200);
    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]?.correlation_id).toBe(inboundCorrelation);
    await app.close();
  });

  it("tenant mismatch semantics are deterministic", async () => {
    const app = Fastify();
    await app.register(identityStubPlugin);
    await app.register(
      async (instance) => {
        await instance.register(userManagementPlugin, {
          eventBus: noopEventBus,
          userRepository: new StubUserRepository(),
          capabilityRepository: new StubCapabilityRepository(),
          roleRepository: new StubRoleRepository(),
          roleCapabilityRepository: new NoopRoleCapabilityRepository(),
          roleAssignmentRepository: new NoopRoleAssignmentRepository(),
          principalRoleProjectionRepository: new NoopPrincipalRoleProjectionRepository(),
          authAccountProvisioner: noopAuthAccountProvisioner,
        });
      },
      { prefix: "/api/user-management" },
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/user-management/auth/me",
      headers: { iq_tenant_id: "tenant-b" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({
        code: "TENANT_CONTEXT_MISMATCH",
      }),
    );
    const spec = await readFile(
      new URL("../../../specs/openapi/user-management.v1.yaml", import.meta.url),
      "utf8",
    );
    expect(spec).toContain("`iq_tenant_id` header");
    expect(spec).toContain("must exactly match the JWT tenant claim");
    await app.close();
  });

  it("runtime response matches representative OpenAPI user schema shape", async () => {
    const app = Fastify();
    await app.register(identityStubPlugin);
    await app.register(
      async (instance) => {
        await instance.register(userManagementPlugin, {
          eventBus: noopEventBus,
          userRepository: new StubUserRepository(),
          capabilityRepository: new StubCapabilityRepository(),
          roleRepository: new StubRoleRepository(),
          roleCapabilityRepository: new NoopRoleCapabilityRepository(),
          roleAssignmentRepository: new NoopRoleAssignmentRepository(),
          principalRoleProjectionRepository: new NoopPrincipalRoleProjectionRepository(),
          authAccountProvisioner: noopAuthAccountProvisioner,
        });
      },
      { prefix: "/api/user-management" },
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/user-management/auth/me",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "user-1",
        full_name: "User One",
        status: "active",
        email: null,
        phone: null,
      }),
    );
    await app.close();
  });

  it("documentation security matches runtime protected authMode routes", async () => {
    const spec = await readFile(
      new URL("../../../specs/openapi/user-management.v1.yaml", import.meta.url),
      "utf8",
    );
    expect(spec).toContain("security:");
    expect(spec).toContain("- bearerAuth: []");
    expect(spec).not.toContain("security: []");
    expect(spec).toContain("required: false");
    expect(spec).toContain("deprecated: true");

    const app = Fastify();
    const routes: Array<{ method: string; path: string; authMode?: string }> = [];
    app.addHook("onRoute", (route) => {
      routes.push({
        method: String(route.method),
        path: route.url,
        authMode: (route.config as { authMode?: string } | undefined)?.authMode,
      });
    });

    await app.register(identityStubPlugin);
    await app.register(
      async (instance) => {
        await instance.register(userManagementPlugin, {
          eventBus: noopEventBus,
          userRepository: new StubUserRepository(),
          capabilityRepository: new StubCapabilityRepository(),
          roleRepository: new StubRoleRepository(),
          roleCapabilityRepository: new NoopRoleCapabilityRepository(),
          roleAssignmentRepository: new NoopRoleAssignmentRepository(),
          principalRoleProjectionRepository: new NoopPrincipalRoleProjectionRepository(),
          authAccountProvisioner: noopAuthAccountProvisioner,
        });
      },
      { prefix: "/api/user-management" },
    );

    const openApiServerPrefix = "/api/user-management";
    const managedRoutes = routes.filter((route) => {
      const p = route.path.startsWith(openApiServerPrefix)
        ? route.path.slice(openApiServerPrefix.length) || "/"
        : route.path;
      return [
        "/auth/me",
        "/auth/principal",
        "/auth/permissions-map",
        "/capabilities",
        "/capabilities/:id",
        "/users",
        "/users/:id",
        "/users/:id/roles",
        "/users/:id/deactivate",
        "/roles",
        "/roles/:id",
        "/roles/:id/capabilities",
        "/role-assignments",
      ].includes(p);
    });
    expect(managedRoutes.length).toBeGreaterThan(0);
    for (const route of managedRoutes) {
      expect(route.authMode).toBe("protected");
    }

    await app.close();
  });
});
