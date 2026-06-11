import { DrizzleTenantApiKeyRepo } from "@hims/configurator";
import { verifyTenantApiKeySecret } from "@hims/ts-sdk-api-key";
import type { DbInstance } from "@hims/ts-sdk-db";
import type {
  TenantApiKeyValidationResult,
  TenantApiKeyValidatorPort,
} from "@hims/user-management";

export class DrizzleTenantApiKeyValidator implements TenantApiKeyValidatorPort {
  private readonly repo: DrizzleTenantApiKeyRepo;

  constructor(db: DbInstance) {
    this.repo = new DrizzleTenantApiKeyRepo(db);
  }

  async validateOpdSlipKey(
    prefix: string,
    secret: string,
  ): Promise<TenantApiKeyValidationResult | null> {
    const row = await this.repo.findByPrefix(prefix);
    if (!row) return null;
    if (row.purpose !== "opd_slip") return null;
    if (row.status !== "active") return null;
    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
      return null;
    }
    if (!verifyTenantApiKeySecret(secret, row.key_hash)) return null;

    void this.repo.touchLastUsed(row.api_key_id).catch(() => undefined);

    return {
      tenantId: row.iq_tenant_id,
      apiKeyId: row.api_key_id,
      purpose: "opd_slip",
    };
  }
}
