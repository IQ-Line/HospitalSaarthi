#!/usr/bin/env node
/**
 * Seed configurator.tenant_integration_profiles from abdm-adapter-svc .env (Phase 1a Part A).
 *
 * Usage:
 *   pnpm seed-abdm-profile
 *   IQ_TENANT_ID=<uuid> tsx scripts/seed-abdm-profile-from-env.mts
 *
 * Requires: DATABASE_URL, `make seed` (platform tenant in configurator), ABDM_X_HIP_ID, ABDM_X_HIU_ID.
 * Tenant: IQ_TENANT_ID / ABDM_DEV_TENANT_ID from .env, else platform dev tenant from `make seed`.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Same parsing rules as `loadWorkspaceEnv`, but always sets keys (for service-local .env). */
function loadEnvFileOverride(envPath: string): void {
  if (!existsSync(envPath)) {
    return;
  }
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const { loadWorkspaceEnv } = await import("../tools/seed-user-management-dev/load-env.ts");
loadWorkspaceEnv(repoRoot);
loadEnvFileOverride(path.join(repoRoot, "services/abdm-adapter-svc/.env"));

const { createDb, resolveDatabaseUrl } = await import("../packages/ts-sdk-db/src/index.ts");
const { applyConfiguratorSchemaMigration } = await import(
  "../modules/configurator/src/schema/apply-migration.ts",
);
const { DrizzleTenantIntegrationProfilesRepo } = await import(
  "../modules/configurator/src/data-access/tenant-integration-profile.repo.ts",
);
const { DrizzleTenantRepo } = await import("../modules/configurator/src/data-access/tenant.repo.ts");
const { createTenantIntegrationProfile } = await import(
  "../modules/configurator/src/use-cases/create-tenant-integration-profile.ts",
);
const { updateTenantIntegrationProfile } = await import(
  "../modules/configurator/src/use-cases/update-tenant-integration-profile.ts",
);

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v && v.length > 0 ? v : undefined;
}

function collectSmsConfig(): Record<string, string> {
  const keys = [
    "ABDM_SMS_HTTP_URL",
    "ABDM_SMS_HTTP_API_KEY",
    "ABDM_SMS_TWILIO_ACCOUNT_SID",
    "ABDM_SMS_TWILIO_AUTH_TOKEN",
    "ABDM_SMS_TWILIO_FROM",
  ] as const;
  const out: Record<string, string> = {};
  for (const key of keys) {
    const v = env(key);
    if (v) out[key] = v;
  }
  return out;
}

const hipId = env("ABDM_X_HIP_ID");
const hiuId = env("ABDM_X_HIU_ID");
if (!hipId || !hiuId) {
  console.error("ABDM_X_HIP_ID and ABDM_X_HIU_ID are required");
  process.exit(1);
}

const databaseUrl = resolveDatabaseUrl();
await applyConfiguratorSchemaMigration(databaseUrl);

const db = createDb(databaseUrl);
const tenantRepo = new DrizzleTenantRepo(db);
const profilesRepo = new DrizzleTenantIntegrationProfilesRepo(db);

const { DEVELOPMENT_SEED_TENANT_ID } = await import("../packages/dev-bootstrap/src/index.ts");

const envTenantId =
  env("IQ_TENANT_ID") ??
  env("ABDM_DEV_TENANT_ID") ??
  env("ABDM_SANDBOX_TEST_TENANT_ID");

const tenantIdCandidates = [
  ...(envTenantId ? [envTenantId] : []),
  DEVELOPMENT_SEED_TENANT_ID,
].filter((id, index, all) => all.indexOf(id) === index);

let iqTenantId: string | undefined;
for (const candidateId of tenantIdCandidates) {
  const row = await tenantRepo.findById(candidateId);
  if (row) {
    iqTenantId = candidateId;
    if (envTenantId && candidateId !== envTenantId) {
      console.warn(
        `[seed-abdm-profile] env tenant ${envTenantId} not in configurator.tenants; using platform seed tenant ${candidateId}. ` +
          `Set ABDM_DEV_TENANT_ID=${candidateId} in services/abdm-adapter-svc/.env for callbacks.`,
      );
    }
    break;
  }
}

if (!iqTenantId) {
  console.error(
    "No configurator tenant found. Run `make seed` first, then set ABDM_DEV_TENANT_ID to an existing iq_tenant_id " +
      `(platform dev default after seed: ${DEVELOPMENT_SEED_TENANT_ID}).`,
  );
  process.exit(1);
}

const profileData = {
  iq_tenant_id: iqTenantId,
  integration_kind: "abdm" as const,
  is_active: true,
  hip_id: hipId,
  hiu_id: hiuId,
  cm_id: env("ABDM_X_CM_ID") ?? "sbx",
  client_id: env("ABDM_SANDBOX_CLIENT_ID") ?? env("clientId") ?? null,
  client_secret: env("ABDM_SANDBOX_CLIENT_SECRET") ?? env("clientSecret") ?? null,
  default_sms_phone: env("ABDM_DEFAULT_SMS_PHONE") ?? null,
  hip_display_name: env("ABDM_HIP_DISPLAY_NAME") ?? null,
  callback_base_url: env("ABDM_ADAPTER_PUBLIC_BASE_URL") ?? null,
  sms_provider: env("ABDM_SMS_PROVIDER") ?? null,
  sms_config: collectSmsConfig(),
  gateway_environment: "sandbox",
};

const existing = await profilesRepo.findAll({
  iq_tenant_id: iqTenantId,
  integration_kind: "abdm",
});

let result;
if (existing[0]) {
  const { iq_tenant_id: _t, integration_kind: _k, ...patch } = profileData;
  result = await updateTenantIntegrationProfile(
    profilesRepo,
    existing[0].id,
    iqTenantId,
    patch,
  );
  console.log("[seed-abdm-profile] updated profile", result.id, "for tenant", iqTenantId);
} else {
  result = await createTenantIntegrationProfile(profilesRepo, tenantRepo, profileData);
  console.log("[seed-abdm-profile] created profile", result.id, "for tenant", iqTenantId);
}

console.log("[seed-abdm-profile] hip_id:", result.hip_id);
