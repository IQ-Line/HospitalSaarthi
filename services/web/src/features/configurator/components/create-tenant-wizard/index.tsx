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
import type { OrganizationCreateInput, TenantWizardAdminSnapshot } from '@/features/configurator/types';
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
import { WizardStep3Admin } from './wizard-step-3-admin';
import {
  buildChildrenMap,
  buildCreatePayload,
  firstSlugSeedFromTenantName,
  firstZodMessage,
} from './wizard-helpers';

const STEPS = [
  { step: 1 as const, label: 'Tenant' },
  { step: 2 as const, label: 'Plan & modules' },
  { step: 3 as const, label: 'Admin user' },
];

export interface CreateTenantWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onComplete: (input: {
    payload: OrganizationCreateInput;
    admin: TenantWizardAdminSnapshot;
  }) => Promise<void>;
}

export function CreateTenantWizard({
  open,
  onOpenChange,
  isSubmitting,
  onComplete,
}: CreateTenantWizardProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [moduleOverrideIds, setModuleOverrideIds] = useState<Set<string>>(() => new Set());
  const slugUserEdited = useRef(false);

  const { data: modulesRes, isLoading: modulesLoading } = useModules(undefined, {
    enabled: open,
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
  const welcomeLen = watch('welcomeMessage')?.length ?? 0;
  const sendInvitation = watch('sendInvitation');

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
    setModuleOverrideIds(new Set());
    slugUserEdited.current = false;
  }, [open, reset]);

  useEffect(() => {
    if (!open || slugUserEdited.current) return;
    const seed = firstSlugSeedFromTenantName(watchedName ?? '');
    setValue('slug', seed, { shouldDirty: false, shouldValidate: false });
  }, [watchedName, open, setValue]);

  const toggleModule = useCallback((id: string) => {
    setModuleOverrideIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    const admin: TenantWizardAdminSnapshot = {
      adminFirstName: values.adminFirstName.trim(),
      adminLastName: values.adminLastName.trim(),
      adminEmail: values.adminEmail.trim(),
      adminMobile: values.adminMobile.trim(),
      sendInvitation: values.sendInvitation,
      password: values.password?.trim() || undefined,
      confirmPassword: values.confirmPassword?.trim() || undefined,
      welcomeMessage: values.welcomeMessage?.trim() || undefined,
    };
    const payload = buildCreatePayload(values, moduleOverrideIds);
    await onComplete({ payload, admin });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(92vh,900px)] w-[min(1200px,calc(100vw-1.5rem))] max-w-[min(1200px,calc(100vw-1.5rem))] flex-col gap-0 overflow-hidden border bg-background p-0 shadow-xl sm:rounded-xl"
      >
        <div className="shrink-0 border-b bg-background px-6 pb-4 pt-5">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-base font-semibold tracking-tight">Create new tenant</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
              Provision a new tenant on the platform. Complete all 3 steps to create the tenant.
            </DialogDescription>
          </DialogHeader>

          <nav aria-label="Progress" className="mt-4 flex w-full flex-nowrap items-center gap-1.5 sm:gap-2">
            {STEPS.map(({ step, label }, idx) => {
              const done = activeStep > step;
              const current = activeStep === step;
              const filled = done || current;
              return (
                <div key={step} className="flex min-w-0 flex-1 basis-0 items-center gap-2">
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
                    className={`min-w-0 flex-1 text-xs font-medium leading-snug [overflow-wrap:anywhere] ${
                      current ? 'text-foreground' : done ? 'text-foreground/90' : 'text-muted-foreground'
                    }`}
                  >
                    {label}
                  </span>
                  {idx < STEPS.length - 1 ? (
                    <div
                      className="mx-0.5 hidden h-px min-w-[8px] flex-1 self-center bg-border sm:block"
                      aria-hidden
                    />
                  ) : null}
                </div>
              );
            })}
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
                moduleOverrideIds={moduleOverrideIds}
                onToggleModule={toggleModule}
              />
            )}
            {activeStep === 3 && (
              <WizardStep3Admin
                register={register}
                control={control}
                sendInvitation={sendInvitation}
                welcomeLen={welcomeLen}
              />
            )}
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
              {activeStep < 3 ? (
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
                  {isSubmitting ? 'Creating…' : 'Create tenant'}
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
