import { ValidationError } from "./errors.js";

/** Defensive bounds for runtime authorization and role-editor payloads. */
export const RUNTIME_AUTH_LIMITS = {
  maxCapabilityIdsPerRequest: 500,
  maxRoleTemplateIdsPerCreateUser: 32,
  maxTenantModuleIdsToResolve: 128,
  maxModuleSlugBatchSize: 128,
} as const;

export function dedupeTrimmedIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
}

export function assertWithinLimit(count: number, limit: number, issue: string): void {
  if (count > limit) {
    throw new ValidationError(issue);
  }
}
