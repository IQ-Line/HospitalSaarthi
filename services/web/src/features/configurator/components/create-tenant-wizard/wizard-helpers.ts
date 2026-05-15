import { z } from 'zod';
import type { OrganizationCreateInput, OrganizationType } from '@/features/configurator/types';
import type { WizardFormValues } from '@/features/configurator/create-tenant-wizard-schema';
import type { Module } from '@/features/master-data/types';

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
    address,
    metadata,
    tenant_modules: buildTenantModuleEnablements(moduleOverrideIds),
  };
}
