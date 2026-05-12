/**
 * Abstracts permission UUID → slug resolution from the Master Data module.
 *
 * UM stores only permission UUIDs in `role_permissions`; the Master Data module owns the
 * canonical permission catalog (id, slug, display_name, etc.). This port decouples UM from
 * the transport details of that lookup so the domain layer never depends on HTTP or caching.
 *
 * Implementations may fetch from HTTP, cache in RAM, or use a test double.
 */
export interface MasterDataPermissionsPort {
  /**
   * Resolves permission UUIDs to their canonical slug strings.
   * @returns Map where key = permission_id, value = slug. Unknown IDs are absent from the map.
   */
  getPermissionSlugsForIds(ids: string[]): Promise<Map<string, string>>;
}
