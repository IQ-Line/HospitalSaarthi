/// <reference types="@fastify/sensible" />
import type { EventBus } from "@hims/ts-sdk-events";
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { AuthSessionRevokerPort } from "./ports/auth-session-revoker.js";
import type { AuthPasswordResetterPort } from "./ports/auth-password-resetter.js";
import type {
  AuthAccountProvisioner,
  CapabilityRepository,
  MasterDataModuleCatalogPort,
  PrincipalRoleProjectionRepository,
  RoleCapabilityRepository,
  RoleRepository,
  PrincipalAuthorizationRepository,
  AccessTokenIssuerPort,
  TenantEntitlementResolverPort,
  TenantModuleEntitlementPort,
  UserAccessRepository,
  UserRepository,
} from "./ports/index.js";
import type { CachedTenantEntitlementResolver } from "./services/cached-tenant-entitlement-resolver.js";
import { registerInternalEntitlementCacheHandlers } from "./rest-handlers/internal-entitlement-cache-handlers.js";
import { TenantMismatchError } from "./domain/errors.js";
import { replyWithUserManagementError } from "./http/map-user-management-error.js";
import {
  assertTenantHeaderAllowedForPrincipal,
  resolveEffectiveTenantId,
} from "./http/resolve-effective-tenant-id.js";
import { registerAuthHandlers } from "./rest-handlers/auth-handlers.js";
import { registerInternalDiagnosticsHandlers } from "./rest-handlers/internal-diagnostics-handlers.js";
import { registerRoleHandlers } from "./rest-handlers/role-handlers.js";
import { registerUserHandlers } from "./rest-handlers/user-handlers.js";
import { createDefaultRuntimeCapabilityCatalogPort } from "./services/default-runtime-capability-catalog-port.js";
import type { UserProvisioningRepository } from "./ports/user-provisioning-repository.js";

type RequestWithOptionalUser = FastifyRequest & { user?: unknown };

function pickNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Resolves tenant from identity (`iq_tenant_id` claim) or SDK Principal (`tenantId`). */
function resolveTenantIdFromRequestUser(user: unknown): string {
  return (user as { tenantId: string }).tenantId;
}

/** Resolves user id from identity (`sub` claim) or SDK Principal (`userId`). */
function resolveUserIdFromRequestUser(user: unknown): string | undefined {
  if (user == null || typeof user !== "object") return undefined;
  const u = user as Record<string, unknown>;
  return pickNonEmptyString(u["sub"]) ?? pickNonEmptyString(u["userId"]);
}

function defaultGetTenantId(request: FastifyRequest): string {
  return resolveTenantIdFromRequestUser((request as RequestWithOptionalUser).user);
}

function defaultGetUserId(request: FastifyRequest): string {
  const user = (request as RequestWithOptionalUser).user;
  if (user == null || typeof user !== "object") throw request.server.httpErrors.unauthorized();
  const userId = resolveUserIdFromRequestUser(user);
  if (userId === undefined) throw request.server.httpErrors.unauthorized();
  return userId;
}

export interface UserManagementPluginOptions {
  userRepository: UserRepository;
  userProvisioningRepository: UserProvisioningRepository;
  capabilityRepository: CapabilityRepository;
  roleRepository: RoleRepository;
  roleCapabilityRepository: RoleCapabilityRepository;
  userAccessRepository: UserAccessRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
  principalAuthorizationRepository: PrincipalAuthorizationRepository;
  authAccountProvisioner: AuthAccountProvisioner;
  eventBus: EventBus;
  tenantModuleEntitlementPort: TenantModuleEntitlementPort;
  masterDataModuleCatalogPort: MasterDataModuleCatalogPort;
  tenantEntitlementResolver?: TenantEntitlementResolverPort;
  runtimeEntitlementIntersection?: boolean;
  /** For Configurator → UM cache bust HTTP hook (`x-um-internal-key`). */
  internalEntitlementCacheApiKey?: string;
  accessTokenIssuer: AccessTokenIssuerPort;
  authSessionRevoker?: AuthSessionRevokerPort;
  /** better-auth credential reset for admin recovery Flow A; pairs with authSessionRevoker. */
  authPasswordResetter?: AuthPasswordResetterPort;
  getTenantId?: (request: FastifyRequest) => string;
  getUserId?: (request: FastifyRequest) => string;
}

const userManagementPluginImpl: FastifyPluginAsync<UserManagementPluginOptions> = async (
  fastify,
  options,
) => {
  const {
    userRepository,
    userProvisioningRepository,
    capabilityRepository,
    roleRepository,
    roleCapabilityRepository,
    userAccessRepository,
    principalRoleProjectionRepository,
    principalAuthorizationRepository,
    authAccountProvisioner,
    eventBus,
    tenantModuleEntitlementPort,
    masterDataModuleCatalogPort,
    tenantEntitlementResolver,
    runtimeEntitlementIntersection,
    internalEntitlementCacheApiKey,
    accessTokenIssuer,
  } = options;

  const getTenantId = options.getTenantId ?? ((request) => resolveEffectiveTenantId(request));
  const getUserId = options.getUserId ?? defaultGetUserId;
  const getActorId = getUserId;

  fastify.addHook("preHandler", async (request, reply) => {
    const authMode = (request.routeOptions?.config as { authMode?: string } | undefined)?.authMode;
    if (authMode === "public") {
      return;
    }

    const headerCheck = assertTenantHeaderAllowedForPrincipal(request);
    if (!headerCheck.ok) {
      return replyWithUserManagementError(
        reply,
        new TenantMismatchError(),
        request.correlationId ?? request.id,
      );
    }
  });

  registerUserHandlers(fastify, {
    getTenantId,
    getActorId,
    createUserDeps: {
      userRepository,
      userProvisioningRepository,
      capabilityRepository,
      roleRepository,
      roleCapabilityRepository,
      principalRoleProjectionRepository,
      authAccountProvisioner,
      eventBus,
      tenantModuleEntitlementPort,
      masterDataModuleCatalogPort,
    },
    applyRoleTemplateDeps: {
      userRepository,
      roleRepository,
      roleCapabilityRepository,
      userAccessRepository,
      principalRoleProjectionRepository,
      capabilityRepository,
      tenantModuleEntitlementPort,
      masterDataModuleCatalogPort,
    },
    detachRoleTemplateDeps: {
      userRepository,
      roleRepository,
      userAccessRepository,
      principalRoleProjectionRepository,
    },
    getUserDeps: { userRepository },
    getUserCapabilitiesDeps: { userRepository, userAccessRepository },
    getUserEffectiveCapabilitiesDeps: {
      userRepository,
      principalAuthorizationRepository,
      tenantEntitlementResolver,
      runtimeEntitlementIntersection,
    },
    listUserRolesDeps: { userRepository, userAccessRepository },
    listUsersAuthzDeps: { userRepository },
    replaceUserCapabilitiesDeps: {
      userRepository,
      capabilityRepository,
      userAccessRepository,
      tenantModuleEntitlementPort,
      masterDataModuleCatalogPort,
    },
    updateUserDeps: { userRepository, eventBus },
    deactivateUserDeps: {
      userRepository,
      eventBus,
      authSessionRevoker: options.authSessionRevoker,
    },
    activateUserDeps: { userRepository, eventBus },
    ...(options.authPasswordResetter && options.authSessionRevoker
      ? {
          resetUserPasswordDeps: {
            userRepository,
            authPasswordResetter: options.authPasswordResetter,
            authSessionRevoker: options.authSessionRevoker,
          },
        }
      : {}),
  });

  registerRoleHandlers(fastify, {
    getTenantId,
    getActorId,
    listCapabilitiesDeps: { capabilityRepository },
    listAssignableRuntimeCapabilitiesDeps: {
      capabilityRepository,
      tenantModuleEntitlementPort,
      masterDataModuleCatalogPort,
    },
    getCapabilityDeps: { capabilityRepository },
    listRolesDeps: { roleRepository },
    createRoleDeps: { roleRepository, eventBus },
    getRoleDeps: { roleRepository },
    updateRoleDeps: { roleRepository },
    deleteRoleDeps: { roleRepository },
    getRoleCapabilitiesDeps: { roleRepository, roleCapabilityRepository },
    replaceRoleCapabilitiesDeps: {
      roleRepository,
      capabilityRepository,
      roleCapabilityRepository,
      tenantModuleEntitlementPort,
      masterDataModuleCatalogPort,
    },
  });

  registerAuthHandlers(fastify, {
    getTenantId,
    getUserId,
    getUserDeps: { userRepository },
    validateUserApiKeyDeps: {
      userRepository,
      accessTokenIssuer,
    },
  });

  registerInternalDiagnosticsHandlers(fastify, {
    getTenantId,
    tenantModuleEntitlementPort,
    masterDataModuleCatalogPort,
    runtimeCapabilityCatalogPort: createDefaultRuntimeCapabilityCatalogPort({
      capabilityRepository,
      tenantModuleEntitlementPort,
      masterDataModuleCatalogPort,
    }),
  });

  if (
    tenantEntitlementResolver !== undefined &&
    "invalidateTenantEntitlementCache" in tenantEntitlementResolver
  ) {
    registerInternalEntitlementCacheHandlers(fastify, {
      tenantEntitlementResolver: tenantEntitlementResolver as CachedTenantEntitlementResolver,
      tenantModuleEntitlementPort: tenantModuleEntitlementPort as TenantModuleEntitlementPort & {
        invalidateTenantModuleCache?(tenantId?: string): void;
      },
      internalApiKey: internalEntitlementCacheApiKey,
    });
  }
};

export const userManagementPlugin = fp(userManagementPluginImpl, {
  fastify: "5.x",
  name: "@hims/user-management",
});
