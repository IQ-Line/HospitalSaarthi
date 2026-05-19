/**
 * Maps Cerbos / API action names to the SPA {@link usePermissionsStore} shape
 * (`read` / `write` booleans per module feature).
 *
 * DB catalog uses actions: create | read | update | delete | manage (see Master Data LLD).
 * UI uses `write` as shorthand for any mutating capability (create, update, delete, or manage).
 */

/** Nested map: module → feature → action → allowed (matches permissions.store). */
export type PermissionMap = Record<string, Record<string, Record<string, boolean>>>;

export const VISITPAD_TEMPLATES_MODULE = 'visitpad-templates' as const;
export const VISITPAD_CATALOG_FEATURE = 'catalog' as const;

const CERBOS_LIKE_ACTIONS = new Set(['create', 'read', 'update', 'delete', 'manage']);

/**
 * From a set of server/Cerbos actions for one feature, derive UI `read` and `write`.
 * `manage` implies both; `write` is true if any of create/update/delete/manage is present.
 */
export function projectCerbosActionsToWrite(actions: readonly string[]): { read: boolean; write: boolean } {
  const normalized = new Set(actions.map((a) => a.toLowerCase()));
  const read = normalized.has('read') || normalized.has('manage');
  const write =
    normalized.has('manage') ||
    normalized.has('create') ||
    normalized.has('update') ||
    normalized.has('delete');
  return { read, write };
}

/** Validates and normalizes unknown action strings (ignores junk). */
export function projectUnknownActionsToWrite(actions: readonly string[]): { read: boolean; write: boolean } {
  const filtered = actions.filter((a) => CERBOS_LIKE_ACTIONS.has(a.toLowerCase()));
  return projectCerbosActionsToWrite(filtered);
}

type DevPermissionVariant = 'superadmin' | 'tenant-catalog-readonly';

const BASE_MODULES: PermissionMap = {
  'user-management': {
    users: { read: true, write: true },
    roles: { read: true, write: true },
  },
  configurator: {
    tenants: { read: true, write: true },
    modules: { read: true, write: true },
  },
  empi: {
    registration: { read: true, write: true },
    search: { read: true, write: false },
  },
  'master-data': {
    reference: { read: true, write: true },
    overrides: { read: true, write: true },
  },
  billing: {
    services: { read: true, write: true },
  },
};

/**
 * Dev-only permission map for mock login. Production should replace this with
 * `hydratePermissionMapFromUserManagement` (see LLD 03).
 */
export function buildDevPermissionMap(variant: DevPermissionVariant): PermissionMap {
  const visitpad: Record<string, Record<string, boolean>> =
    variant === 'superadmin'
      ? { [VISITPAD_CATALOG_FEATURE]: { read: true, write: true } }
      : { [VISITPAD_CATALOG_FEATURE]: { read: true, write: false } };

  return {
    ...BASE_MODULES,
    [VISITPAD_TEMPLATES_MODULE]: visitpad,
  };
}
