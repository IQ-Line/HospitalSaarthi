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
import {
  createTenantStep1Schema,
  createTenantStep2Schema,
  createTenantStep3Schema,
  WIZARD_DEFAULT_VALUES,
  type WizardFormValues,
} from '@/features/configurator/create-tenant-wizard-schema';
import { useModules } from '@/features/master-data/api';
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
  { step: 1 as const, label: 'Tenant' },
  { step: 2 as const, label: 'Modules' },
  { step: 3 as const, label: 'Admin user' },
] as const;

const FINAL_STEP = 3;

export interface CreateTenantWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onComplete: (input: TenantOnboardingInput) => Promise<void>;
}

export function CreateTenantWizard({
  open,
  onOpenChange,
  isSubmitting,
  onComplete,
}: CreateTenantWizardProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [enabledModuleIds, setEnabledModuleIds] = useState<Set<string>>(() => new Set());
  const slugUserEdited = useRef(false);

  const { data: modulesRes, isLoading: modulesLoading } = useModules(undefined, {
    enabled: open,
    globalCatalog: true,
  });
  const modules = useMemo(() => {
    const all = modulesRes?.data ?? [];
    return all.filter((m) => m.is_active && !m.is_deleted);
  }, [modulesRes?.data]);

  const childMap = useMemo(() => buildChildrenMap(modules), [modules]);
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

  const watchedName = watch('tenantName');

  const slugField = register('slug');
  const slugInputProps = {
    ...slugField,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      slugUserEdited.current = true;
      slugField.onChange(e);
    },
  };

  useEffect(() => {
    if (!open) {
      slugUserEdited.current = false;
      return;
    }
    reset(WIZARD_DEFAULT_VALUES);
    setActiveStep(1);
    setEnabledModuleIds(new Set());
    slugUserEdited.current = false;
  }, [open, reset]);

  useEffect(() => {
    if (!open || modules.length === 0 || enabledModuleIds.size > 0) return;
    setEnabledModuleIds(defaultEnabledModuleIds(modules, childMap));
  }, [open, modules, childMap, enabledModuleIds.size]);

  useEffect(() => {
    if (!open || slugUserEdited.current) return;
    const seed = firstSlugSeedFromTenantName(watchedName ?? '');
    setValue('slug', seed, { shouldDirty: false, shouldValidate: false });
  }, [watchedName, open, setValue]);

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
    setEnabledModuleIds(new Set(modules.map((module) => module.id)));
  }, [modules]);

  const clearAllModules = useCallback(() => {
    setEnabledModuleIds(new Set());
  }, []);

  const goNext = () => {
    const values = form.getValues();
    if (activeStep === 1) {
      const parsed = createTenantStep1Schema.safeParse(values);
      if (!parsed.success) {
        toast.error(firstZodMessage(parsed.error));
        return;
      }
      setActiveStep(2);
      return;
    }
    if (activeStep === 2) {
      const parsed = createTenantStep2Schema.safeParse(values);
      if (!parsed.success) {
        toast.error(firstZodMessage(parsed.error));
        return;
      }
      if (enabledModuleIds.size === 0) {
        toast.error('Enable at least one module for this tenant.');
        return;
      }
      setActiveStep(3);
    }
  };

  const goBack = () => {
    if (activeStep > 1) setActiveStep((s) => s - 1);
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

    const trialRaw = values.trialEndDate?.trim();
    const maxUsersRaw = values.maxUsersOverride?.trim();
    const maxBranchesRaw = values.maxBranchesOverride?.trim();

    const payload: TenantOnboardingInput = {
      organization: {
        name: values.tenantName.trim(),
        slug: values.slug.trim().toLowerCase(),
        type: values.tenantType,
        metadata: {
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
          address: parts.join(', '),
        },
      },
      plan: {
        slug: values.planSlug,
        trial_end_date: trialRaw || null,
        max_users_override: maxUsersRaw ? Number(maxUsersRaw) : null,
        max_branches_override: maxBranchesRaw ? Number(maxBranchesRaw) : null,
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
              Provision a tenant, enable modules, and create the administrator account.
            </DialogDescription>
          </DialogHeader>

          <nav aria-label="Progress" className="mt-4 flex w-full justify-center">
            <div className="flex items-center gap-3 sm:gap-4">
              {STEPS.map(({ step, label }, idx) => {
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
                        {done ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> : step}
                      </div>
                      <span
                        className={`whitespace-nowrap text-xs font-medium ${
                          current ? 'text-foreground' : done ? 'text-foreground/90' : 'text-muted-foreground'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 ? (
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
            {activeStep === 1 && (
              <WizardStep1OrgFields
                register={register}
                control={control}
                errors={errors}
                slugInputProps={slugInputProps}
              />
            )}
            {activeStep === 2 && (
              <WizardStep2Modules
                control={control}
                register={register}
                modulesLoading={modulesLoading}
                rootModules={rootModules}
                childMap={childMap}
                moduleOverrideIds={enabledModuleIds}
                totalModuleCount={modules.length}
                onToggleModule={toggleModule}
                onSelectModuleSubtree={selectModuleSubtree}
                onSelectAllModules={selectAllModules}
                onClearAllModules={clearAllModules}
              />
            )}
            {activeStep === 3 && <WizardStep4Admin register={register} />}
          </div>
        </div>

        <div className="shrink-0 border-t bg-muted/20 px-6 py-3">
          <DialogFooter className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex w-full gap-2 sm:w-auto">
              {activeStep > 1 ? (
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
