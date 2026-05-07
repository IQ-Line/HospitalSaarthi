import type { TenantRepo } from "../ports.js";
import type { Tenant } from "../domain/tenant.types.js";

export async function getTenantById(
  tenantRepo: TenantRepo,
  id: string,
): Promise<Tenant | null> {
  const row = await tenantRepo.findById(id);
  return row ?? null;
}
