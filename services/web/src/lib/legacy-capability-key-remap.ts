/**
 * Keep in sync with `modules/user-management/src/domain/legacy-capability-key-remap.ts`.
 * SPA UX gates must match Cerbos vocabulary after principal hydration.
 */
const LEGACY_TO_CANONICAL_CAPABILITY_KEY: Readonly<Record<string, string>> = {
  'user-management:user:create': 'users:users:create',
  'user-management:user:read': 'users:users:read',
  'user-management:user:update': 'users:users:update',
  'user-management:user:delete': 'users:users:delete',
  'user-management:role:create': 'user-roles:user-roles:create',
  'user-management:role:read': 'user-roles:user-roles:read',
  'user-management:role:update': 'user-roles:user-roles:update',
  'user-management:role:delete': 'user-roles:user-roles:delete',
  'user-management:role:assign': 'user-roles:role:assign',
  'user-management:capability:read': 'user-capabilities:user-capabilities:read',
  'um:user:create': 'users:users:create',
  'um:user:read': 'users:users:read',
  'um:user:update': 'users:users:update',
  'um:user:delete': 'users:users:delete',
  'um:user:deactivate': 'users:users:delete',
  'um:role:create': 'user-roles:user-roles:create',
  'um:role:read': 'user-roles:user-roles:read',
  'um:role:update': 'user-roles:user-roles:update',
  'um:role:delete': 'user-roles:user-roles:delete',
  'um:role:assign': 'user-roles:role:assign',
  'um:capability:read': 'user-capabilities:user-capabilities:read',
  'md:shell:access': 'master-data:shell:access',
  'cfg:shell:access': 'configurator:shell:access',
  'fd:shell:access': 'frontdesk:shell:access',
  'md:visitpad:view': 'visitpad-master:visitpad:view',
  'md:visitpad:create': 'visitpad-master:visitpad:create',
  'md:visitpad:update': 'visitpad-master:visitpad:create',
  'md:visitpad:delete': 'visitpad-master:visitpad:create',
  'md:catalog:read': 'visitpad-master:visitpad:view',
  'md:catalog:update': 'visitpad-master:visitpad:create',
  'md:catalog:delete': 'visitpad-master:visitpad:create',
  'visitpad-templates:visitpad:view': 'visitpad-master:visitpad:view',
  'visitpad-templates:visitpad:create': 'visitpad-master:visitpad:create',
  'visitpad-templates:catalog:read': 'visitpad-master:visitpad:view',
  'visitpad-templates:catalog:update': 'visitpad-master:visitpad:create',
  'visitpad-templates:catalog:delete': 'visitpad-master:visitpad:create',
  'visitpad-templates:catalog:manage': 'visitpad-master:visitpad:create',
};

export function canonicalizeRuntimeCapabilityKey(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  return LEGACY_TO_CANONICAL_CAPABILITY_KEY[normalized] ?? normalized;
}
