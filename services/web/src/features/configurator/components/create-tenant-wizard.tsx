import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Checkbox } from '@pulse/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Input } from '@pulse/ui/input';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from '@pulse/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Textarea } from '@pulse/ui/textarea';
import { toast } from 'sonner';
import type {
  OrganizationCreateInput,
  OrganizationType,
  TenantWizardAdminSnapshot,
} from '@/features/configurator/types';
import {
  createTenantStep1Schema,
  createTenantStep2Schema,
  createTenantStep3Schema,
  INDIAN_STATE_OPTIONS,
  PLAN_OPTIONS,
  WIZARD_DEFAULT_VALUES,
  type WizardFormValues,
} from '@/features/configurator/create-tenant-wizard-schema';
import { organizationTypeOptions } from '@/features/configurator/validation';
import { useModules } from '@/features/master-data/api';
import type { Module } from '@/features/master-data/types';

/** First alphanumeric character of the name, lowercased — used as the initial slug seed. */
function firstSlugSeedFromTenantName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/[A-Za-z0-9]/);
  if (!match) return '';
  return match[0].toLowerCase();
}

function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Validation failed';
}

function buildChildrenMap(modules: Module[]): Map<string | null, Module[]> {
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
function moduleDescriptionLine(description: string | null | undefined): string | null {
  const d = description?.trim();
  if (!d || d.length < 2) return null;
  if (/^string$/i.test(d)) return null;
  return d;
}

function ModuleOverrideTree({
  roots,
  childMap,
  selected,
  toggle,
  depth = 0,
}: {
  roots: Module[];
  childMap: Map<string | null, Module[]>;
  selected: Set<string>;
  toggle: (id: string) => void;
  depth?: number;
}) {
  return (
    <ul
      className={
        depth === 0
          ? 'grid min-w-0 max-h-[min(26rem,48vh)] grid-cols-1 gap-x-4 gap-y-3 overflow-x-hidden overflow-y-auto sm:grid-cols-2'
          : 'mt-2 w-full min-w-0 space-y-2 border-l border-border/60 pl-3'
      }
    >
      {roots.map((m) => {
        const children = childMap.get(m.id) ?? [];
        const descLine = moduleDescriptionLine(m.description);
        return (
          <li
            key={m.id}
            className={
              depth === 0
                ? 'min-w-0 rounded-lg border border-border/80 bg-card p-3.5 shadow-sm'
                : 'min-w-0 rounded-md border border-transparent py-1 pl-0 pr-1 hover:bg-muted/40'
            }
          >
            <label className="flex cursor-pointer items-start gap-2.5 text-xs">
              <Checkbox
                checked={selected.has(m.id)}
                onCheckedChange={() => toggle(m.id)}
                className="mt-0.5 size-3.5 shrink-0"
              />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <span className="block font-medium leading-snug">{m.name}</span>
                {descLine ? (
                  <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                    {descLine}
                  </span>
                ) : null}
              </span>
            </label>
            {children.length > 0 ? (
              <ModuleOverrideTree
                roots={children}
                childMap={childMap}
                selected={selected}
                toggle={toggle}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function buildTenantModuleEnablements(
  selected: Set<string>,
): Array<{ module_id: string; is_active: boolean }> {
  return [...selected].map((module_id) => ({
    module_id,
    is_active: true,
  }));
}

function buildCreatePayload(
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

const STEPS = [
  { step: 1 as const, label: 'Tenant' },
  { step: 2 as const, label: 'Plan & modules' },
  { step: 3 as const, label: 'Admin user' },
];

interface CreateTenantWizardProps {
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
          <FieldGroup className="@container/field-group mx-auto max-w-none gap-4">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="wiz-tenant-name">
                  Tenant name <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="wiz-tenant-name"
                    className="h-9 text-sm"
                    placeholder="e.g., City Diagnostics"
                    {...register('tenantName')}
                  />
                  <FieldError errors={errors.tenantName ? [errors.tenantName] : undefined} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="wiz-slug">
                  Slug (subdomain) <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="wiz-slug"
                    className="h-9 font-mono text-sm"
                    placeholder="e.g., city-diagnostics"
                    {...slugField}
                    onChange={(e) => {
                      slugUserEdited.current = true;
                      slugField.onChange(e);
                    }}
                  />
                  <FieldDescription>
                    Fills with the first letter or digit from the tenant name; edit freely (minimum 3
                    characters).
                  </FieldDescription>
                  <FieldError errors={errors.slug ? [errors.slug] : undefined} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel id="wiz-tenant-type-label">
                  Tenant type <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Controller
                    name="tenantType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          className="h-9 w-full min-w-0 text-sm"
                          aria-labelledby="wiz-tenant-type-label"
                        >
                          <SelectValue placeholder="Select type" className="truncate" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizationTypeOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="wiz-gstin">GSTIN (optional)</FieldLabel>
                <FieldContent>
                  <Input
                    id="wiz-gstin"
                    className="h-9 text-sm"
                    placeholder="15-character GSTIN"
                    {...register('gstin')}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="wiz-pan">PAN number (optional)</FieldLabel>
                <FieldContent>
                  <Input id="wiz-pan" className="h-9 text-sm" placeholder="ABCDE1234F" {...register('pan')} />
                </FieldContent>
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="wiz-website">Website (optional)</FieldLabel>
                <FieldContent>
                  <Input
                    id="wiz-website"
                    className="h-9 text-sm"
                    placeholder="https://example.com"
                    {...register('website')}
                  />
                </FieldContent>
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="wiz-hq">
                  HQ address line 1 <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="wiz-hq"
                    className="h-9 text-sm"
                    placeholder="Street address"
                    {...register('hqAddressLine1')}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="wiz-locality">Locality</FieldLabel>
                <FieldContent>
                  <Input id="wiz-locality" className="h-9 text-sm" placeholder="Locality" {...register('locality')} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="wiz-block">Block</FieldLabel>
                <FieldContent>
                  <Input id="wiz-block" className="h-9 text-sm" placeholder="Block" {...register('block')} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="wiz-district">
                  District <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input id="wiz-district" className="h-9 text-sm" placeholder="District" {...register('district')} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel id="wiz-state-label">
                  State <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Controller
                    name="state"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger
                          className="h-9 w-full min-w-0 text-sm"
                          aria-labelledby="wiz-state-label"
                        >
                          <SelectValue placeholder="Select state" className="truncate" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATE_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="wiz-pin">
                  PIN code <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="wiz-pin"
                    className="h-9 text-sm"
                    placeholder="123456"
                    maxLength={6}
                    {...register('pinCode')}
                  />
                </FieldContent>
              </Field>
            </div>
          </FieldGroup>
        )}

        {activeStep === 2 && (
          <FieldGroup className="mx-auto max-w-none gap-4">
            <Field>
              <FieldLabel id="wiz-plan-label">
                Plan <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Controller
                  name="planSlug"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className="h-9 w-full max-w-xl text-sm"
                        aria-labelledby="wiz-plan-label"
                      >
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldTitle className="text-xs font-semibold">Module overrides (optional)</FieldTitle>
              <FieldDescription>
                Enable modules outside the selected plan. These will be enabled as overrides for this
                tenant.
              </FieldDescription>
              <FieldContent className="mt-2 min-w-0">
                {modulesLoading ? (
                  <p className="text-xs text-muted-foreground">Loading modules…</p>
                ) : rootModules.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No modules in master data. Add modules under Master Data first.
                  </p>
                ) : (
                  <ModuleOverrideTree
                    roots={rootModules}
                    childMap={childMap}
                    selected={moduleOverrideIds}
                    toggle={toggleModule}
                  />
                )}
              </FieldContent>
            </Field>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="wiz-trial">Trial end date (optional)</FieldLabel>
                <FieldContent>
                  <Input id="wiz-trial" className="h-9 max-w-xs text-sm" type="date" {...register('trialEndDate')} />
                </FieldContent>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="wiz-max-users">Max users override (optional)</FieldLabel>
                <FieldContent>
                  <Input
                    id="wiz-max-users"
                    className="h-9 text-sm"
                    inputMode="numeric"
                    placeholder="Leave empty for plan default"
                    {...register('maxUsersOverride')}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="wiz-max-branches">Max branches override (optional)</FieldLabel>
                <FieldContent>
                  <Input
                    id="wiz-max-branches"
                    className="h-9 text-sm"
                    inputMode="numeric"
                    placeholder="Leave empty for plan default"
                    {...register('maxBranchesOverride')}
                  />
                </FieldContent>
              </Field>
            </div>
          </FieldGroup>
        )}

        {activeStep === 3 && (
          <FieldGroup className="mx-auto max-w-none gap-4">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="wiz-afn">
                  Admin first name <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input id="wiz-afn" className="h-9 text-sm" placeholder="First name" {...register('adminFirstName')} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="wiz-aln">
                  Admin last name <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input id="wiz-aln" className="h-9 text-sm" placeholder="Last name" {...register('adminLastName')} />
                </FieldContent>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="wiz-aemail">
                Admin email <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="wiz-aemail"
                  className="h-9 text-sm"
                  type="email"
                  placeholder="admin@example.com"
                  {...register('adminEmail')}
                />
                <FieldDescription>Used as tenant contact email for now.</FieldDescription>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="wiz-amobile">
                Admin mobile <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="wiz-amobile"
                  className="h-9 text-sm"
                  placeholder="+919876543210"
                  {...register('adminMobile')}
                />
                <FieldDescription>Used as tenant contact phone for now.</FieldDescription>
              </FieldContent>
            </Field>
            <Field className="rounded-lg border bg-muted/20 p-4">
              <FieldContent className="flex flex-row items-start gap-3">
                <Controller
                  name="sendInvitation"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                      id="wiz-invite"
                      className="mt-0.5"
                    />
                  )}
                />
                <FieldLabel
                  htmlFor="wiz-invite"
                  className="w-full cursor-pointer text-xs font-normal leading-snug"
                >
                  Send invitation email (user sets password via link). If unchecked, set password
                  below and share manually. (Invitation flow is not wired yet — stored in this form
                  only.)
                </FieldLabel>
              </FieldContent>
            </Field>
            {!sendInvitation && (
              <FieldGroup className="gap-4 rounded-lg border bg-muted/20 p-4">
                <Field>
                  <FieldDescription>
                    If you set a password here, the admin could log in immediately once user management
                    is connected. For now this stays on the client only.
                  </FieldDescription>
                </Field>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="wiz-pw">Optional password (min 8 chars)</FieldLabel>
                    <FieldContent>
                      <Input
                        id="wiz-pw"
                        className="h-9 text-sm"
                        type="password"
                        autoComplete="new-password"
                        {...register('password')}
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="wiz-pw2">Confirm optional password</FieldLabel>
                    <FieldContent>
                      <Input
                        id="wiz-pw2"
                        className="h-9 text-sm"
                        type="password"
                        autoComplete="new-password"
                        {...register('confirmPassword')}
                      />
                    </FieldContent>
                  </Field>
                </div>
              </FieldGroup>
            )}
            <Field>
              <FieldLabel htmlFor="wiz-welcome">Welcome message (optional)</FieldLabel>
              <FieldContent>
                <Textarea
                  id="wiz-welcome"
                  rows={3}
                  maxLength={500}
                  className="min-h-[72px] resize-y text-sm"
                  placeholder="Custom message to append to invitation email…"
                  {...register('welcomeMessage')}
                />
                <FieldDescription>{welcomeLen}/500 characters</FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>
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
