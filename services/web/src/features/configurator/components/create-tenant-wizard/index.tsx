import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { toast } from 'sonner';
import type { TenantOnboardingInput } from '@/features/configurator/api/tenant-onboarding';
import { useQuery } from '@tanstack/react-query';
import { organizationsQueryOptions, tenantsQueryOptions } from '@/features/configurator/api/catalog';
import { useOrganization } from '@/features/configurator/api';
import type { Organization } from '@/features/configurator/types';
import { useAuthStore } from '@/stores/auth.store';
import { resolvePlatformSuperAdmin } from '@/lib/platform-admin';
import {
  createTenantStep0Schema,
  createTenantStep1Schema,
  createTenantStep2Schema,
  createTenantStep3Schema,
  WIZARD_DEFAULT_VALUES,
  type WizardFormValues,
} from '@/features/configurator/create-tenant-wizard-schema';
import { useModules } from '@/features/master-data/api';
import { NEW_ORGANISATION_VALUE } from '@/features/configurator/create-tenant-wizard-schema';
import { WizardStep0Organisation } from './wizard-step-0-organisation';
import {
  filterOrganisationsForTenantWizard,
  organisationEmailFromOrg,
  organisationEligibleForNewTenant,
  organisationWebsiteFromOrg,
  orgIdsWithTenants,
} from './wizard-org-helpers';
import { WizardStep1OrgFields } from './wizard-step-1-org-fields';
import { WizardStep2Modules } from './wizard-step-2-modules';
import { WizardStep4Admin } from './wizard-step-4-admin';
import {
  applyModuleToggle,
  buildChildrenMap,
  defaultEnabledModuleIds,
  firstSlugSeedFromTenantName,
  firstZodMessage,
  setModuleSubtreeSelection,
} from './wizard-helpers';

const STEPS = [
  { step: 1 as const, label: 'Organisation' },
  { step: 2 as const, label: 'Tenant' },
  { step: 3 as const, label: 'Modules' },
  { step: 4 as const, label: 'Admin user' },
] as const;

const FINAL_STEP = 4;

const DEFAULT_PLAN_SLUG = 'starter';

export interface CreateTenantWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onComplete: (input: TenantOnboardingInput) => Promise<void>;
  /** Pre-selects an organisation in step 1; user can still pick another org or create new. */
  defaultOrganizationId?: string;
}

export function CreateTenantWizard({
  open,
  onOpenChange,
  isSubmitting,
  onComplete,
  defaultOrganizationId,
}: CreateTenantWizardProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const authRoles = useAuthStore((s) => s.roles);
  const isPlatformSuperAdmin = resolvePlatformSuperAdmin({
    authRoles,
    accessToken,
  });
  const showOrganisationStep = isPlatformSuperAdmin;
  const firstStep = showOrganisationStep ? 1 : 2;
  const visibleSteps = useMemo(
    () => STEPS.filter((s) => showOrganisationStep || s.step !== 1),
    [showOrganisationStep],
  );

  const [activeStep, setActiveStep] = useState(firstStep);
  const [enabledModuleIds, setEnabledModuleIds] = useState<Set<string>>(() => new Set());
  const orgSlugUserEdited = useRef(false);
  const tenantSlugUserEdited = useRef(false);
  const modulesDefaultsApplied = useRef(false);
  const defaultOrgApplied = useRef(false);

  const { data: organisationsRes, isLoading: organisationsLoading } = useQuery({
    ...organizationsQueryOptions({ status: 'active' }),
    enabled: open && showOrganisationStep,
  });
  const { data: tenantsRes, isLoading: tenantsLoading } = useQuery({
    ...tenantsQueryOptions({}),
    enabled: open && showOrganisationStep,
  });
  const organisations = organisationsRes?.data ?? [];
  const tenantOrgIds = useMemo(
    () => orgIdsWithTenants(tenantsRes?.data ?? []),
    [tenantsRes?.data],
  );
  const selectableOrganisations = useMemo(
    () => filterOrganisationsForTenantWizard(organisations, tenantOrgIds),
    [organisations, tenantOrgIds],
  );
  const organisationCatalogLoading = organisationsLoading || tenantsLoading;

  const { data: scopedOrganization } = useOrganization(defaultOrganizationId ?? '', {
    enabled: open && !showOrganisationStep && !!defaultOrganizationId?.trim(),
  });

  const { data: modulesRes, isLoading: modulesLoading } = useModules(undefined, {
    enabled: open,
    globalCatalog: true,
    moduleKinds: ['product'],
  });
  const productModules = useMemo(() => {
    const all = modulesRes?.data ?? [];
    return all.filter((m) => m.is_active && !m.is_deleted);
  }, [modulesRes?.data]);

  const childMap = useMemo(() => buildChildrenMap(productModules), [productModules]);
  const rootModules = useMemo(() => childMap.get(null) ?? [], [childMap]);

  const form = useForm<WizardFormValues>({
    defaultValues: WIZARD_DEFAULT_VALUES,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = form;

  const applyOrganisationToForm = useCallback(
    (org: Organization) => {
      const setField = (name: keyof WizardFormValues, value: string) => {
        setValue(name, value, { shouldDirty: false, shouldValidate: false });
      };
      setField('organisationSelectionId', org.id);
      setField('organisationId', org.id);
      setField('organisationName', org.name);
      setField('organisationSlug', org.slug);
      setField('organisationType', org.type);
      setField('organisationWebsite', organisationWebsiteFromOrg(org));
      setField('organisationEmail', organisationEmailFromOrg(org));
    },
    [setValue],
  );

  const watchedOrgName = watch('organisationName');
  const watchedOrgSelectionId = watch('organisationSelectionId');
  const watchedTenantName = watch('tenantName');

  const selectedOrganisationId =
    watchedOrgSelectionId && watchedOrgSelectionId !== NEW_ORGANISATION_VALUE
      ? watchedOrgSelectionId
      : '';

  const { data: selectedOrganisation } = useOrganization(selectedOrganisationId, {
    enabled: open && showOrganisationStep && Boolean(selectedOrganisationId),
  });

  const appliedOrganisationIdRef = useRef<string | null>(null);

  const organisationSlugField = register('organisationSlug');
  const organisationSlugInputProps = {
    ...organisationSlugField,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      orgSlugUserEdited.current = true;
      organisationSlugField.onChange(e);
    },
  };

  const tenantSlugField = register('tenantSlug');
  const tenantSlugInputProps = {
    ...tenantSlugField,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      tenantSlugUserEdited.current = true;
      tenantSlugField.onChange(e);
    },
  };

  useEffect(() => {
    if (!open) {
      orgSlugUserEdited.current = false;
      tenantSlugUserEdited.current = false;
      modulesDefaultsApplied.current = false;
      defaultOrgApplied.current = false;
      appliedOrganisationIdRef.current = null;
      return;
    }
    reset(WIZARD_DEFAULT_VALUES);
    setActiveStep(firstStep);
    setEnabledModuleIds(new Set());
    orgSlugUserEdited.current = false;
    tenantSlugUserEdited.current = false;
    modulesDefaultsApplied.current = false;
    defaultOrgApplied.current = false;
    appliedOrganisationIdRef.current = null;
  }, [open, reset, firstStep]);

  useEffect(() => {
    if (!open || !showOrganisationStep) return;
    if (watchedOrgSelectionId === NEW_ORGANISATION_VALUE) {
      appliedOrganisationIdRef.current = null;
      return;
    }
    const org =
      selectedOrganisation ??
      selectableOrganisations.find((o) => o.id === selectedOrganisationId);
    if (!org || appliedOrganisationIdRef.current === org.id) return;
    appliedOrganisationIdRef.current = org.id;
    orgSlugUserEdited.current = false;
    applyOrganisationToForm(org);
  }, [
    open,
    showOrganisationStep,
    watchedOrgSelectionId,
    selectedOrganisation,
    selectedOrganisationId,
    selectableOrganisations,
    applyOrganisationToForm,
  ]);

  useEffect(() => {
    if (!open || !showOrganisationStep || organisationCatalogLoading) return;
    const selectionId = watchedOrgSelectionId;
    if (!selectionId || selectionId === NEW_ORGANISATION_VALUE) return;
    const org = organisations.find((o) => o.id === selectionId);
    if (!org || organisationEligibleForNewTenant(org, tenantOrgIds)) return;
    appliedOrganisationIdRef.current = null;
    orgSlugUserEdited.current = false;
    setValue('organisationSelectionId', '');
    setValue('organisationId', '');
    setValue('organisationName', '');
    setValue('organisationSlug', '');
    setValue('organisationWebsite', '');
    setValue('organisationEmail', '');
    setValue('organisationType', 'standalone_hospital');
    toast.error(
      'This standalone hospital already has a tenant. Choose another organisation or create a new one.',
    );
  }, [
    open,
    showOrganisationStep,
    organisationCatalogLoading,
    watchedOrgSelectionId,
    organisations,
    tenantOrgIds,
    setValue,
  ]);

  useEffect(() => {
    if (!open || defaultOrgApplied.current || !defaultOrganizationId?.trim()) return;
    const org = showOrganisationStep
      ? selectableOrganisations.find((o) => o.id === defaultOrganizationId.trim())
      : scopedOrganization;
    if (!org) return;
    defaultOrgApplied.current = true;
    orgSlugUserEdited.current = false;
    appliedOrganisationIdRef.current = org.id;
    applyOrganisationToForm(org);
  }, [
    open,
    defaultOrganizationId,
    selectableOrganisations,
    scopedOrganization,
    showOrganisationStep,
    applyOrganisationToForm,
  ]);

  useEffect(() => {
    if (!open || productModules.length === 0 || modulesDefaultsApplied.current) return;
    setEnabledModuleIds(defaultEnabledModuleIds(productModules, childMap));
    modulesDefaultsApplied.current = true;
  }, [open, productModules, childMap]);

  useEffect(() => {
    if (!open || orgSlugUserEdited.current) return;
    if (watchedOrgSelectionId && watchedOrgSelectionId !== NEW_ORGANISATION_VALUE) return;
    const seed = firstSlugSeedFromTenantName(watchedOrgName ?? '');
    setValue('organisationSlug', seed, { shouldDirty: false, shouldValidate: false });
  }, [watchedOrgName, watchedOrgSelectionId, open, setValue]);

  useEffect(() => {
    if (!open || tenantSlugUserEdited.current) return;
    const seed = firstSlugSeedFromTenantName(watchedTenantName ?? '');
    setValue('tenantSlug', seed, { shouldDirty: false, shouldValidate: false });
  }, [watchedTenantName, open, setValue]);

  const onOrganisationSelectionChange = useCallback(
    (selectionId: string) => {
      orgSlugUserEdited.current = false;
      appliedOrganisationIdRef.current = null;
      if (selectionId === NEW_ORGANISATION_VALUE) {
        setValue('organisationId', '');
        setValue('organisationName', '');
        setValue('organisationSlug', '');
        setValue('organisationWebsite', '');
        setValue('organisationEmail', '');
        setValue('organisationType', 'standalone_hospital');
        return;
      }
      const org = selectableOrganisations.find((o) => o.id === selectionId);
      if (org) {
        appliedOrganisationIdRef.current = org.id;
        applyOrganisationToForm(org);
        return;
      }
      const blocked = organisations.find((o) => o.id === selectionId);
      if (blocked && !organisationEligibleForNewTenant(blocked, tenantOrgIds)) {
        toast.error(
          'This standalone hospital already has a tenant. Choose another organisation or create a new one.',
        );
        return;
      }
      setValue('organisationSelectionId', selectionId);
      setValue('organisationId', selectionId);
    },
    [organisations, selectableOrganisations, tenantOrgIds, applyOrganisationToForm, setValue],
  );

  const toggleModule = useCallback(
    (id: string) => {
      setEnabledModuleIds((prev) => applyModuleToggle(id, prev, childMap));
    },
    [childMap],
  );

  const selectModuleSubtree = useCallback(
    (moduleId: string, select: boolean) => {
      setEnabledModuleIds((prev) => setModuleSubtreeSelection(moduleId, prev, childMap, select));
    },
    [childMap],
  );

  const selectAllModules = useCallback(() => {
    setEnabledModuleIds(new Set(productModules.map((module) => module.id)));
  }, [productModules]);

  const clearAllModules = useCallback(() => {
    setEnabledModuleIds(new Set());
  }, []);

  const goNext = () => {
    const values = form.getValues();
    if (activeStep === 1 && showOrganisationStep) {
      const parsed = createTenantStep0Schema.safeParse(values);
      if (!parsed.success) {
        toast.error(firstZodMessage(parsed.error));
        return;
      }
      const selectedOrgId = values.organisationSelectionId;
      if (selectedOrgId && selectedOrgId !== NEW_ORGANISATION_VALUE) {
        const org = organisations.find((o) => o.id === selectedOrgId);
        if (org && !organisationEligibleForNewTenant(org, tenantOrgIds)) {
          toast.error(
            'This standalone hospital already has a tenant. Choose another organisation or create a new one.',
          );
          return;
        }
      }
      setActiveStep(2);
      return;
    }
    if (activeStep === 2) {
      const parsed = createTenantStep1Schema.safeParse(values);
      if (!parsed.success) {
        toast.error(firstZodMessage(parsed.error));
        return;
      }
      setActiveStep(3);
      return;
    }
    if (activeStep === 3) {
      const parsed = createTenantStep2Schema.safeParse(values);
      if (!parsed.success) {
        toast.error(firstZodMessage(parsed.error));
        return;
      }
      if (enabledModuleIds.size === 0) {
        toast.error('Enable at least one module for this tenant.');
        return;
      }
      setActiveStep(4);
    }
  };

  const goBack = () => {
    if (activeStep > firstStep) setActiveStep((s) => s - 1);
  };

  const onSubmitFinal = handleSubmit(async (values) => {
    const parsed = createTenantStep3Schema.safeParse(values);
    if (!parsed.success) {
      toast.error(firstZodMessage(parsed.error));
      return;
    }

    const parts = [
      values.hqAddressLine1.trim(),
      values.locality?.trim(),
      values.block?.trim(),
      values.district.trim(),
      values.state.trim(),
      values.pinCode.trim(),
    ].filter(Boolean);

    const scopedOrgId = defaultOrganizationId?.trim() || values.organisationId?.trim();
    if (!showOrganisationStep) {
      if (!scopedOrgId) {
        toast.error('Your session has no organisation scope. Select an organisation and try again.');
        return;
      }
    }

    const isExistingOrg =
      !showOrganisationStep ||
      (values.organisationSelectionId !== NEW_ORGANISATION_VALUE && !!values.organisationId?.trim());

    const orgName = values.organisationName?.trim() ?? '';

    const payload: TenantOnboardingInput = {
      organization: {
        ...(isExistingOrg
          ? { id: (showOrganisationStep ? values.organisationId : scopedOrgId)!.trim() }
          : {}),
        name: orgName,
        slug: values.organisationSlug.trim().toLowerCase(),
        type: values.organisationType,
        contact_email: values.organisationEmail?.trim() || null,
        website: values.organisationWebsite?.trim() || null,
      },
      tenant: {
        name: values.tenantName.trim(),
        slug: values.tenantSlug.trim().toLowerCase(),
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
        last_name: values.adminLastName.trim(),
        email: values.adminEmail.trim(),
        password: values.password,
        phone: values.adminMobile?.trim() || null,
        username: values.adminUsername?.trim() || null,
      },
    };

    await onComplete(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(98dvh,1100px)] max-h-[min(98dvh,1100px)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border bg-background p-0 shadow-xl sm:rounded-xl"
      >
        <div className="shrink-0 border-b bg-background px-6 pb-4 pt-5">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-base font-semibold tracking-tight">Create new tenant</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
              {showOrganisationStep
                ? 'Provision an organisation, tenant, modules, and administrator account.'
                : 'Provision a tenant, modules, and administrator account for your organisation.'}
            </DialogDescription>
          </DialogHeader>

          <nav aria-label="Progress" className="mt-4 flex w-full justify-center">
            <div className="flex items-center gap-3 sm:gap-4">
              {visibleSteps.map(({ step, label }, idx) => {
                const displayStep = idx + 1;
                const done = activeStep > step;
                const current = activeStep === step;
                const filled = done || current;
                return (
                  <div key={step} className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                          filled
                            ? 'border-[#008C9E] bg-[#008C9E] text-white'
                            : 'border-muted-foreground/25 bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        {done ? (
                          <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                        ) : (
                          displayStep
                        )}
                      </div>
                      <span
                        className={`whitespace-nowrap text-xs font-medium ${
                          current ? 'text-foreground' : done ? 'text-foreground/90' : 'text-muted-foreground'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {idx < visibleSteps.length - 1 ? (
                      <div className="h-px w-8 sm:w-12 bg-border" aria-hidden />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="text-sm [&_[data-slot=field]]:gap-1.5 [&_[data-slot=field-label]]:text-xs [&_[data-slot=field-label]]:font-medium [&_[data-slot=field-description]]:text-[11px] [&_[data-slot=field-description]]:leading-snug [&_[data-slot=field-error]]:text-[11px]">
            {activeStep === 1 && showOrganisationStep && (
              <WizardStep0Organisation
                register={register}
                control={control}
                errors={errors}
                organisations={selectableOrganisations}
                organisationsLoading={organisationCatalogLoading}
                organisationSlugInputProps={organisationSlugInputProps}
                onOrganisationSelectionChange={onOrganisationSelectionChange}
              />
            )}
            {activeStep === 2 && (
              <WizardStep1OrgFields
                register={register}
                control={control}
                errors={errors}
                tenantSlugInputProps={tenantSlugInputProps}
              />
            )}
            {activeStep === 3 && (
              <WizardStep2Modules
                modulesLoading={modulesLoading}
                rootModules={rootModules}
                childMap={childMap}
                moduleOverrideIds={enabledModuleIds}
                totalModuleCount={productModules.length}
                onToggleModule={toggleModule}
                onSelectModuleSubtree={selectModuleSubtree}
                onSelectAllModules={selectAllModules}
                onClearAllModules={clearAllModules}
              />
            )}
            {activeStep === 4 && <WizardStep4Admin register={register} />}
          </div>
        </div>

        <div className="shrink-0 border-t bg-muted/20 px-6 py-3">
          <DialogFooter className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex w-full gap-2 sm:w-auto">
              {activeStep > firstStep ? (
                <Button type="button" variant="outline" onClick={goBack} className="px-4">
                  <ChevronLeft className="size-3.5" aria-hidden />
                  Back
                </Button>
              ) : (
                <span className="hidden sm:inline sm:min-w-[5rem]" />
              )}
            </div>
            <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
              <Button type="button" variant="outline" className="px-4" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {activeStep < FINAL_STEP ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className="gap-1.5 bg-[#008C9E] px-5 text-white hover:bg-[#00798a]"
                >
                  Next
                  <ChevronRight className="size-3.5" aria-hidden />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void onSubmitFinal()}
                  className="gap-1.5 bg-[#008C9E] px-5 text-white hover:bg-[#00798a] disabled:opacity-60"
                >
                  {isSubmitting ? 'Creating tenant…' : 'Create tenant'}
                  <Check className="size-3.5" aria-hidden />
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
