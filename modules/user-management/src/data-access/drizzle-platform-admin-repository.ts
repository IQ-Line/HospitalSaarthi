import type { DbInstance } from "@hims/ts-sdk-db";
import { eq } from "drizzle-orm";
import type { PlatformAdminRepository } from "../ports/index.js";
import { platform_admins } from "../schema/tables.js";

/**
 * Reads the tenant-less `platform_admins` reference table to decide bounded `scope:platform`
 * membership. A single PK-keyed lookup by global platform user id — no tenant, no capabilities.
 */
export class DrizzlePlatformAdminRepository implements PlatformAdminRepository {
  constructor(private readonly db: DbInstance) {}

  async isPlatformAdmin(globalUserId: string): Promise<boolean> {
    const id = globalUserId.trim();
    if (id.length === 0) {
      return false;
    }
    const [row] = await this.db
      .select({ user_id: platform_admins.user_id })
      .from(platform_admins)
      .where(eq(platform_admins.user_id, id))
      .limit(1);
    return row !== undefined;
  }
}
