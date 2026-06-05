/**
 * Resolves `permissions.slug` from Master Data into the dotted vocabulary expected by
 * {@link mapMasterDataPermissionToRuntimeCapability}.
 *
 * Junction rows from migration 028 use generic permission slugs (`read`, `create`, …)
 * with junction slugs like `allergens:read`. Product permissions from demo/catalog
 * seeds use dotted slugs (`user.read`, `opd.visit.create`).
 */
const GENERIC_PERMISSION_SLUGS = new Set([
  "read",
  "create",
  "edit",
  "delete",
  "manage",
  "update",
  "write",
]);

const COMPOUND_PERMISSION_ACTION_SUFFIXES = [
  "access",
  "activate",
  "assign",
  "compose",
  "create",
  "deactivate",
  "delete",
  "disable",
  "issue",
  "manage",
  "provision",
  "reactivate",
  "read",
  "revoke",
  "update",
  "view",
  "write",
] as const;

function parseJunctionPermissionSlug(module: string, permission: string): string | null {
  const colonIdx = permission.indexOf(":");
  if (colonIdx <= 0) {
    return null;
  }
  const junctionModule = permission.slice(0, colonIdx);
  const action = permission.slice(colonIdx + 1);
  if (junctionModule === module && GENERIC_PERMISSION_SLUGS.has(action)) {
    return `${module}.${action}`;
  }
  return null;
}

function parseHyphenatedProductPermissionSlug(module: string, permission: string): string | null {
  const prefix = `${module}-`;
  if (!permission.startsWith(prefix)) {
    return null;
  }

  const rest = permission.slice(prefix.length);
  for (const action of COMPOUND_PERMISSION_ACTION_SUFFIXES) {
    if (rest === action) {
      return `${module}.${action}`;
    }
    const suffix = `-${action}`;
    if (rest.endsWith(suffix)) {
      const resource = rest.slice(0, -suffix.length);
      if (resource.length === 0) {
        return null;
      }
      return `${resource.replace(/-/g, ".")}.${action}`;
    }
  }

  return null;
}

export function resolveMasterDataPermissionSlugForMapping(
  moduleSlug: string,
  permissionSlug: string,
): string {
  const module = moduleSlug.trim().toLowerCase();
  const permission = permissionSlug.trim().toLowerCase();

  if (permission.length === 0) {
    throw new Error("permissionSlug must be non-empty");
  }

  if (permission.includes(".")) {
    return permission;
  }

  const junction = parseJunctionPermissionSlug(module, permission);
  if (junction !== null) {
    return junction;
  }

  const hyphenated = parseHyphenatedProductPermissionSlug(module, permission);
  if (hyphenated !== null) {
    return hyphenated;
  }

  if (GENERIC_PERMISSION_SLUGS.has(permission)) {
    return `${module}.${permission}`;
  }

  return permission;
}
