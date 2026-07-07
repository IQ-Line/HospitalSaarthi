import type {
  CapabilityRepository,
  PlatformAdminRepository,
  PrincipalAuthorizationRepository,
  PrincipalRoleProjectionRepository,
  UserRepository,
} from "../ports/index.js";
import { HttpConfiguratorTenantModuleEntitlementAdapter } from "../adapters/http-configurator-tenant-module-entitlement-adapter.js";
import { HttpMasterDataModuleCatalogAdapter } from "../adapters/http-master-data-module-catalog-adapter.js";
import {
  createRuntimeEntitlementPrincipalWiring,
  type RuntimeEntitlementPrincipalWiring,
} from "./create-runtime-entitlement-principal-wiring.js";

export type CreatePepRuntimeAuthFromUrlsInput = {
  configuratorUrl: string;
  masterDataUrl: string;
  userRepository: UserRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
  principalAuthorizationRepository: PrincipalAuthorizationRepository;
  /** Optional bounded `scope:platform` membership source; when omitted the principal emits `scopes: []`. */
  platformAdminRepository?: PlatformAdminRepository;
  capabilityRepository: CapabilityRepository;
  log?: (event: Record<string, unknown>, message: string) => void;
  runtimeEntitlementIntersection?: boolean;
};

export type PepRuntimeAuthWiring = RuntimeEntitlementPrincipalWiring & {
  tenantModuleEntitlementPort: HttpConfiguratorTenantModuleEntitlementAdapter;
  masterDataModuleCatalogPort: HttpMasterDataModuleCatalogAdapter;
};

/**
 * Standard PEP wiring: HTTP entitlement adapters + cached resolver + principal service.
 */
export function createPepRuntimeAuthFromUrls(
  input: CreatePepRuntimeAuthFromUrlsInput,
): PepRuntimeAuthWiring {
  const tenantModuleEntitlementPort = new HttpConfiguratorTenantModuleEntitlementAdapter({
    baseUrl: input.configuratorUrl,
    log: input.log,
  });
  const masterDataModuleCatalogPort = new HttpMasterDataModuleCatalogAdapter({
    baseUrl: input.masterDataUrl,
    log: input.log,
  });

  const wiring = createRuntimeEntitlementPrincipalWiring({
    userRepository: input.userRepository,
    principalRoleProjectionRepository: input.principalRoleProjectionRepository,
    principalAuthorizationRepository: input.principalAuthorizationRepository,
    platformAdminRepository: input.platformAdminRepository,
    capabilityRepository: input.capabilityRepository,
    tenantModuleEntitlementPort,
    masterDataModuleCatalogPort,
    log: input.log,
    runtimeEntitlementIntersection: input.runtimeEntitlementIntersection,
  });

  return {
    ...wiring,
    tenantModuleEntitlementPort,
    masterDataModuleCatalogPort,
  };
}

export function requirePepUpstreamBaseUrl(envKey: string): string {
  const raw = process.env[envKey]?.trim();
  if (!raw || raw.length === 0) {
    throw new Error(
      `${envKey} is required for tenant module entitlements and Master Data module catalog integration`,
    );
  }
  // eslint-disable-next-line sonarjs/slow-regex -- single bounded quantifier anchored at end; not ReDoS
  return raw.replace(/\/+$/, "");
}
