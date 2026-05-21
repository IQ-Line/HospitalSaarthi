import { z } from 'zod';
import type { OrganizationCreateInput, OrganizationType } from '@/features/configurator/types';
import type { WizardFormValues } from '@/features/configurator/create-tenant-wizard-schema';
import type { Module } from '@/features/master-data/types';

export { moduleSlugsForIds, toRoleCode } from './wizard-capability-helpers';

/** First alphanumeric character of the name, lowercased — used as the initial slug seed. */
export function firstSlugSeedFromTenantName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/[A-Za-z0-9]/);
  if (!match) return '';
  return match[0].toLowerCase();
}

export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Validation failed';
}

export function buildChildrenMap(modules: Module[]): Map<string | null, Module[]> {
  const map = new Map<string | null, Module[]>();
  for (const m of modules) {
    const p = m.parent_id;
    if (!map.has(p)) map.set(p, []);
    map.get(p)!.push(m);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }
  return map;
}

/** All active descendant module ids (depth-first, excludes `moduleId`). */
export function collectDescendantModuleIds(
  moduleId: string,
  childMap: Map<string | null, Module[]>,
): string[] {
  const ids: string[] = [];
  const walk = (parentId: string) => {
    for (const child of childMap.get(parentId) ?? []) {
      if (!child.is_active || child.is_deleted) continue;
      ids.push(child.id);
      walk(child.id);
    }
  };
  walk(moduleId);
  return ids;
}

function addModuleSubtreeToSet(
  moduleId: string,
  childMap: Map<string | null, Module[]>,
  ids: Set<string>,
): void {
  ids.add(moduleId);
  for (const childId of collectDescendantModuleIds(moduleId, childMap)) {
    ids.add(childId);
  }
}

/** Pre-select active root modules and their full subtrees from the catalog. */
export function defaultEnabledModuleIds(
  modules: Module[],
  childMap: Map<string | null, Module[]>,
): Set<string> {
  const ids = new Set<string>();
  for (const module of modules) {
    if (!module.is_active || module.is_deleted) continue;
    if (module.parent_id !== null) continue;
    addModuleSubtreeToSet(module.id, childMap, ids);
  }
  return ids;
}

/** Toggle a module; selecting a parent selects all descendants, deselecting clears the subtree. */
export function applyModuleToggle(
  moduleId: string,
  selected: Set<string>,
  childMap: Map<string | null, Module[]>,
): Set<string> {
  const next = new Set(selected);
  const subtreeIds = [moduleId, ...collectDescendantModuleIds(moduleId, childMap)];
  if (next.has(moduleId)) {
    for (const id of subtreeIds) next.delete(id);
  } else {
    for (const id of subtreeIds) next.add(id);
  }
  return next;
}

/** Hide placeholder-like descriptions from the API so the grid stays readable. */
export function moduleDescriptionLine(description: string | null | undefined): string | null {
  const d = description?.trim();
  if (!d || d.length < 2) return null;
  if (/^string$/i.test(d)) return null;
  return d;
}

export function buildTenantModuleEnablements(
  selected: Set<string>,
): Array<{ module_id: string; is_active: boolean }> {
  return [...selected].map((module_id) => ({
    module_id,
    is_active: true,
  }));
}

export function buildCreatePayload(
  values: WizardFormValues,
  moduleOverrideIds: Set<string>,
): OrganizationCreateInput {
  const parts = [
    values.hqAddressLine1.trim(),
    values.locality?.trim(),
    values.block?.trim(),
    values.district.trim(),
    values.state.trim(),
    values.pinCode.trim(),
  ].filter(Boolean);
  const address = parts.join(', ');

  const trialRaw = values.trialEndDate?.trim();
  const trialEndDate = trialRaw ? trialRaw : null;
  const maxUsersRaw = values.maxUsersOverride?.trim();
  const maxBranchesRaw = values.maxBranchesOverride?.trim();

  const metadata: Record<string, unknown> = {
    gstin: values.gstin?.trim() || null,
    pan: values.pan?.trim()?.toUpperCase() || null,
    website: values.website?.trim() || null,
    address_detail: {
      hq_line1: values.hqAddressLine1.trim(),
      locality: values.locality?.trim() || null,
      block: values.block?.trim() || null,
      district: values.district.trim(),
      state: values.state.trim(),
      pin_code: values.pinCode.trim(),
    },
    provisioning: {
      plan_slug: values.planSlug,
      module_override_ids: [...moduleOverrideIds],
      trial_end_date: trialEndDate,
      max_users_override: maxUsersRaw ? Number(maxUsersRaw) : null,
      max_branches_override: maxBranchesRaw ? Number(maxBranchesRaw) : null,
    },
  };

  return {
    name: values.tenantName.trim(),
    slug: values.slug.trim().toLowerCase(),
    type: values.tenantType as OrganizationType,
    status: 'active',
    contact_email: values.adminEmail.trim(),
    contact_phone: values.adminMobile?.trim() || null,
    address,
    metadata,
    tenant_modules: buildTenantModuleEnablements(moduleOverrideIds),
  };
}
