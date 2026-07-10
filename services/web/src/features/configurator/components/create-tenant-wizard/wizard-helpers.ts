import { z } from 'zod';
import type { Module } from '@/features/master-data/types';
import type { Organization } from '@/features/configurator/types';
import type { TenantOnboardingInput } from '@/features/configurator/api/tenant-onboarding';
import {
  createTenantStep0Schema,
  createTenantStep1Schema,
  createTenantStep2Schema,
  NEW_ORGANISATION_VALUE,
  type WizardFormValues,
} from '@/features/configurator/create-tenant-wizard-schema';
import { organisationEligibleForNewTenant } from './wizard-org-helpers';

export const STANDALONE_HOSPITAL_TENANT_EXISTS_MESSAGE =
  'This standalone hospital already has a tenant. Choose another organisation or create a new one.';

export const DEFAULT_PLAN_SLUG = 'starter';

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
    arr.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name));
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

/** Module id plus every active descendant (for per-level select-all in the wizard tree). */
export function subtreeModuleIds(
  moduleId: string,
  childMap: Map<string | null, Module[]>,
): string[] {
  return [moduleId, ...collectDescendantModuleIds(moduleId, childMap)];
}

/** Select or clear every module in a catalog subtree. */
export function setModuleSubtreeSelection(
  moduleId: string,
  selected: Set<string>,
  childMap: Map<string | null, Module[]>,
  select: boolean,
): Set<string> {
  const next = new Set(selected);
  for (const id of subtreeModuleIds(moduleId, childMap)) {
    if (select) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }
  return next;
}

export function moduleSubtreeSelectionState(
  moduleId: string,
  selected: Set<string>,
  childMap: Map<string | null, Module[]>,
): { ids: string[]; allSelected: boolean; someSelected: boolean } {
  const ids = subtreeModuleIds(moduleId, childMap);
  const selectedCount = ids.filter((id) => selected.has(id)).length;
  return {
    ids,
    allSelected: ids.length > 0 && selectedCount === ids.length,
    someSelected: selectedCount > 0 && selectedCount < ids.length,
  };
}

/** Toggle a module; selecting a parent selects all descendants, deselecting clears the subtree. */
export function applyModuleToggle(
  moduleId: string,
  selected: Set<string>,
  childMap: Map<string | null, Module[]>,
): Set<string> {
  const next = new Set(selected);
  const subtreeIds = subtreeModuleIds(moduleId, childMap);
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

export type WizardStepAdvance =
  | { ok: true; nextStep: number }
  | { ok: false; error: string }
  | { ok: 'noop' };

interface WizardStepValidationContext {
  activeStep: number;
  showOrganisationStep: boolean;
  values: WizardFormValues;
  organisations: Organization[];
  tenantOrgIds: ReadonlySet<string>;
  enabledModuleCount: number;
}

/** Re-used by the organisation step and the standalone-eligibility guard. */
function organisationStepEligibilityError(
  values: WizardFormValues,
  organisations: Organization[],
  tenantOrgIds: ReadonlySet<string>,
): string | null {
  const selectedOrgId = values.organisationSelectionId;
  if (!selectedOrgId || selectedOrgId === NEW_ORGANISATION_VALUE) return null;
  const org = organisations.find((o) => o.id === selectedOrgId);
  if (org && !organisationEligibleForNewTenant(org, tenantOrgIds)) {
    return STANDALONE_HOSPITAL_TENANT_EXISTS_MESSAGE;
  }
  return null;
}

/**
 * Validates the active wizard step and returns the next step to advance to, or an
 * error message to surface. Pure: the caller owns toast/state side effects.
 */
export function validateWizardStepAdvance(ctx: WizardStepValidationContext): WizardStepAdvance {
  const { activeStep, showOrganisationStep, values } = ctx;

  if (activeStep === 1 && showOrganisationStep) {
    const parsed = createTenantStep0Schema.safeParse(values);
    if (!parsed.success) return { ok: false, error: firstZodMessage(parsed.error) };
    const eligibilityError = organisationStepEligibilityError(
      values,
      ctx.organisations,
      ctx.tenantOrgIds,
    );
    if (eligibilityError) return { ok: false, error: eligibilityError };
    return { ok: true, nextStep: 2 };
  }

  if (activeStep === 2) {
    const parsed = createTenantStep1Schema.safeParse(values);
    if (!parsed.success) return { ok: false, error: firstZodMessage(parsed.error) };
    return { ok: true, nextStep: 3 };
  }

  if (activeStep === 3) {
    const parsed = createTenantStep2Schema.safeParse(values);
    if (!parsed.success) return { ok: false, error: firstZodMessage(parsed.error) };
    if (ctx.enabledModuleCount === 0) {
      return { ok: false, error: 'Enable at least one module for this tenant.' };
    }
    return { ok: true, nextStep: 4 };
  }

  return { ok: 'noop' };
}

interface BuildTenantOnboardingPayloadInput {
  values: WizardFormValues;
  showOrganisationStep: boolean;
  scopedOrgId: string | undefined;
  isExistingOrg: boolean;
  organisationSlug: string;
  tenantSlug: string;
  enabledModuleIds: ReadonlySet<string>;
  organisationLogoMetadata: Record<string, unknown> | undefined;
  tenantLogoMetadata: Record<string, unknown> | undefined;
}

/** Pure construction of the onboarding payload; the caller owns uploads/validation. */
export function buildTenantOnboardingPayload(
  input: BuildTenantOnboardingPayloadInput,
): TenantOnboardingInput {
  const {
    values,
    showOrganisationStep,
    scopedOrgId,
    isExistingOrg,
    organisationSlug,
    tenantSlug,
    enabledModuleIds,
    organisationLogoMetadata,
    tenantLogoMetadata,
  } = input;

  const orgName = values.organisationName?.trim() ?? '';

  const parts = [
    values.hqAddressLine1.trim(),
    values.locality?.trim(),
    values.block?.trim(),
    values.district.trim(),
    values.state.trim(),
    values.pinCode.trim(),
  ].filter(Boolean);

  return {
    organization: {
      ...(isExistingOrg
        ? { id: (showOrganisationStep ? values.organisationId : scopedOrgId)!.trim() }
        : {}),
      name: orgName,
      slug: organisationSlug,
      type: values.organisationType,
      contact_email: values.organisationEmail?.trim() || null,
      website: values.organisationWebsite?.trim() || null,
      ...(organisationLogoMetadata ? { metadata: organisationLogoMetadata } : {}),
    },
    tenant: {
      name: values.tenantName.trim(),
      slug: tenantSlug,
      metadata: {
        gstin: values.gstin?.trim() || null,
        pan: values.pan?.trim()?.toUpperCase() || null,
        address_detail: {
          hq_line1: values.hqAddressLine1.trim(),
          locality: values.locality?.trim() || null,
          block: values.block?.trim() || null,
          district: values.district.trim(),
          state: values.state.trim(),
          pin_code: values.pinCode.trim(),
        },
        address: parts.join(', '),
        ...(tenantLogoMetadata ?? {}),
      },
    },
    plan: {
      slug: DEFAULT_PLAN_SLUG,
    },
    modules: [...enabledModuleIds].map((module_id) => ({
      module_id,
      is_active: true,
    })),
    admin: {
      first_name: values.adminFirstName.trim(),
      last_name: values.adminLastName?.trim() || null,
      username: values.adminUsername.trim().toLowerCase(),
      email: values.adminEmail?.trim() ? values.adminEmail.trim().toLowerCase() : null,
      password: values.password,
      phone: values.adminMobile?.trim() || null,
    },
  };
}

