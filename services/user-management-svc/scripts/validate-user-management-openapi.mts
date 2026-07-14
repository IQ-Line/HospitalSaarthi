/**
 * Strict OpenAPI ↔ runtime coherence for User Management:
 * - OpenAPI document validates (SwaggerParser)
 * - every spec operation exists as a Fastify route under servers[0].url
 * - every Fastify route under that prefix is declared in the spec
 *
 * Lives under this package so `tsx` resolves `fastify` / workspace deps from
 * `services/user-management-svc/node_modules`.
 */
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fp from "fastify-plugin";
import SwaggerParser from "@apidevtools/swagger-parser";
import type {
  AppliedRoleTemplate,
  Capability,
  Role,
  PrincipalAuthorizationRepository,
  PrincipalRoleProjectionRepository,
  ReplaceRoleCapabilitiesInput,
  RoleCapabilityRepository,
  RoleRepository,
  UserAccessRepository,
  UserCapabilityGrant,
  User,
  UserRepository,
  UserWithTenant,
} from "@hims/user-management";
import { userManagementPlugin } from "@hims/user-management";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const specPath = join(repoRoot, "specs", "openapi", "user-management.v1.yaml");

function openapiPathToFastify(openapiPath: string): string {
  return openapiPath.replace(/\{([^}]+)\}/g, ":$1");
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"] as const;

function expectedOperationsFromSpec(api: Record<string, unknown>): Set<string> {
  const servers = api.servers as Array<{ url?: string }> | undefined;
  const base = (servers?.[0]?.url ?? "").replace(/\/+$/, "");
  const paths = api.paths as Record<string, Record<string, unknown>> | undefined;
  const expected = new Set<string>();
  if (!paths) {
    throw new Error("OpenAPI document has no paths");
  }
  for (const [path, pathItem] of Object.entries(paths)) {
    const fastPath = openapiPathToFastify(path);
    for (const method of HTTP_METHODS) {
      if (pathItem[method] !== undefined && pathItem[method] !== null) {
        expected.add(`${method.toUpperCase()} ${base}${fastPath}`);
      }
    }
  }
  return expected;
}

const identityStubPlugin = fp(
  async (fastify) => {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    fastify.decorateRequest(
      "user",
      null as unknown as {
        userId: string;
        tenantId: string;
        orgId: string;
        roles: string[];
        sessionId: string;
        iat: number;
        exp: number;
        iss: string;
      },
    );
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
  { name: "@hims/ts-sdk-identity-stub" },
);

class NoopUserAccessRepository implements UserAccessRepository {
  async applyRoleTemplate(): Promise<AppliedRoleTemplate> {
    throw new Error("not implemented");
  }
  async detachRoleTemplate(): Promise<AppliedRoleTemplate | null> {
    return null;
  }
  async listRoleTemplatesByUser(): Promise<AppliedRoleTemplate[]> {
    return [];
  }
  async listActiveCapabilityGrantsByUser(): Promise<UserCapabilityGrant[]> {
    return [];
  }
  async replaceManualCapabilityGrants(): Promise<UserCapabilityGrant[]> {
    return [];
  }
}

class StubRoleRepository implements RoleRepository {
  async getRoleById(): Promise<Role | null> {
    return null;
  }
  async listRoles(): Promise<Role[]> {
    return [];
  }
  async listRolesByIds(): Promise<Role[]> {
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
  async listActiveRuntimeCapabilitiesByModuleSlugs(): Promise<Capability[]> {
    return [];
  }
}

const noopTenantModuleEntitlementPort = {
  async listTenantEnabledModuleIds(): Promise<string[]> {
    return [];
  },
};

const noopMasterDataModuleCatalogPort = {
  async resolveModuleSlugsByIds(): Promise<Map<string, string>> {
    return new Map();
  },
  async resolveModuleKindBySlugs(): Promise<Map<string, string>> {
    return new Map();
  },
  async expandEnabledModuleSlugs(moduleSlugs: readonly string[]): Promise<readonly string[]> {
    return moduleSlugs;
  },
  async listActiveModulePermissionSourcePairs(): Promise<ReadonlySet<string>> {
    return new Set();
  },
};

const noopDepartmentCatalogPort = {
  async resolveDepartmentName(): Promise<string | null> {
    return null;
  },
};

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

class NoopPrincipalAuthorizationRepository implements PrincipalAuthorizationRepository {
  async listEffectiveCapabilityKeys(): Promise<string[]> {
    return [];
  }
  async getClearanceLevels(): Promise<Record<string, string>> {
    return {};
  }
  async listDelegatedCapabilityKeys(): Promise<string[]> {
    return [];
  }
}

class StubUserRepository implements UserRepository {
  async createUser(): Promise<User> {
    throw new Error("not implemented");
  }
  async getUserById(): Promise<User | null> {
    return null;
  }
  async findUserByGlobalId(): Promise<UserWithTenant | null> {
    return null;
  }
  async listUsers(): Promise<User[]> {
    return [];
  }
  async updateUser(): Promise<User | null> {
    return null;
  }
}

const noopEventBus = {
  async connect() {},
  async disconnect() {},
  async publish() {},
  async subscribe() {
    return { async unsubscribe() {} };
  },
};

async function main(): Promise<void> {
  await SwaggerParser.validate(specPath);
  const parsed = (await SwaggerParser.parse(specPath)) as Record<string, unknown>;
  const expected = expectedOperationsFromSpec(parsed);

  const app = Fastify({ logger: false });
  const collected = new Set<string>();

  app.addHook("onRoute", (route) => {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    // Fastify 5: `route.url` is already the absolute path (includes any encapsulation prefix).
    const fullPath = (route.url ?? "").replace(/\/{2,}/g, "/");
    for (const m of methods) {
      collected.add(`${String(m).toUpperCase()} ${fullPath}`);
    }
  });

  await app.register(identityStubPlugin);
  await app.register(
    async (instance) => {
      await instance.register(userManagementPlugin, {
        eventBus: noopEventBus as never,
        userRepository: new StubUserRepository(),
        userProvisioningRepository: {
          async provisionUserWithAccess() {
            throw new Error("USER_PROVISIONING_NOT_IMPLEMENTED");
          },
        },
        pharmacyStoreAssignmentRepository: {
          async getForUser() {
            return { primary_store_id: null, secondary_store_ids: [] };
          },
          async replaceForUser() {
            return { primary_store_id: null, secondary_store_ids: [] };
          },
          async clearForUser() {},
        },
        capabilityRepository: new StubCapabilityRepository(),
        roleRepository: new StubRoleRepository(),
        roleCapabilityRepository: new NoopRoleCapabilityRepository(),
        userAccessRepository: new NoopUserAccessRepository(),
        principalRoleProjectionRepository: new NoopPrincipalRoleProjectionRepository(),
        principalAuthorizationRepository: new NoopPrincipalAuthorizationRepository(),
        authAccountProvisioner: {
          async createPasswordAccount(input: { platformUserId: string }) {
            return { authUserId: input.platformUserId };
          },
        },
        authPasswordAdmin: {
          async setUserPassword() {},
          async revokeUserSessions() {},
        },
        tenantModuleEntitlementPort: noopTenantModuleEntitlementPort,
        masterDataModuleCatalogPort: noopMasterDataModuleCatalogPort,
        departmentCatalogPort: noopDepartmentCatalogPort,
      });
    },
    { prefix: "/api/user-management" },
  );

  await app.ready();

  const base = ((parsed.servers as Array<{ url?: string }> | undefined)?.[0]?.url ?? "").replace(
    /\/+$/,
    "",
  );
  const runtimeUm = [...collected].filter((r) => {
    const idx = r.indexOf(" ");
    const path = idx >= 0 ? r.slice(idx + 1) : r;
    return path.startsWith(base);
  });

  const runtimeSet = new Set(
    runtimeUm.filter((r) => {
      const method = r.split(" ")[0] ?? "";
      return method !== "HEAD" && method !== "OPTIONS" && method !== "TRACE";
    }),
  );

  const missingInRuntime = [...expected].filter((e) => !runtimeSet.has(e));
  const extraInRuntime = [...runtimeSet].filter((r) => !expected.has(r));

  if (missingInRuntime.length > 0 || extraInRuntime.length > 0) {
    console.error("OpenAPI / runtime mismatch");
    if (missingInRuntime.length) {
      console.error("Operations in OpenAPI but missing in runtime:", missingInRuntime);
    }
    if (extraInRuntime.length) {
      console.error("Runtime routes not declared in OpenAPI:", extraInRuntime);
    }
    process.exit(1);
  }

  console.log(`OK: ${expected.size} OpenAPI operations match runtime routes under ${base}`);
}

await main();
