import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import fp from "fastify-plugin";
import { describe, expect, it } from "vitest";
import { identityPlugin } from "@hims/ts-sdk-identity";
import type {
  AssignRoleInput,
  CreateUserInput,
  Role,
  RoleAssignment,
  RoleAssignmentRef,
  RoleAssignmentRepository,
  PrincipalRoleProjectionRepository,
  RoleRepository,
  UpdateUserInput,
  User,
  UserRepository,
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
}

class StubRoleRepository implements RoleRepository {
  async getRoleById(_tenantId: string, _roleId: string): Promise<Role | null> {
    return null;
  }
}

class NoopPrincipalRoleProjectionRepository implements PrincipalRoleProjectionRepository {
  async listRoleCodesByUser(): Promise<string[]> {
    return [];
  }
  clearCache(): void {}
}

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
      org_id: "org-1",
      auth_user_id: null,
      status: "active",
    };
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
        orgId: "org-1",
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
    expect(response.json()).toEqual(
      expect.objectContaining({
        code: "AUTH_MISSING_BEARER",
        message: "Missing or malformed Authorization header",
      }),
    );
    expect(typeof response.json().correlation_id).toBe("string");
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
    expect(response.json().correlation_id).toBe(inboundCorrelation);
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
    expect(response.json().correlation_id).not.toBe("!!not-safe!!");
    expect(response.json().correlation_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
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
    await app.register(userManagementPlugin, {
      eventBus: noopEventBus,
      userRepository: new StubUserRepository(),
      roleRepository: new StubRoleRepository(),
      roleAssignmentRepository: new NoopRoleAssignmentRepository(),
      principalRoleProjectionRepository: new NoopPrincipalRoleProjectionRepository(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
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
    await app.register(userManagementPlugin, {
      eventBus: noopEventBus,
      userRepository: new StubUserRepository(),
      roleRepository: new StubRoleRepository(),
      roleAssignmentRepository: new NoopRoleAssignmentRepository(),
      principalRoleProjectionRepository: new NoopPrincipalRoleProjectionRepository(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
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
    await app.register(userManagementPlugin, {
      eventBus: noopEventBus,
      userRepository: new StubUserRepository(),
      roleRepository: new StubRoleRepository(),
      roleAssignmentRepository: new NoopRoleAssignmentRepository(),
      principalRoleProjectionRepository: new NoopPrincipalRoleProjectionRepository(),
    });

    const managedRoutes = routes.filter((route) =>
      ["/auth/me", "/auth/principal", "/users", "/users/:id", "/role-assignments"].includes(
        route.path,
      ),
    );
    expect(managedRoutes.length).toBeGreaterThan(0);
    for (const route of managedRoutes) {
      expect(route.authMode).toBe("protected");
    }

    await app.close();
  });
});
