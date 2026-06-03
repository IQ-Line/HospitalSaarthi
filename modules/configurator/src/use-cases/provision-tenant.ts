import { randomUUID } from "node:crypto";
import type { DomainEvent, EventBus } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";
import { ConfiguratorError } from "../errors.js";
import type {
  OrganizationRepo,
  TenantRepo,
  TenantModuleRepo,
  ModuleCapabilityResolverPort,
  InfrastructureModuleCatalogPort,
  TenantAdminProvisioningPort,
  RunConfiguratorTransaction,
} from "../ports.js";
import type {
  ProvisionTenantInput,
  ProvisionTenantResult,
} from "../domain/onboarding.types.js";
import {
  TENANT_ADMIN_ROLE_CODE,
  TENANT_ADMIN_ROLE_TYPE,
  TENANT_ADMIN_ROLE_DISPLAY_NAME,
} from "../domain/onboarding.types.js";
import { buildTenantCerbosScopeKey } from "../domain/tenant-cerbos-scope.js";
import { createOrganization } from "./create-organization.js";
import { createTenant } from "./create-tenant.js";
import { createTenantModule } from "./create-tenant-module.js";
import { updateTenant } from "./update-tenant.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TENANT_ONBOARDING_COMPLETED_EVENT =
  "tenant-onboarding.provisioning.completed" as const;

export const TENANT_ONBOARDING_EVENT_CONTRACT_VERSION = "1.0.0";

export interface ProvisionTenantDeps {
  runConfiguratorTransaction: RunConfiguratorTransaction;
  infrastructureCatalog: InfrastructureModuleCatalogPort;
  moduleCapabilityResolver: ModuleCapabilityResolverPort;
  adminProvisioner: TenantAdminProvisioningPort;
  eventBus: EventBus;
}

export interface ProvisionTenantContext {
  actorId: string;
  correlationId: string;
}

/**
 * Single orchestration entrypoint for tenant onboarding.
 *
 * Sequence:
 *   A. Validate input
 *   B. Pre-transaction checks (slug uniqueness, email availability)
 *   C. Resolve module capabilities
 *   D. Prepare auth account (defers to provisionUser in HTTP adapter)
 *   E. DB transaction: org → tenant → tenant_modules (commit so data is visible)
 *   F. Post-commit: role → capabilities → user via HTTP (needs committed data)
 *   G. DB update: promote tenant to "active"
 *   H. Publish onboarding completed event
 */
export async function provisionTenant(
  deps: ProvisionTenantDeps,
  ctx: ProvisionTenantContext,
  input: ProvisionTenantInput,
): Promise<ProvisionTenantResult> {
  // --- A. Validate input ---------------------------------------------------
  validateInput(input);

  const productModuleIds = deduplicateModuleIds(input.modules);
  const adminFullName =
    `${input.admin.first_name.trim()} ${input.admin.last_name.trim()}`.trim();
  const adminEmail = input.admin.email.trim().toLowerCase();
  const adminUserId = randomUUID();

  // --- A2. Auto-enable infrastructure modules -----------------------------
  // Must run BEFORE auth account creation so no orphaned entities on failure.
  const infraModuleIds =
    await deps.infrastructureCatalog.fetchInfrastructureModuleIds();
  const infraIdSet = new Set(infraModuleIds);
  const moduleIds = mergeModuleIds(infraModuleIds, productModuleIds);

  if (moduleIds.length === 0) {
    throw new ConfiguratorError(
      422,
      "No modules available for tenant — infrastructure catalog returned empty and no product modules selected",
      "NO_MODULES_AVAILABLE",
    );
  }

  // --- B. Pre-transaction checks -------------------------------------------
  await deps.adminProvisioner.checkEmailAvailability(adminEmail);

  // --- C. Prepare auth account (deferred to provisionUser in HTTP adapter) -
  const authAccount = await deps.adminProvisioner.createAuthAccount({
    platformUserId: adminUserId,
    tenantId: "pending",
    fullName: adminFullName,
    email: adminEmail,
    password: input.admin.password,
  });

  // --- D. DB transaction: org + tenant + modules (COMMIT) ------------------
  // Must commit BEFORE capability resolution and HTTP calls because the
  // entitlement check calls back to configurator to verify tenant modules.
  const coreData = await deps.runConfiguratorTransaction(async (repos) => {
    return createCoreEntities(repos, ctx, input, moduleIds, infraIdSet, adminEmail);
  });

  // --- E. Resolve capabilities using committed tenant data -----------------
  // Uses /capabilities/assignable scoped to the new tenant so the result
  // matches exactly what the entitlement check will accept.
  const resolvedCapabilityIds =
    await deps.moduleCapabilityResolver.resolveCapabilityIdsForModules(
      moduleIds,
      coreData.tenant.iq_tenant_id,
    );

  // --- F. Post-commit: role + capabilities + user via HTTP -----------------
  // These run against committed data so entitlement checks can see modules.
  let adminRole: { id: string; code: string; display_name: string; is_system: boolean };
  let adminUser: { id: string; email: string; full_name: string };
  try {
    adminRole = await deps.adminProvisioner.createSystemRole(
      coreData.tenant.iq_tenant_id,
      {
        code: TENANT_ADMIN_ROLE_CODE,
        role_type: TENANT_ADMIN_ROLE_TYPE,
        display_name: TENANT_ADMIN_ROLE_DISPLAY_NAME,
        is_system: true,
      },
    );

    if (resolvedCapabilityIds.length > 0) {
      await deps.adminProvisioner.replaceRoleCapabilities(
        coreData.tenant.iq_tenant_id,
        adminRole.id,
        resolvedCapabilityIds,
      );
    }

    adminUser = await deps.adminProvisioner.provisionUser(
      coreData.tenant.iq_tenant_id,
      {
        userId: adminUserId,
        fullName: adminFullName,
        email: adminEmail,
        phone: input.admin.phone?.trim() || null,
        username: input.admin.username?.trim() || null,
        orgId: coreData.organization.id,
        authUserId: authAccount.authUserId,
        roleId: adminRole.id,
        roleCapabilityIds: resolvedCapabilityIds,
        actorId: ctx.actorId,
      },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      "[tenant-onboarding] User-management provisioning failed after DB commit. " +
        "Tenant %s is in 'provisioning' state and needs manual cleanup. " +
        "Correlation: %s",
      coreData.tenant.iq_tenant_id,
      ctx.correlationId,
    );
    throw error;
  }

  // --- G. Promote tenant to active -----------------------------------------
  await deps.runConfiguratorTransaction(async (repos) => {
    await updateTenant(
      repos.tenantRepo,
      repos.organizationRepo,
      coreData.tenant.iq_tenant_id,
      { provisioning_status: "active" },
    );
  });

  const result: ProvisionTenantResult = {
    organization: coreData.organization,
    tenant: {
      ...coreData.tenant,
      provisioning_status: "active",
    },
    tenant_modules: coreData.tenantModules,
    admin_role: {
      id: adminRole.id,
      code: adminRole.code,
      display_name: adminRole.display_name,
      is_system: adminRole.is_system,
    },
    admin_user: {
      id: adminUser.id,
      email: adminUser.email,
      full_name: adminUser.full_name,
    },
    provisioning_status: "completed",
    correlation_id: ctx.correlationId,
  };

  // --- H. Publish event (best-effort, must not fail the API) ---------------
  try {
    await publishOnboardingCompletedEvent(
      deps.eventBus,
      ctx,
      result,
      moduleIds,
      input.plan?.slug ?? "branch",
    );
  } catch {
    // eslint-disable-next-line no-console
    console.error(
      "[tenant-onboarding] Failed to publish onboarding completed event. " +
        "Correlation: %s, tenant: %s",
      ctx.correlationId,
      result.tenant.iq_tenant_id,
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Phase E: Core DB entities (committed before HTTP calls)
// ---------------------------------------------------------------------------

interface CoreProvisioningData {
  organization: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
  };
  tenant: {
    iq_tenant_id: string;
    org_id: string;
    name: string;
    slug: string;
    provisioning_status: string;
  };
  tenantModules: Array<{
    iq_tenant_id: string;
    module_id: string;
    is_active: boolean;
  }>;
}

async function createCoreEntities(
  repos: {
    organizationRepo: OrganizationRepo;
    tenantRepo: TenantRepo;
    tenantModuleRepo: TenantModuleRepo;
  },
  ctx: ProvisionTenantContext,
  input: ProvisionTenantInput,
  moduleIds: string[],
  infraModuleIds: ReadonlySet<string>,
  adminEmail: string,
): Promise<CoreProvisioningData> {
  const existingOrgId = input.organization.id?.trim();
  let organization;

  if (existingOrgId) {
    const existing = await repos.organizationRepo.findById(existingOrgId);
    if (!existing) {
      throw new ConfiguratorError(400, "organization not found", "VALIDATION_ERROR");
    }
    if (existing.type === "standalone_hospital") {
      const existingTenants = await repos.tenantRepo.findByOrgId(existingOrgId);
      if (existingTenants.length > 0) {
        throw new ConfiguratorError(
          409,
          "This standalone hospital organisation already has a tenant",
          "STANDALONE_ORG_TENANT_EXISTS",
        );
      }
    }
    organization = existing;
  } else {
    const orgContactEmail = input.organization.contact_email?.trim() || null;
    const orgWebsite = input.organization.website?.trim() || null;
    organization = await createOrganization(repos.organizationRepo, {
      name: input.organization.name!,
      slug: input.organization.slug!,
      type: input.organization.type!,
      status: "active",
      contact_email: orgContactEmail,
      website: orgWebsite,
      metadata: buildOrganizationMetadata(input),
      created_by: ctx.actorId,
    });
  }

  const tenantMetadata = {
    ...(organization.metadata ?? {}),
    ...(input.tenant.metadata ?? {}),
  };

  const tenantSlug = input.tenant.slug.trim().toLowerCase();

  const tenant = await createTenant(repos.tenantRepo, repos.organizationRepo, {
    org_id: organization.id,
    parent_tenant_id: input.tenant.parent_tenant_id?.trim() || null,
    name: input.tenant.name.trim(),
    slug: tenantSlug,
    type: (input.tenant.type?.trim() || "full_platform") as import("../domain/tenant.types.js").TenantType,
    data_isolation_level: "shared",
    cerbos_scope_key: buildTenantCerbosScopeKey(organization.id, tenantSlug),
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    metadata: tenantMetadata,
    branch_code: input.tenant.branch_code?.trim() || null,
    branch_type: (input.tenant.branch_type?.trim() || null) as import("../domain/tenant.types.js").BranchType | null,
    address_line1: input.tenant.address_line1?.trim() || null,
    city: input.tenant.city?.trim() || null,
    state: input.tenant.state?.trim() || null,
    pin_code: input.tenant.pin_code?.trim() || null,
    contact_phone: input.tenant.contact_phone?.trim() || null,
    contact_email: input.tenant.contact_email?.trim() || null,
    created_by: ctx.actorId,
  });

  const seen = new Set<string>();
  const tenantModules: CoreProvisioningData["tenantModules"] = [];
  for (const moduleId of moduleIds) {
    if (seen.has(moduleId)) continue;
    seen.add(moduleId);
    const isCoreOverride = infraModuleIds.has(moduleId);
    const tm = await createTenantModule(repos.tenantModuleRepo, repos.tenantRepo, {
      iq_tenant_id: tenant.iq_tenant_id,
      module_id: moduleId,
      is_active: true,
      is_core_override: isCoreOverride,
      created_by: ctx.actorId,
    });
    tenantModules.push({
      iq_tenant_id: tm.iq_tenant_id,
      module_id: tm.module_id,
      is_active: tm.is_active,
    });
  }

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
      status: organization.status,
    },
    tenant: {
      iq_tenant_id: tenant.iq_tenant_id,
      org_id: tenant.org_id,
      name: tenant.name,
      slug: tenant.slug,
      provisioning_status: "provisioning",
    },
    tenantModules,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateInput(input: ProvisionTenantInput): void {
  const existingOrgId = input.organization.id?.trim();
  const orgName = input.organization.name?.trim();
  const orgSlug = input.organization.slug?.trim();
  if (!existingOrgId) {
    if (!orgName) {
      throw new ConfiguratorError(400, "organization.name is required", "VALIDATION_ERROR");
    }
    if (!orgSlug || orgSlug.length < 3) {
      throw new ConfiguratorError(
        400,
        "organization.slug must be at least 3 characters",
        "VALIDATION_ERROR",
      );
    }
    if (!input.organization.type) {
      throw new ConfiguratorError(400, "organization.type is required", "VALIDATION_ERROR");
    }
  }
  const tenantName = input.tenant?.name?.trim();
  const tenantSlug = input.tenant?.slug?.trim();
  if (!tenantName) {
    throw new ConfiguratorError(400, "tenant.name is required", "VALIDATION_ERROR");
  }
  if (!tenantSlug || tenantSlug.length < 3) {
    throw new ConfiguratorError(
      400,
      "tenant.slug must be at least 3 characters",
      "VALIDATION_ERROR",
    );
  }
  const orgContactEmail = input.organization.contact_email?.trim();
  if (orgContactEmail && !EMAIL_RE.test(orgContactEmail)) {
    throw new ConfiguratorError(
      400,
      "organization.contact_email must be a valid email",
      "VALIDATION_ERROR",
    );
  }
  const isBranch = !!input.tenant.parent_tenant_id?.trim();
  const planSlug = input.plan?.slug?.trim();
  if (!isBranch && !planSlug) {
    throw new ConfiguratorError(
      400,
      "plan.slug is required — pass an explicit plan identifier (e.g. \"starter\")",
      "VALIDATION_ERROR",
    );
  }
  if (input.plan) {
    input.plan = { ...input.plan, slug: planSlug ?? "" };
  }
  if (!input.modules || input.modules.length === 0) {
    throw new ConfiguratorError(
      400,
      "modules array is required",
      "VALIDATION_ERROR",
    );
  }

  const email = input.admin.email?.trim();
  if (!email || !EMAIL_RE.test(email)) {
    throw new ConfiguratorError(400, "admin.email must be a valid email", "VALIDATION_ERROR");
  }
  if (!input.admin.first_name?.trim()) {
    throw new ConfiguratorError(400, "admin.first_name is required", "VALIDATION_ERROR");
  }
  if (!input.admin.last_name?.trim()) {
    throw new ConfiguratorError(400, "admin.last_name is required", "VALIDATION_ERROR");
  }
  if (!input.admin.password || input.admin.password.length < 8) {
    throw new ConfiguratorError(
      400,
      "admin.password must be at least 8 characters",
      "VALIDATION_ERROR",
    );
  }
}

function deduplicateModuleIds(
  modules: Array<{ module_id: string; is_active: boolean }>,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of modules) {
    const id = m.module_id?.trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

/** Infrastructure IDs first, then product IDs, deduplicated. */
function mergeModuleIds(
  infraIds: string[],
  productIds: string[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of [...infraIds, ...productIds]) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

function buildOrganizationMetadata(
  input: ProvisionTenantInput,
): Record<string, unknown> {
  const { website: _website, ...restMetadata } = input.organization.metadata ?? {};
  return {
    ...restMetadata,
    provisioning: {
      plan_slug: input.plan?.slug ?? null,
      module_override_ids: input.modules.map((m) => m.module_id),
      trial_end_date: input.plan?.trial_end_date ?? null,
      max_users_override: input.plan?.max_users_override ?? null,
      max_branches_override: input.plan?.max_branches_override ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Event publishing
// ---------------------------------------------------------------------------

export type TenantOnboardingCompletedPayload = {
  organization_id: string;
  organization_slug: string;
  tenant_id: string;
  tenant_slug: string;
  tenant_type: string;
  admin_user_id: string;
  admin_email: string;
  admin_role_id: string;
  enabled_module_ids: string[];
  plan_slug: string;
  provisioned_at: string;
} & Record<string, unknown>;

async function publishOnboardingCompletedEvent(
  eventBus: EventBus,
  ctx: ProvisionTenantContext,
  result: ProvisionTenantResult,
  moduleIds: string[],
  planSlug: string,
): Promise<DomainEvent<TenantOnboardingCompletedPayload>> {
  const payload: TenantOnboardingCompletedPayload = {
    organization_id: result.organization.id,
    organization_slug: result.organization.slug,
    tenant_id: result.tenant.iq_tenant_id,
    tenant_slug: result.tenant.slug,
    tenant_type: "full_platform",
    admin_user_id: result.admin_user.id,
    admin_email: result.admin_user.email,
    admin_role_id: result.admin_role.id,
    enabled_module_ids: moduleIds,
    plan_slug: planSlug,
    provisioned_at: new Date().toISOString(),
  };

  const event = createEnvelope<TenantOnboardingCompletedPayload>({
    event_type: TENANT_ONBOARDING_COMPLETED_EVENT,
    source_module: "configurator",
    iq_tenant_id: result.tenant.iq_tenant_id,
    occurred_at: new Date().toISOString(),
    correlation_id: ctx.correlationId,
    actor_id: ctx.actorId,
    event_contract_version: TENANT_ONBOARDING_EVENT_CONTRACT_VERSION,
    payload,
  });

  await eventBus.publish(event);
  return event;
}
