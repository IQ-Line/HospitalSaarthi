import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useTenantModules } from '@/features/configurator/api';
import { useProvisionTenant } from '@/features/configurator/api/tenant-onboarding';
import {
  normalizeBranchCodeInput,
  resolveBranchTenantSlug,
} from '@/features/configurator/branch-helpers';
import {
  BRANCH_WIZARD_DEFAULT_VALUES,
  createBranchStep1Schema,
  createBranchStep3Schema,
  DEFAULT_BRANCH_TYPE,
  type BranchWizardFormValues,
} from '@/features/configurator/create-branch-wizard-schema';
import type { TenantOnboardingInput } from '@/features/configurator/api/tenant-onboarding';
import { useModules } from '@/features/master-data/api';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { WizardStep2Modules } from '../create-tenant-wizard/wizard-step-2-modules';
import { WizardStep4Admin } from '../create-tenant-wizard/wizard-step-4-admin';
import {
  applyModuleToggle,
  buildChildrenMap,
  firstZodMessage,
  setModuleSubtreeSelection,
} from '../create-tenant-wizard/wizard-helpers';
import { WizardStepBranchDetails } from './wizard-step-branch-details';

const STEPS = [
  { step: 1 as const, label: 'Branch' },
  { step: 2 as const, label: 'Modules' },
  { step: 3 as const, label: 'Admin user' },
] as const;

const FINAL_STEP = 3;

export interface CreateBranchWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationSlug: string;
  parentTenantId: string;
  parentTenantName: string;
}

export function CreateBranchWizard({
  open,
  onOpenChange,
  organizationId,
  organizationSlug,
  parentTenantId,
  parentTenantName,
}: CreateBranchWizardProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [enabledModuleIds, setEnabledModuleIds] = useState<Set<string>>(() => new Set());
  const modulesDefaultsApplied = useRef(false);

  const provisionTenant = useProvisionTenant();

  const { data: parentModulesRes } = useTenantModules(parentTenantId, {
    enabled: open && !!parentTenantId,
  });

  const { data: modulesRes, isLoading: modulesLoading } = useModules(undefined, {
    enabled: open,
    globalCatalog: true,
    moduleKinds: ['product'],
  });
  const modules = useMemo(() => {
    const all = modulesRes?.data ?? [];
    return all.filter((m) => m.is_active && !m.is_deleted);
  }, [modulesRes?.data]);

  const childMap = useMemo(() => buildChildrenMap(modules), [modules]);
  const rootModules = useMemo(() => childMap.get(null) ?? [], [childMap]);

  const form = useForm<BranchWizardFormValues>({
    defaultValues: BRANCH_WIZARD_DEFAULT_VALUES,
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

  const watchedBranchCode = watch('branchCode');
  const watchedBranchName = watch('branchName');
  const watchedBranchSlug = watch('branchSlug');

  const suggestedSlug = useMemo(() => {
    if (watchedBranchSlug?.trim()) return '';
    return resolveBranchTenantSlug({
      orgSlug: organizationSlug,
      branchName: watchedBranchName ?? '',
      branchCode: watchedBranchCode,
    });
  }, [watchedBranchCode, watchedBranchName, watchedBranchSlug, organizationSlug]);

  useEffect(() => {
    if (!open) {
      modulesDefaultsApplied.current = false;
      return;
    }
    reset(BRANCH_WIZARD_DEFAULT_VALUES);
    setActiveStep(1);
    setEnabledModuleIds(new Set());
    modulesDefaultsApplied.current = false;
  }, [open, reset]);

  useEffect(() => {
    if (!open || modulesDefaultsApplied.current) return;
    const parentActive = (parentModulesRes?.data ?? [])
      .filter((r) => r.is_active)
      .map((r) => r.module_id);
    if (parentActive.length > 0) {
      setEnabledModuleIds(new Set(parentActive));
      modulesDefaultsApplied.current = true;
      return;
    }
    if (modules.length === 0) return;
    modulesDefaultsApplied.current = true;
  }, [open, parentModulesRes?.data, modules.length]);

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
      const parsed = createBranchStep1Schema.safeParse(values);
      if (!parsed.success) {
        toast.error(firstZodMessage(parsed.error));
        return;
      }
      setActiveStep(2);
      return;
    }
    if (activeStep === 2) {
      if (enabledModuleIds.size === 0) {
        toast.error('Enable at least one module for this branch.');
        return;
      }
      setActiveStep(3);
    }
  };

  const goBack = () => {
    if (activeStep > 1) setActiveStep((s) => s - 1);
  };

  const onSubmitFinal = handleSubmit(async (values) => {
    const parsedAdmin = createBranchStep3Schema.safeParse(values);
    if (!parsedAdmin.success) {
      toast.error(firstZodMessage(parsedAdmin.error));
      return;
    }

    const code = normalizeBranchCodeInput(values.branchCode);
    const slug = resolveBranchTenantSlug({
      orgSlug: organizationSlug,
      branchName: values.branchName,
      branchCode: values.branchCode,
      manualSlug: values.branchSlug,
    });
    const parts = [
      values.hqAddressLine1.trim(),
      values.locality?.trim(),
      values.block?.trim(),
      values.district.trim(),
      values.state.trim(),
      values.pinCode.trim(),
    ].filter(Boolean);

    const meta: Record<string, unknown> = {
      address_detail: {
        hq_line1: values.hqAddressLine1.trim(),
        locality: values.locality?.trim() || null,
        block: values.block?.trim() || null,
        district: values.district.trim(),
        state: values.state.trim(),
        pin_code: values.pinCode.trim(),
      },
      address: parts.join(', '),
      ...(code ? { branch_code: code } : {}),
      branch_type: DEFAULT_BRANCH_TYPE,
    };
    if (values.gstin?.trim()) meta.gstin = values.gstin.trim();
    if (values.pan?.trim()) meta.pan = values.pan.trim().toUpperCase();

    const payload: TenantOnboardingInput = {
      organization: { id: organizationId },
      tenant: {
        name: values.branchName.trim(),
        slug,
        parent_tenant_id: parentTenantId,
        type: 'lite',
        branch_code: code || null,
        branch_type: DEFAULT_BRANCH_TYPE,
        address_line1: values.hqAddressLine1.trim(),
        city: values.locality?.trim() || null,
        state: values.state.trim(),
        pin_code: values.pinCode.trim(),
        metadata: meta,
      },
      modules: [...enabledModuleIds].map((id) => ({ module_id: id, is_active: true })),
      admin: {
        first_name: values.adminFirstName.trim(),
        last_name: values.adminLastName?.trim() || null,
        email: values.adminEmail.trim(),
        password: values.password,
        phone: values.adminMobile?.trim() || null,
        username: values.adminUsername?.trim() || null,
      },
    };

    try {
      await provisionTenant.mutateAsync(payload);
      toast.success('Branch and administrator created successfully');
      onOpenChange(false);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(98dvh,1100px)] max-h-[min(98dvh,1100px)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border bg-background p-0 shadow-xl sm:rounded-xl"
      >
        <div className="shrink-0 border-b bg-background px-6 pb-4 pt-5">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-base font-semibold tracking-tight">Create branch</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
              Add a branch under {parentTenantName}. Branch code cannot be changed after creation.
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
              <WizardStepBranchDetails
                register={register}
                control={control}
                errors={errors}
                setValue={setValue}
                watch={watch}
                suggestedSlug={suggestedSlug}
                parentTenantName={parentTenantName}
              />
            )}
            {activeStep === 2 && (
              <WizardStep2Modules
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
            {activeStep === 3 && <WizardStep4Admin register={register as any} />}
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
                  disabled={provisionTenant.isPending}
                  onClick={() => void onSubmitFinal()}
                  className="gap-1.5 bg-[#008C9E] px-5 text-white hover:bg-[#00798a] disabled:opacity-60"
                >
                  {provisionTenant.isPending ? 'Creating branch…' : 'Create branch'}
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
