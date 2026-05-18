import type { Capability } from "../domain/types.js";
import type { ModuleEntitlementRequestContext } from "./module-integration-ports.js";

/**
 * Future one-way sync: Master Data `permissions` are source definitions;
 * User Management `capabilities` are the runtime Cerbos PDP vocabulary.
 * Runtime authorization MUST NOT query MD permissions directly — sync is MD → UM only.
 */
export interface CapabilityCatalogSyncPort {
  syncFromMasterDataCatalog(
    request: CapabilityCatalogSyncRequest,
  ): Promise<CapabilityCatalogSyncResult>;
}

export type CapabilityCatalogSyncRequest = {
  correlationId: string;
  /** When set, limit sync to these MD module slugs; otherwise platform-defined scope. */
  moduleSlugs?: string[];
};

export type CapabilityCatalogSyncResult = {
  inserted: number;
  updated: number;
  deactivated: number;
};

/**
 * Read-only runtime capability catalog for PDP vocabulary (UM DB authority).
 */
export interface RuntimeCapabilityCatalogPort {
  listRuntimeCatalog(): Promise<Capability[]>;
  listAssignableForTenant(
    tenantId: string,
    context?: ModuleEntitlementRequestContext,
  ): Promise<Capability[]>;
}
