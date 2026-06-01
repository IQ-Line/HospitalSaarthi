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
import { useDoctorsForDepartment } from '@/features/billing/hooks/use-doctors-for-department';
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
  VISIT_REGISTRATION_OPD_VISIT_TYPES,
  billingLineDiscountAmount,
  billingLineNetPrice,
  billingLineTaxAmount,
  billingLineTotal,
  VISIT_TYPE_OPD_FIRST,
  computeBillingGrandTotal,
  formatBillingDeduction,
  formatBillingTaxSummary,
  formatInr,
  isVisitRegistrationAmountPaidValid,
} from '@/features/frontdesk/utils/visit-registration-helpers';

type FormProps = {
  register: UseFormRegister<CreateVisitRequestBody>;
  watch: UseFormWatch<CreateVisitRequestBody>;
  setValue: UseFormSetValue<CreateVisitRequestBody>;
};

type BillingSectionProps = FormProps & {
  paymentModeError?: string;
  amountPaidError?: string;
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

export function VisitRegistrationAppointmentSection({
  register,
  watch,
  setValue,
  tariffsLoading = false,
  tariffsError = false,
  visitTypeLoading = false,
}: FormProps & { tariffsLoading?: boolean; tariffsError?: boolean; visitTypeLoading?: boolean }) {
  const departmentId = watch('appointment.department_id') ?? '';
  const providerId = watch('appointment.provider_id') ?? '';
  const visitTypeCode = watch('appointment.visit_type_code') ?? '';

  const departmentsQuery = useDepartments(undefined, { formCatalog: true });
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

  const doctors = useDoctorsForDepartment(departmentId || null, {
    enabled: Boolean(departmentId),
    departmentName: selectedDepartmentName,
  });
  const doctorOptions = doctors.doctorOptions;

  const doctorPlaceholder = !departmentId
    ? 'Select a department first'
    : doctors.isLoading
      ? 'Loading doctors…'
      : doctors.isError
        ? 'Failed to load doctors'
        : doctorOptions.length > 0
          ? 'Select doctor'
          : `No doctors in ${selectedDepartmentName ?? 'this department'}`;

  const departmentPlaceholder = resolveDepartmentPlaceholder(
    departmentsQuery.isPending,
    departmentsQuery.isError,
    departmentOptions.length > 0,
  );

  const consultationFee = watch('billing.consultation_fee') ?? {
    unit_price: 0,
    tax_percent: 0,
    discount_percent: 0,
    discount: 0,
  };
  const consultationChargeDisplay = resolveConsultationChargeLabel({
    tariffsLoading,
    tariffsError,
    selectedDepartmentName,
    providerId,
    consultationFee,
  });

  const patientPhone = watch('patient.phone') ?? '';
  const visitTypePlaceholder = !patientPhone.trim()
    ? 'Enter patient phone first'
    : visitTypeLoading
      ? 'Detecting visit type…'
      : visitTypeCode
        ? undefined
        : 'Detecting visit type…';

  return (
    <RegistrationSection title="Visit Details">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <SelectField
          label="Department"
          required
          value={departmentId || '__none__'}
          onValueChange={(v) => {
            const nextId = v === '__none__' ? '' : v;
            const nextName =
              nextId === ''
                ? ''
                : (departments.find((d) => d.id === nextId)?.name ?? '');
            setValue('appointment.department_id', nextId);
            setValue('appointment.department_name', nextName);
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
            className="h-10 w-full"
            {...register('appointment.room_number')}
          />
        </Field>
        <SelectField
          label="Doctor"
          required
          value={providerId || '__none__'}
          onValueChange={(v) => setValue('appointment.provider_id', v === '__none__' ? '' : v)}
          placeholder={doctorPlaceholder}
          disabled={!departmentId || doctors.isLoading || doctorOptions.length === 0}
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
            className="h-10 w-full bg-muted/50"
            tabIndex={-1}
          />
        </Field>
        <SelectField
          label="Visit Type"
          required
          value={visitTypeCode || '__none__'}
          onValueChange={() => {}}
          placeholder={visitTypePlaceholder ?? 'Select Visit Type'}
          disabled
          options={VISIT_REGISTRATION_OPD_VISIT_TYPES.map((vt) => ({
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
  amountPaidError,
  variant = 'detailed',
  tariffsLoading = false,
  tariffsError = false,
  hasProvider = false,
  isFirstVisit = false,
  hasRegistrationTariff = false,
}: BillingSectionProps & {
  variant?: 'compact' | 'detailed';
  tariffsLoading?: boolean;
  tariffsError?: boolean;
  hasProvider?: boolean;
  isFirstVisit?: boolean;
  hasRegistrationTariff?: boolean;
}) {
  const paymentMode = watch('billing.payment_mode') ?? '';

  if (variant === 'compact') {
    return (
      <RegistrationSection title="Billing">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
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
    discount_percent: 0,
    discount: 0,
  };
  const consultationFee = watch('billing.consultation_fee') ?? {
    unit_price: 0,
    tax_percent: 0,
    discount_percent: 0,
    discount: 0,
  };
  const invoiceDiscount = watch('billing.invoice_discount') ?? 0;
  const amountPaid = watch('billing.amount_paid');

  const regNet = isFirstVisit ? billingLineNetPrice(registrationFee) : 0;
  const regTax = isFirstVisit ? billingLineTaxAmount(registrationFee) : 0;
  const regTotal = isFirstVisit ? billingLineTotal(registrationFee) : 0;
  const consultNet = billingLineNetPrice(consultationFee);
  const consultTax = billingLineTaxAmount(consultationFee);
  const consultTotal = billingLineTotal(consultationFee);
  const itemsSubtotal = regTotal + consultTotal;
  const grandTotal = computeBillingGrandTotal(
    registrationFee,
    consultationFee,
    invoiceDiscount,
    { includeRegistrationFee: isFirstVisit },
  );
  const amountPaidInvalid =
    grandTotal > 0 && !isVisitRegistrationAmountPaidValid(amountPaid, grandTotal);
  const showAmountPaidError = Boolean(amountPaidError) || amountPaidInvalid;

  return (
    <RegistrationSection title="Billing">
      {tariffsError ? (
        <p className="text-sm text-destructive">
          Could not load tariff catalog — check billing access and tariff master rows for this
          tenant.
        </p>
      ) : null}
      {tariffsLoading ? (
        <p className="text-sm text-muted-foreground">Loading charges from tariff catalog…</p>
      ) : null}

      <div className="rounded-md border border-border">
        <Table className={`${BILLING_TABLE_CLASS} [&_th]:!text-center [&_td]:text-center`}>
          <BillingTableColGroup />
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={BILLING_HEAD_CELL}>Tariff type</TableHead>
              <TableHead className={BILLING_HEAD_CELL}>Service</TableHead>
              <TableHead className={BILLING_HEAD_CELL}>Unit price</TableHead>
              <TableHead className={BILLING_HEAD_CELL}>Discount (%)</TableHead>
              <TableHead className={BILLING_HEAD_CELL}>Discount (₹)</TableHead>
              <TableHead className={BILLING_HEAD_CELL}>Net price</TableHead>
              <TableHead className={BILLING_HEAD_CELL}>Tax (%)</TableHead>
              <TableHead className={BILLING_HEAD_CELL}>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFirstVisit ? (
              <BillingFeeRow
                tariffTypeLabel="Registration fee"
                serviceName={
                  registrationFee.service_name?.trim() ||
                  (hasRegistrationTariff || tariffsLoading
                    ? 'Registration fee'
                    : 'Not configured in Tariff Master')
                }
                unitPrice={registrationFee.unit_price}
                taxPercent={registrationFee.tax_percent}
                discountPercentPath="billing.registration_fee.discount_percent"
                discountRsPath="billing.registration_fee.discount"
                register={register}
                setValue={setValue}
                netPrice={regNet}
                taxAmount={regTax}
                total={regTotal}
                muted={tariffsLoading}
              />
            ) : null}
            {hasProvider ? (
              <BillingFeeRow
                tariffTypeLabel="Consultation fee"
                serviceName={
                  consultationFee.service_name?.trim() ||
                  (consultationFee.unit_price > 0 ? 'Consultation' : 'Select department & doctor')
                }
                unitPrice={consultationFee.unit_price}
                taxPercent={consultationFee.tax_percent}
                discountPercentPath="billing.consultation_fee.discount_percent"
                discountRsPath="billing.consultation_fee.discount"
                register={register}
                setValue={setValue}
                netPrice={consultNet}
                taxAmount={consultTax}
                total={consultTotal}
                muted={tariffsLoading || consultationFee.unit_price <= 0}
              />
            ) : null}
            <TableRow className="bg-muted/40 font-medium hover:bg-muted/40">
              <TableCell className={BILLING_LABEL_CELL}>All items summary</TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={BILLING_NUM_CELL}>
                {formatInr(
                  (isFirstVisit ? registrationFee.unit_price : 0) +
                    (hasProvider ? consultationFee.unit_price : 0),
                )}
              </TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={BILLING_NUM_CELL}>
                {formatInr(
                  (isFirstVisit ? billingLineDiscountAmount(registrationFee) : 0) +
                    (hasProvider ? billingLineDiscountAmount(consultationFee) : 0),
                )}
              </TableCell>
              <TableCell className={BILLING_NUM_CELL}>
                {formatInr(regNet + (hasProvider ? consultNet : 0))}
              </TableCell>
              <TableCell className={BILLING_NUM_CELL}>
                {formatBillingTaxSummary(regTax + (hasProvider ? consultTax : 0))}
              </TableCell>
              <TableCell className={BILLING_NUM_CELL}>
                {formatInr(hasProvider ? itemsSubtotal : regTotal)}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-transparent">
              <TableCell className={BILLING_LABEL_CELL}>Invoice discount</TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <BillingNumericInputCell>
                <Input
                  type="number"
                  min={0}
                  className={BILLING_INPUT_CLASS}
                  {...register('billing.invoice_discount', { valueAsNumber: true })}
                />
              </BillingNumericInputCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={`${BILLING_NUM_CELL} text-muted-foreground`}>
                {formatBillingDeduction(invoiceDiscount)}
              </TableCell>
            </TableRow>
            <TableRow className="bg-muted/60 font-semibold hover:bg-muted/60">
              <TableCell className={BILLING_LABEL_CELL}>Grand total</TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={BILLING_EMPTY_CELL}>—</TableCell>
              <TableCell className={`${BILLING_NUM_CELL} text-base font-semibold`}>
                {formatInr(grandTotal)}
              </TableCell>
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
          <RegistrationFieldLabel htmlFor="visit-reg-amount-paid-detailed" required>
            Amount paid
          </RegistrationFieldLabel>
          <Input
            id="visit-reg-amount-paid-detailed"
            type="number"
            min={0}
            step="any"
            className="h-10 tabular-nums"
            aria-invalid={showAmountPaidError ? true : undefined}
            {...register('billing.amount_paid', { valueAsNumber: true })}
          />
          {amountPaidError ? (
            <p className="text-xs text-destructive">{amountPaidError}</p>
          ) : null}
        </Field>
      </div>
    </RegistrationSection>
  );
}

function resolveConsultationChargeLabel(args: {
  tariffsLoading: boolean;
  tariffsError: boolean;
  selectedDepartmentName: string | null;
  providerId: string;
  consultationFee: { unit_price: number; service_name?: string };
}): string {
  if (args.tariffsLoading) return 'Loading…';
  if (args.tariffsError) return 'Tariff catalog unavailable';
  if (!args.selectedDepartmentName || !args.providerId) return 'Select department & doctor';
  if (args.consultationFee.unit_price > 0) {
    const name = args.consultationFee.service_name?.trim();
    return name
      ? `${formatInr(args.consultationFee.unit_price)} — ${name}`
      : formatInr(args.consultationFee.unit_price);
  }
  return 'No consultation tariff for this department & doctor';
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
  return <div className={className ? `space-y-1.5 ${className}` : 'space-y-1.5'}>{children}</div>;
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
        <SelectTrigger className="h-10 w-full">
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

const BILLING_TABLE_CLASS = 'min-w-[44rem] table-fixed';
const BILLING_CELL = 'h-11 px-2 align-middle text-center';
const BILLING_HEAD_CELL = `${BILLING_CELL} !text-center font-medium whitespace-nowrap`;
const BILLING_LABEL_CELL = `${BILLING_CELL} font-medium`;
const BILLING_SERVICE_CELL = `${BILLING_CELL} max-w-0 truncate text-sm text-muted-foreground`;
const BILLING_NUM_CELL = `${BILLING_CELL} tabular-nums`;
const BILLING_EMPTY_CELL = `${BILLING_CELL} text-muted-foreground`;
const BILLING_INPUT_CELL = `${BILLING_CELL} p-1`;
const BILLING_INPUT_CLASS = 'h-8 w-full max-w-[5.25rem] text-center tabular-nums';

function BillingTableColGroup() {
  return (
    <colgroup>
      <col style={{ width: '16%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '15%' }} />
    </colgroup>
  );
}

function BillingNumericInputCell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TableCell className={BILLING_INPUT_CELL}>
      <div className="flex h-full items-center justify-center">{children}</div>
    </TableCell>
  );
}

function BillingFeeRow({
  tariffTypeLabel,
  serviceName,
  unitPrice,
  taxPercent,
  discountPercentPath,
  discountRsPath,
  register,
  setValue,
  netPrice,
  taxAmount,
  total,
  muted = false,
}: {
  tariffTypeLabel: string;
  serviceName: string;
  unitPrice: number;
  taxPercent: number;
  discountPercentPath:
    | 'billing.registration_fee.discount_percent'
    | 'billing.consultation_fee.discount_percent';
  discountRsPath: 'billing.registration_fee.discount' | 'billing.consultation_fee.discount';
  register: UseFormRegister<CreateVisitRequestBody>;
  setValue: UseFormSetValue<CreateVisitRequestBody>;
  netPrice: number;
  taxAmount: number;
  total: number;
  muted?: boolean;
}) {
  const discountPercentReg = register(discountPercentPath, { valueAsNumber: true });
  const discountRsReg = register(discountRsPath, { valueAsNumber: true });

  return (
    <TableRow className={muted ? 'opacity-60' : undefined}>
      <TableCell className={BILLING_LABEL_CELL}>{tariffTypeLabel}</TableCell>
      <TableCell className={BILLING_SERVICE_CELL} title={serviceName}>
        {serviceName}
      </TableCell>
      <TableCell className={BILLING_NUM_CELL}>{formatInr(unitPrice)}</TableCell>
      <BillingNumericInputCell>
        <Input
          type="number"
          min={0}
          max={100}
          className={BILLING_INPUT_CLASS}
          {...discountPercentReg}
          onChange={(e) => {
            void discountPercentReg.onChange(e);
            const pct = Number(e.target.value);
            if (Number.isFinite(pct) && pct >= 0) {
              setValue(discountRsPath, Math.round(unitPrice * pct / 100), {
                shouldDirty: true,
                shouldValidate: true,
              });
            }
          }}
        />
      </BillingNumericInputCell>
      <BillingNumericInputCell>
        <Input type="number" min={0} className={BILLING_INPUT_CLASS} {...discountRsReg} />
      </BillingNumericInputCell>
      <TableCell className={BILLING_NUM_CELL}>{formatInr(netPrice)}</TableCell>
      <TableCell className={BILLING_NUM_CELL}>
        {taxPercent > 0 ? (
          <span className="inline-flex flex-col items-center justify-center gap-0.5 leading-none">
            <span>{taxPercent}%</span>
            <span className="text-xs text-muted-foreground">{formatInr(taxAmount)}</span>
          </span>
        ) : (
          '0'
        )}
      </TableCell>
      <TableCell className={`${BILLING_NUM_CELL} font-medium`}>{formatInr(total)}</TableCell>
    </TableRow>
  );
}
