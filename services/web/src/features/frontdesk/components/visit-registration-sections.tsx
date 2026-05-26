import { Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  RegistrationFieldLabel,
  RegistrationSection,
} from '@/features/frontdesk/components/registration-form-chrome';
import { Popover, PopoverContent, PopoverTrigger } from '@pulse/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Switch } from '@pulse/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import type { CreateVisitRequestBody } from '@/features/frontdesk/types';
import {
  VISIT_REGISTRATION_SECTION_IDS,
  VISIT_REGISTRATION_SECTION_LABELS,
  useVisitRegistrationSectionsStore,
  type VisitRegistrationSectionId,
} from '@/features/frontdesk/visit-registration-sections.store';
import { useDepartments } from '@/features/master-data/api';
import { useProviderList } from '@/features/user-management/api/queries';
import { useVisitpadVitalsCatalog } from '@/features/visitpad/api';
import type { VisitpadVital } from '@/features/visitpad/types';
import {
  VISIT_REGISTRATION_LAB_TEST_CATALOG,
  VISIT_REGISTRATION_PAYMENT_MODES,
  VISIT_REGISTRATION_RIS_BOOKING_TYPES,
  VISIT_REGISTRATION_RIS_CONTRAST_OPTIONS,
  VISIT_REGISTRATION_RIS_MODALITIES,
  VISIT_REGISTRATION_RIS_PRIORITIES,
  VISIT_REGISTRATION_RIS_STUDY_TYPES,
  VISIT_REGISTRATION_TEXTAREA_CLASS,
  VISIT_REGISTRATION_VISIT_TYPES,
  billingLineNetPrice,
  billingLineTotal,
  computeBillingGrandTotal,
  formatInr,
} from '@/features/frontdesk/utils/visit-registration-helpers';

type FormProps = {
  register: UseFormRegister<CreateVisitRequestBody>;
  watch: UseFormWatch<CreateVisitRequestBody>;
  setValue: UseFormSetValue<CreateVisitRequestBody>;
};

type BillingSectionProps = FormProps & {
  paymentModeError?: string;
};

export function VisitRegistrationSectionMenu() {
  const visible = useVisitRegistrationSectionsStore((s) => s.visible);
  const setSectionVisible = useVisitRegistrationSectionsStore((s) => s.setSectionVisible);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="size-4 shrink-0" />
          Customise sections
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <p className="px-3 pt-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Visible sections
        </p>
        <ul className="border-t border-border">
          {VISIT_REGISTRATION_SECTION_IDS.map((id) => (
            <li
              key={id}
              className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
            >
              <Label htmlFor={`visit-reg-section-${id}`} className="font-normal cursor-pointer">
                {VISIT_REGISTRATION_SECTION_LABELS[id]}
              </Label>
              <Switch
                id={`visit-reg-section-${id}`}
                checked={visible[id] ?? true}
                onCheckedChange={(checked) => setSectionVisible(id, checked === true)}
              />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Lab tests + RIS (each toggled in section menu). */
export function VisitRegistrationClinicalSections({
  register,
  watch,
  setValue,
  visible,
}: FormProps & {
  visible: Pick<Record<VisitRegistrationSectionId, boolean>, 'labTests' | 'risAppointment'>;
}) {
  return (
    <>
      {visible.labTests ? <LabTestsPanel register={register} watch={watch} /> : null}
      {visible.risAppointment ? (
        <RisPanel register={register} watch={watch} setValue={setValue} />
      ) : null}
    </>
  );
}

export function VisitRegistrationAppointmentSection({ register, watch, setValue }: FormProps) {
  const departmentId = watch('appointment.department_id') ?? '';
  const providerId = watch('appointment.provider_id') ?? '';
  const visitTypeCode = watch('appointment.visit_type_code') ?? '';

  const departmentsQuery = useDepartments();
  const departments = departmentsQuery.data?.data ?? [];
  const departmentOptions = useMemo(
    () =>
      departments.filter((d) => d.is_active).map((d) => ({
        value: d.id,
        label: d.name,
      })),
    [departments],
  );

  const selectedDepartmentName = useMemo(
    () => departments.find((d) => d.id === departmentId)?.name ?? null,
    [departments, departmentId],
  );

  const providersQuery = useProviderList(null, {
    department: selectedDepartmentName ?? undefined,
    enabled: !!selectedDepartmentName,
  });
  const doctorOptions = useMemo(() => {
    const providers = providersQuery.data ?? [];
    return providers.map((p) => ({ value: p.id, label: p.full_name }));
  }, [providersQuery.data]);

  const doctorPlaceholder = !selectedDepartmentName
    ? 'Select a department first'
    : providersQuery.isPending
      ? 'Loading doctors…'
      : doctorOptions.length > 0
        ? 'Select doctor'
        : `No doctors in ${selectedDepartmentName}`;

  const departmentPlaceholder = resolveDepartmentPlaceholder(
    departmentsQuery.isPending,
    departmentsQuery.isError,
    departmentOptions.length > 0,
  );

  const consultationFee = watch('billing.consultation_fee') ?? {
    unit_price: 0,
    tax_percent: 0,
    discount: 0,
  };
  const consultationChargeDisplay =
    consultationFee.unit_price > 0
      ? formatInr(consultationFee.unit_price ?? 0)
      : 'Select department & doctor';

  return (
    <RegistrationSection title="Visit Details">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SelectField
          label="Department"
          required
          value={departmentId || '__none__'}
          onValueChange={(v) => {
            setValue('appointment.department_id', v === '__none__' ? '' : v);
            setValue('appointment.provider_id', '');
          }}
          placeholder={departmentPlaceholder}
          disabled={
            departmentsQuery.isPending ||
            departmentsQuery.isError ||
            departmentOptions.length === 0
          }
          options={departmentOptions}
        />
        <Field>
          <RegistrationFieldLabel htmlFor="visit-reg-room">Room Number</RegistrationFieldLabel>
          <Input
            id="visit-reg-room"
            placeholder=""
            className="h-10"
            {...register('appointment.room_number')}
          />
        </Field>
        <SelectField
          label="Doctor"
          required
          value={providerId || '__none__'}
          onValueChange={(v) => setValue('appointment.provider_id', v === '__none__' ? '' : v)}
          placeholder={doctorPlaceholder}
          disabled={!selectedDepartmentName || providersQuery.isPending || doctorOptions.length === 0}
          options={doctorOptions}
        />
        <Field>
          <RegistrationFieldLabel htmlFor="visit-reg-consultation-charge">
            Consultation charge
          </RegistrationFieldLabel>
          <Input
            id="visit-reg-consultation-charge"
            readOnly
            value={consultationChargeDisplay}
            className="h-10 bg-muted/50"
            tabIndex={-1}
          />
        </Field>
        <SelectField
          label="Visit Type"
          required
          value={visitTypeCode || '__none__'}
          onValueChange={(v) => setValue('appointment.visit_type_code', v === '__none__' ? '' : v)}
          placeholder="Select Visit Type"
          options={VISIT_REGISTRATION_VISIT_TYPES.map((vt) => ({
            value: vt.value,
            label: vt.label,
          }))}
        />
      </div>
    </RegistrationSection>
  );
}

export function VisitRegistrationBillingSection({
  register,
  watch,
  setValue,
  paymentModeError,
  variant = 'compact',
}: BillingSectionProps & { variant?: 'compact' | 'detailed' }) {
  const paymentMode = watch('billing.payment_mode') ?? '';

  if (variant === 'compact') {
    return (
      <RegistrationSection title="Billing">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field>
            <RegistrationFieldLabel htmlFor="visit-reg-discount-pct">
              Discount (%)
            </RegistrationFieldLabel>
            <Input
              id="visit-reg-discount-pct"
              type="number"
              min={0}
              max={100}
              className="h-10 tabular-nums"
              {...register('billing.invoice_discount', { valueAsNumber: true })}
            />
          </Field>
          <Field>
            <RegistrationFieldLabel required>Payment Mode</RegistrationFieldLabel>
            <Select
              value={paymentMode || 'cash'}
              onValueChange={(v: string) =>
                setValue('billing.payment_mode', v, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger className="h-10" aria-invalid={paymentModeError ? true : undefined}>
                <SelectValue placeholder="Cash" />
              </SelectTrigger>
              <SelectContent>
                {VISIT_REGISTRATION_PAYMENT_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paymentModeError ? (
              <p className="text-xs text-destructive">{paymentModeError}</p>
            ) : null}
          </Field>
          <Field>
            <RegistrationFieldLabel htmlFor="visit-reg-amount-paid">
              Amount paid
            </RegistrationFieldLabel>
            <Input
              id="visit-reg-amount-paid"
              type="number"
              min={0}
              className="h-10 tabular-nums"
              {...register('billing.amount_paid', { valueAsNumber: true })}
            />
          </Field>
        </div>
      </RegistrationSection>
    );
  }

  const registrationFee = watch('billing.registration_fee') ?? {
    unit_price: 100,
    tax_percent: 0,
    discount: 0,
  };
  const consultationFee = watch('billing.consultation_fee') ?? {
    unit_price: 0,
    tax_percent: 0,
    discount: 0,
  };
  const invoiceDiscount = watch('billing.invoice_discount') ?? 0;

  const regNet = billingLineNetPrice(registrationFee);
  const regTotal = billingLineTotal(registrationFee);
  const consultNet = billingLineNetPrice(consultationFee);
  const consultTotal = billingLineTotal(consultationFee);
  const itemsSubtotal = regTotal + consultTotal;
  const grandTotal = computeBillingGrandTotal(
    registrationFee,
    consultationFee,
    invoiceDiscount,
  );

  return (
    <RegistrationSection title="Billing">
      <div className="relative">
        <Label htmlFor="visit-reg-billing-search" className="sr-only">
          Add billing item
        </Label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="visit-reg-billing-search"
          className="h-10 pl-9"
          placeholder="Add billing item…"
          disabled
          {...register('billing.add_item_search')}
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="w-28 text-right">Unit price</TableHead>
              <TableHead className="w-24 text-right">Tax (%)</TableHead>
              <TableHead className="w-28 text-right">Net price</TableHead>
              <TableHead className="w-28 text-right">Discount (₹)</TableHead>
              <TableHead className="w-28 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <BillingFeeRow
              label="Registration fee"
              unitPricePath="billing.registration_fee.unit_price"
              taxPath="billing.registration_fee.tax_percent"
              discountPath="billing.registration_fee.discount"
              register={register}
              netPrice={regNet}
              total={regTotal}
            />
            <BillingFeeRow
              label="Consultation fee"
              unitPricePath="billing.consultation_fee.unit_price"
              taxPath="billing.consultation_fee.tax_percent"
              discountPath="billing.consultation_fee.discount"
              register={register}
              netPrice={consultNet}
              total={consultTotal}
            />
            <TableRow className="bg-muted/40 font-medium">
              <TableCell>All Items Summary</TableCell>
              <TableCell className="text-right tabular-nums">{formatInr(regNet + consultNet)}</TableCell>
              <TableCell className="text-right text-muted-foreground">—</TableCell>
              <TableCell className="text-right tabular-nums">{formatInr(regNet + consultNet)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(registrationFee.discount + consultationFee.discount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatInr(itemsSubtotal)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={4}>Invoice discount</TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  min={0}
                  className="ml-auto h-9 w-24 text-right tabular-nums"
                  {...register('billing.invoice_discount', { valueAsNumber: true })}
                />
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                -{formatInr(invoiceDiscount)}
              </TableCell>
            </TableRow>
            <TableRow className="bg-muted/60 font-semibold">
              <TableCell colSpan={5}>Grand total</TableCell>
              <TableCell className="text-right text-base tabular-nums">{formatInr(grandTotal)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:justify-end sm:gap-8">
        <Field className="sm:w-48">
          <RegistrationFieldLabel required>Payment mode</RegistrationFieldLabel>
          <Select
            value={paymentMode || '__none__'}
            onValueChange={(v: string) =>
              setValue('billing.payment_mode', v === '__none__' ? '' : v, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger className="h-10" aria-invalid={paymentModeError ? true : undefined}>
              <SelectValue placeholder="Select payment mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select</SelectItem>
              {VISIT_REGISTRATION_PAYMENT_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {paymentModeError ? (
            <p className="text-xs text-destructive">{paymentModeError}</p>
          ) : null}
        </Field>
        <Field className="sm:w-40">
          <RegistrationFieldLabel htmlFor="visit-reg-amount-paid-detailed">
            Amount paid
          </RegistrationFieldLabel>
          <Input
            id="visit-reg-amount-paid-detailed"
            type="number"
            min={0}
            className="h-10 tabular-nums"
            {...register('billing.amount_paid', { valueAsNumber: true })}
          />
        </Field>
      </div>
    </RegistrationSection>
  );
}

function resolveDepartmentPlaceholder(
  isPending: boolean,
  isError: boolean,
  hasOptions: boolean,
): string {
  if (isPending) return 'Loading departments…';
  if (isError) return 'Failed to load departments';
  if (!hasOptions) return 'No departments configured';
  return 'Select department';
}

function LabTestsPanel({
  register,
  watch,
}: {
  register: UseFormRegister<CreateVisitRequestBody>;
  watch: UseFormWatch<CreateVisitRequestBody>;
}) {
  const query = (watch('lab_tests.search_query') ?? '').trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return [];
    return VISIT_REGISTRATION_LAB_TEST_CATALOG.filter((t) => {
      const haystack = `${t.name} ${t.code} ${t.department}`.toLowerCase();
      return haystack.includes(query);
    }).slice(0, 8);
  }, [query]);

  return (
    <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Lab tests
      </h2>
      <Field>
        <Label htmlFor="visit-reg-lab-search" className="sr-only">
          Search lab tests
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="visit-reg-lab-search"
            className="h-10 pl-9"
            placeholder="Search tests by name, code, or department…"
            {...register('lab_tests.search_query')}
          />
        </div>
        {query.length > 0 ? (
          <ul className="rounded-md border border-border divide-y divide-border text-sm max-h-48 overflow-y-auto">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-muted-foreground">No tests match your search.</li>
            ) : (
              matches.map((t) => (
                <li key={t.code} className="px-3 py-2 flex justify-between gap-2">
                  <span>
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground"> ({t.code})</span>
                  </span>
                  <span className="text-muted-foreground shrink-0">{t.department}</span>
                </li>
              ))
            )}
          </ul>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Lab order persistence is not wired yet — search previews the catalog only.
        </p>
      </Field>
    </section>
  );
}

function RisPanel({ register, watch, setValue }: FormProps) {
  const modality = watch('ris_appointment.modality') ?? '';
  const studyType = watch('ris_appointment.study_type') ?? '';
  const priority = watch('ris_appointment.priority') ?? 'routine';
  const bookingType = watch('ris_appointment.booking_type') ?? 'scheduled';
  const contrastRequired = watch('ris_appointment.contrast_required') ?? 'no';
  const studyOptions = modality ? (VISIT_REGISTRATION_RIS_STUDY_TYPES[modality] ?? []) : [];

  return (
    <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          RIS appointment
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Imaging order &amp; slot</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Modality"
          required
          value={modality || '__none__'}
          onValueChange={(v) => {
            const next = v === '__none__' ? '' : v;
            setValue('ris_appointment.modality', next);
            setValue('ris_appointment.study_type', '');
          }}
          placeholder="Select modality"
          options={VISIT_REGISTRATION_RIS_MODALITIES.map((m) => ({
            value: m.value,
            label: m.label,
          }))}
        />
        <SelectField
          label="Study type"
          required
          value={studyType || '__none__'}
          onValueChange={(v) => setValue('ris_appointment.study_type', v === '__none__' ? '' : v)}
          placeholder={modality ? 'Select study type' : 'Pick modality first'}
          disabled={!modality}
          options={studyOptions.map((s) => ({ value: s.value, label: s.label }))}
        />
        <Field>
          <Label htmlFor="visit-reg-ris-body-region">Body region</Label>
          <Input
            id="visit-reg-ris-body-region"
            placeholder="e.g. Brain, Chest"
            className="h-10"
            {...register('ris_appointment.body_region')}
          />
        </Field>
        <SelectField
          label="Priority"
          value={priority || 'routine'}
          onValueChange={(v) => setValue('ris_appointment.priority', v)}
          options={VISIT_REGISTRATION_RIS_PRIORITIES.map((p) => ({
            value: p.value,
            label: p.label,
          }))}
        />
        <SelectField
          label="Booking type"
          value={bookingType || 'scheduled'}
          onValueChange={(v) => setValue('ris_appointment.booking_type', v)}
          options={VISIT_REGISTRATION_RIS_BOOKING_TYPES.map((b) => ({
            value: b.value,
            label: b.label,
          }))}
        />
        <Field>
          <Label htmlFor="visit-reg-ris-scheduled-at">
            Scheduled at <span className="text-destructive">*</span>
          </Label>
          <Input
            id="visit-reg-ris-scheduled-at"
            type="datetime-local"
            className="h-10"
            {...register('ris_appointment.scheduled_at')}
          />
        </Field>
        <Field>
          <Label htmlFor="visit-reg-ris-referring-doctor">Referring doctor</Label>
          <Input
            id="visit-reg-ris-referring-doctor"
            placeholder="Doctor name"
            className="h-10"
            {...register('ris_appointment.referring_doctor')}
          />
        </Field>
        <SelectField
          label="Contrast required"
          value={contrastRequired || 'no'}
          onValueChange={(v) => setValue('ris_appointment.contrast_required', v)}
          options={VISIT_REGISTRATION_RIS_CONTRAST_OPTIONS.map((c) => ({
            value: c.value,
            label: c.label,
          }))}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Field>
          <Label htmlFor="visit-reg-ris-prep">Prep instructions</Label>
          <textarea
            id="visit-reg-ris-prep"
            className={VISIT_REGISTRATION_TEXTAREA_CLASS}
            placeholder="e.g. Fasting 4h, remove metallic objects"
            {...register('ris_appointment.prep_instructions')}
          />
        </Field>
        <Field>
          <Label htmlFor="visit-reg-ris-notes">Notes</Label>
          <textarea
            id="visit-reg-ris-notes"
            className={VISIT_REGISTRATION_TEXTAREA_CLASS}
            placeholder="Allergies, mobility, special considerations"
            {...register('ris_appointment.notes')}
          />
        </Field>
      </div>

      <Field>
        <Label htmlFor="visit-reg-ris-clinical-indication">
          Clinical indication <span className="text-destructive">*</span>
          <span className="font-normal text-muted-foreground"> (AERB justification)</span>
        </Label>
        <textarea
          id="visit-reg-ris-clinical-indication"
          className={VISIT_REGISTRATION_TEXTAREA_CLASS}
          placeholder="Clinical reason for imaging — required for AEBM compliance"
          {...register('ris_appointment.clinical_indication')}
        />
      </Field>
    </section>
  );
}

function Field({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>{children}</div>;
}

function SelectField({
  label,
  required,
  value,
  onValueChange,
  placeholder,
  options,
  disabled,
}: {
  label: string;
  required?: boolean;
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <Field>
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-10">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">{placeholder ?? 'Select'}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function BillingFeeRow({
  label,
  unitPricePath,
  taxPath,
  discountPath,
  register,
  netPrice,
  total,
}: {
  label: string;
  unitPricePath: 'billing.registration_fee.unit_price' | 'billing.consultation_fee.unit_price';
  taxPath: 'billing.registration_fee.tax_percent' | 'billing.consultation_fee.tax_percent';
  discountPath: 'billing.registration_fee.discount' | 'billing.consultation_fee.discount';
  register: UseFormRegister<CreateVisitRequestBody>;
  netPrice: number;
  total: number;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          min={0}
          className="h-9 w-24 ml-auto text-right tabular-nums"
          {...register(unitPricePath, { valueAsNumber: true })}
        />
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          min={0}
          className="h-9 w-20 ml-auto text-right tabular-nums"
          {...register(taxPath, { valueAsNumber: true })}
        />
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatInr(netPrice)}</TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          min={0}
          className="h-9 w-24 ml-auto text-right tabular-nums"
          {...register(discountPath, { valueAsNumber: true })}
        />
      </TableCell>
      <TableCell className="text-right tabular-nums font-medium">{formatInr(total)}</TableCell>
    </TableRow>
  );
}
