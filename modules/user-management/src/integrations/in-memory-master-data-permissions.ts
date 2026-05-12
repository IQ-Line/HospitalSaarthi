import type { MasterDataPermissionsPort } from "../ports/master-data-permissions.port.js";

/**
 * Test double: resolves permission UUIDs to slugs from a seeded in-memory map.
 */
export class InMemoryMasterDataPermissions implements MasterDataPermissionsPort {
  private readonly catalog = new Map<string, string>();

  seed(permissionId: string, slug: string): void {
    this.catalog.set(permissionId, slug);
  }

  async getPermissionSlugsForIds(ids: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    for (const id of ids) {
      const slug = this.catalog.get(id);
      if (slug !== undefined) result.set(id, slug);
    }
    return result;
  }
}
