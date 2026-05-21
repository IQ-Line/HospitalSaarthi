import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Printer,
  Search,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm, useWatch, type SubmitHandler, type UseFormRegister } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';
import { Checkbox } from '@pulse/ui/checkbox';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { executeCreateVisitFlow, listRegistrations } from '@/features/frontdesk/api/registrations';
import {
  VisitRegistrationAppointmentSection,
  VisitRegistrationBillingSection,
  VisitRegistrationClinicalSections,
  VisitRegistrationSectionMenu,
} from '@/features/frontdesk/components/visit-registration-sections';
import { useVisitRegistrationSectionsStore } from '@/features/frontdesk/visit-registration-sections.store';
import type { CreateVisitRequestBody } from '@/features/frontdesk/types';
import {
  ageYmdSinceBirth,
  computeBillingGrandTotal,
  isVisitRegistrationFormComplete,
  visitRegistrationBlockHint,
  visitRegistrationFormBlockers,
  defaultVisitRegistrationAddress,
  EMPI_BLOOD_GROUP_OPTIONS,
  formatInr,
  parseDateOnly,
  startOfLocalDay,
} from '@/features/frontdesk/utils/visit-registration-helpers';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated/frontdesk/visit-registration')({
  component: VisitRegistrationRoute,
});

type FormValues = CreateVisitRequestBody;

function VisitRegistrationRoute() {
  const { canCreate } = useCatalogModuleCrud('registration', {
    productModuleSlug: 'frontdesk',
  });
  const tenantName = useTenantStore((s) => s.tenantName);
  const branches = useTenantStore((s) => s.branches);
  const activeBranch = useTenantStore((s) => s.activeBranch);
  const branchName =
    branches.find((b) => b.id === activeBranch)?.name ?? 'Main branch';
  const branchLabel = [tenantName, branchName].filter(Boolean).join(' — ') || 'Noida — Main Branch';

  const [showExtendedPatient, setShowExtendedPatient] = useState(false);
  const [phase, setPhase] = useState<'list' | 'form'>('list');
  const [listSearchDraft, setListSearchDraft] = useState('');
  const listSearch = useDebouncedValue(listSearchDraft.trim(), 300);
  const [listPage, setListPage] = useState(1);
  const queryClient = useQueryClient();
  const sectionVisible = useVisitRegistrationSectionsStore((s) => s.visible);

  useEffect(() => {
    setListPage(1);
  }, [listSearch]);

  const listQuery = useQuery({
    queryKey: ['registrations', 'list', listPage, listSearch],
    queryFn: () =>
      listRegistrations({
        page: listPage,
        limit: 10,
        q: listSearch || undefined,
      }),
    enabled: phase === 'list',
  });

  const form = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      branch_id: null,
      patient: {
        phone: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: 'male',
        date_of_birth: '',
        age_years: null,
        age_months: null,
        age_days: null,
        email: '',
        blood_group: '',
        abha_number: '',
      },
      attendant: {
        relation: 'Father',
        name: '',
        phone: '',
      },
      permanent_address: defaultVisitRegistrationAddress(),
      residential_address: defaultVisitRegistrationAddress(),
      residential_same_as_permanent: true,
      other: {
        education: '',
        occupation: '',
        religion: '',
      },
      notes: {
        referral: '',
        additional: '',
      },
      vitals: {},
      appointment: {
        department_id: '',
        room_number: '',
        provider_id: '',
        visit_type_code: '',
        visit_reason: '',
      },
      lab_tests: {
        search_query: '',
      },
      ris_appointment: {
        modality: '',
        study_type: '',
        body_region: '',
        priority: 'routine',
        booking_type: 'scheduled',
        scheduled_at: '',
        referring_doctor: '',
        contrast_required: 'no',
        prep_instructions: '',
        notes: '',
        clinical_indication: '',
      },
      billing: {
        add_item_search: '',
        registration_fee: { unit_price: 100, tax_percent: 0, discount: 0 },
        consultation_fee: { unit_price: 0, tax_percent: 0, discount: 0 },
        invoice_discount: 0,
        payment_mode: '',
        amount_paid: 0,
      },
    },
  });

  const [
    billingRegistrationFee,
    billingConsultationFee,
    billingInvoiceDiscount,
    billingPaymentMode,
    patientPhone,
    patientFirstName,
    appointmentProviderId,
    dateOfBirth,
  ] = useWatch({
    control: form.control,
    name: [
      'billing.registration_fee',
      'billing.consultation_fee',
      'billing.invoice_discount',
      'billing.payment_mode',
      'patient.phone',
      'patient.first_name',
      'appointment.provider_id',
      'patient.date_of_birth',
    ],
  });

  const hasProvider = Boolean(appointmentProviderId?.trim());
  const formGate = {
    phone: patientPhone,
    firstName: patientFirstName,
    grandTotal: computeBillingGrandTotal(
      billingRegistrationFee ?? { unit_price: 100, tax_percent: 0, discount: 0 },
      billingConsultationFee ?? { unit_price: 0, tax_percent: 0, discount: 0 },
      billingInvoiceDiscount ?? 0,
    ),
    paymentMode: billingPaymentMode,
    hasProvider,
    consultationUnitPrice: billingConsultationFee?.unit_price ?? 0,
  };
  const canCreateVisit = isVisitRegistrationFormComplete(formGate);
  const createVisitBlockHint = visitRegistrationBlockHint(formGate);

  useEffect(() => {
    const raw = (dateOfBirth ?? '').trim();
    if (!raw) {
      form.setValue('patient.age_years', null, { shouldValidate: false });
      form.setValue('patient.age_months', null, { shouldValidate: false });
      form.setValue('patient.age_days', null, { shouldValidate: false });
      return;
    }

    const birth = parseDateOnly(raw);
    if (!birth) return;

    const todayStart = startOfLocalDay(new Date());
    const birthStart = startOfLocalDay(birth);
    if (birthStart > todayStart) {
      form.setValue('patient.age_years', null, { shouldValidate: false });
      form.setValue('patient.age_months', null, { shouldValidate: false });
      form.setValue('patient.age_days', null, { shouldValidate: false });
      return;
    }

    const { years, months, days } = ageYmdSinceBirth(birthStart, todayStart);
    form.setValue('patient.age_years', years, { shouldValidate: false });
    form.setValue('patient.age_months', months, { shouldValidate: false });
    form.setValue('patient.age_days', days, { shouldValidate: false });
  }, [dateOfBirth, form]);

  const watchSame = form.watch('residential_same_as_permanent');
  const patientBloodGroup = form.watch('patient.blood_group');

  const {
    ref: patientPhoneRef,
    onChange: patientPhoneRhfOnChange,
    onBlur: patientPhoneOnBlur,
    name: patientPhoneName,
  } = form.register('patient.phone', {
    required: 'Phone number is required',
    pattern: {
      value: /^\d{10}$/,
      message: 'Enter a 10-digit mobile number (digits only)',
    },
  });

  const submitIdempotencyKeyRef = useRef<string | undefined>(undefined);

  const mutation = useMutation({
    mutationFn: (data: CreateVisitRequestBody) => {
      const idempotencyKey = submitIdempotencyKeyRef.current ?? crypto.randomUUID();
      submitIdempotencyKeyRef.current = idempotencyKey;
      return executeCreateVisitFlow(data, { idempotencyKey });
    },
    onSettled: () => {
      submitIdempotencyKeyRef.current = undefined;
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['registrations', 'list'] });
      if (res.patient_uhid) {
        toast.success(`Registration saved — UHID ${res.patient_uhid}`);
      } else {
        toast.success('Registration saved.');
      }
      setPhase('list');
    },
    onError: (err) => {
      toast.error(mutationErrorMessage(err));
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const gate = {
      phone: data.patient?.phone,
      firstName: data.patient?.first_name,
      grandTotal: computeBillingGrandTotal(
        data.billing?.registration_fee ?? { unit_price: 0, tax_percent: 0, discount: 0 },
        data.billing?.consultation_fee ?? { unit_price: 0, tax_percent: 0, discount: 0 },
        data.billing?.invoice_discount ?? 0,
      ),
      paymentMode: data.billing?.payment_mode,
      hasProvider: Boolean(data.appointment?.provider_id?.trim()),
      consultationUnitPrice: data.billing?.consultation_fee?.unit_price ?? 0,
    };
    const blockers = visitRegistrationFormBlockers(gate);
    if (blockers.length > 0) {
      if (blockers.includes('10-digit phone')) {
        form.setError('patient.phone', {
          type: 'required',
          message: 'Enter a 10-digit mobile number',
        });
      }
      if (blockers.includes('first name')) {
        form.setError('patient.first_name', {
          type: 'required',
          message: 'First name is required',
        });
      }
      if (blockers.includes('payment mode')) {
        form.setError('billing.payment_mode', {
          type: 'required',
          message: 'Payment mode is required',
        });
      }
      toast.error(visitRegistrationBlockHint(gate) ?? 'Complete all required fields.');
      return;
    }
    form.clearErrors(['patient.phone', 'patient.first_name', 'billing.payment_mode']);

    submitIdempotencyKeyRef.current = crypto.randomUUID();
    const payload: CreateVisitRequestBody = {
      ...data,
      residential_address: data.residential_same_as_permanent
        ? { ...data.permanent_address }
        : data.residential_address,
    };
    mutation.mutate(payload);
  };

  return (
    <div className="min-h-full">
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-2.5rem)]">
        <div className="flex-1 p-6 space-y-6 border-r border-border">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {phase === 'list' ? 'Visit registrations' : 'New visit registration'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <Building2 className="size-4 shrink-0" />
                {branchLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {phase === 'form' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPhase('list')}
                >
                  <ArrowLeft className="size-4 shrink-0" />
                  Back to list
                </Button>
              ) : null}
              {phase === 'form' ? <VisitRegistrationSectionMenu /> : null}
              {phase === 'list' && canCreate ? (
                <Button type="button" size="sm" onClick={() => setPhase('form')}>
                  + New registration
                </Button>
              ) : null}
            </div>
          </header>

          {phase === 'list' ? (
            <div className="space-y-4 rounded-lg border border-border bg-card p-4 md:p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Registrations
              </h2>
              <div className="relative max-w-xl">
                <Label htmlFor="reg-list-search" className="sr-only">
                  Search registrations
                </Label>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reg-list-search"
                  value={listSearchDraft}
                  onChange={(e) => setListSearchDraft(e.target.value)}
                  placeholder="Search by UHID, name, or phone number"
                  className="h-10 pl-9"
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Results update as you type. Newest registrations first.
              </p>

              {listQuery.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  {mutationErrorMessage(listQuery.error)}
                </p>
              ) : null}

              {listQuery.isFetching ? (
                <p className="text-sm text-muted-foreground">Loading registrations…</p>
              ) : null}

              {!listQuery.isFetching && listQuery.data ? (
                <>
                  <div className="rounded-md border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Registered</TableHead>
                          <TableHead>UHID</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Visit type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listQuery.data.data.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No registrations match your search.
                            </TableCell>
                          </TableRow>
                        ) : (
                          listQuery.data.data.map((row) => (
                            <TableRow key={row.registration_id}>
                              <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                                {new Date(row.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell className="font-medium tabular-nums">
                                {row.patient_uhid ?? '—'}
                              </TableCell>
                              <TableCell>{row.patient_full_name ?? '—'}</TableCell>
                              <TableCell className="tabular-nums">{row.patient_phone_number ?? '—'}</TableCell>
                              <TableCell>{row.registration_status}</TableCell>
                              <TableCell>{row.visit_type ?? '—'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Page {listQuery.data.page} of {Math.max(1, listQuery.data.total_pages)} —{' '}
                      {listQuery.data.total} total
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={listPage <= 1 || listQuery.isFetching}
                        onClick={() => setListPage((p) => Math.max(1, p - 1))}
                        className="gap-1"
                      >
                        <ChevronLeft className="size-4" />
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          listQuery.data.total_pages === 0 ||
                          listPage >= listQuery.data.total_pages ||
                          listQuery.isFetching
                        }
                        onClick={() => setListPage((p) => p + 1)}
                        className="gap-1"
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {phase === 'form' ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {sectionVisible.patientDetails ? (
            <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Patient details
              </h2>
              <div className="space-y-2">
                <Label htmlFor="visit-reg-phone">Phone number</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-10 shrink-0 items-center rounded-md border border-input bg-muted px-3 text-sm tabular-nums">
                    +91
                  </span>
                  <Input
                    id="visit-reg-phone"
                    name={patientPhoneName}
                    ref={patientPhoneRef}
                    onBlur={patientPhoneOnBlur}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const el = e.target;
                      el.value = el.value.replace(/\D/g, '').slice(0, 10);
                      void patientPhoneRhfOnChange(e);
                    }}
                    className="h-10 min-w-[10rem] flex-1 md:max-w-md"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    placeholder="10-digit mobile"
                  />
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-10 shrink-0 px-3"
                      disabled
                    >
                      Verify ABHA
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-10 shrink-0 px-3"
                      disabled
                    >
                      Create ABHA
                    </Button>
                  </div>
                </div>
                {form.formState.errors.patient?.phone && (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.patient.phone.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>
                    First name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...form.register('patient.first_name', {
                      required: 'First name is required',
                      validate: (v) => Boolean(v?.trim()) || 'First name is required',
                    })}
                  />
                  {form.formState.errors.patient?.first_name ? (
                    <p className="text-sm text-destructive" role="alert">
                      {form.formState.errors.patient.first_name.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Middle name</Label>
                  <Input {...form.register('patient.middle_name')} />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input {...form.register('patient.last_name')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="flex flex-wrap gap-2">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <Button
                      key={g}
                      type="button"
                      size="sm"
                      variant={form.watch('patient.gender') === g ? 'default' : 'outline'}
                      className="capitalize"
                      onClick={() => form.setValue('patient.gender', g)}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4">
                <div className="space-y-2 sm:col-span-3 lg:col-span-1">
                  <Label htmlFor="visit-reg-dob">Date of birth</Label>
                  <div className="relative">
                    <Input
                      id="visit-reg-dob"
                      type="date"
                      className="h-10 w-full pr-10"
                      {...form.register('patient.date_of_birth')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-reg-age-yrs">Yrs</Label>
                  <Input
                    id="visit-reg-age-yrs"
                    type="number"
                    min={0}
                    className="h-10"
                    {...form.register('patient.age_years', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-reg-age-mon">Mon</Label>
                  <Input
                    id="visit-reg-age-mon"
                    type="number"
                    min={0}
                    max={11}
                    className="h-10"
                    {...form.register('patient.age_months', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visit-reg-age-days">Days</Label>
                  <Input
                    id="visit-reg-age-days"
                    type="number"
                    min={0}
                    max={31}
                    className="h-10"
                    {...form.register('patient.age_days', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" {...form.register('patient.email')} />
                </div>
                <div className="space-y-2">
                  <Label>Blood group</Label>
                  <Select
                    value={patientBloodGroup ? patientBloodGroup : '__none__'}
                    onValueChange={(v: string) =>
                      form.setValue('patient.blood_group', v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {EMPI_BLOOD_GROUP_OPTIONS.map((bg) => (
                        <SelectItem key={bg} value={bg}>
                          {bg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <button
                type="button"
                className="text-sm text-primary hover:underline flex items-center gap-1"
                onClick={() => setShowExtendedPatient((v) => !v)}
              >
                {showExtendedPatient ? (
                  <>
                    <ChevronDown className="size-4" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronRight className="size-4" /> Show more (UHID / ABHA)
                  </>
                )}
              </button>
              {showExtendedPatient && (
                <div className="grid gap-4 md:grid-cols-2 border-t border-border pt-4">
                  <div className="space-y-2">
                    <Label>UHID</Label>
                    <Input disabled placeholder="Auto-generated on save" className="opacity-70" />
                  </div>
                  <div className="space-y-2">
                    <Label>ABHA number</Label>
                    <Input {...form.register('patient.abha_number')} placeholder="Dummy" />
                  </div>
                </div>
              )}
            </section>
            ) : null}

            <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Attendant details
              </h2>
              <p className="text-xs text-muted-foreground">
                Dummy fields until attendant workflow is integrated.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Relation to patient</Label>
                  <Select
                    value={form.watch('attendant.relation')}
                    onValueChange={(v: string) => form.setValue('attendant.relation', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Father', 'Mother', 'Spouse', 'Sibling', 'Other'].map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Attendant name</Label>
                  <Input {...form.register('attendant.name')} />
                </div>
                <div className="space-y-2">
                  <Label>Attendant phone</Label>
                  <Input {...form.register('attendant.phone')} />
                </div>
              </div>
            </section>

            <AddressBlock title="Permanent address" prefix="permanent_address" register={form.register} />

            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <Checkbox
                id="same-perm"
                checked={watchSame}
                onCheckedChange={(c: boolean | 'indeterminate') =>
                  form.setValue('residential_same_as_permanent', c === true)
                }
              />
              <Label htmlFor="same-perm" className="font-normal cursor-pointer">
                Same as permanent address
              </Label>
            </div>

            {!watchSame && (
              <AddressBlock title="Residential address" prefix="residential_address" register={form.register} />
            )}

            <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Background
              </h2>
              <p className="text-xs text-muted-foreground">
                Education, occupation, religion — captured on patient profile when integrated.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Education</Label>
                  <Input {...form.register('other.education')} />
                </div>
                <div className="space-y-2">
                  <Label>Occupation</Label>
                  <Input {...form.register('other.occupation')} />
                </div>
                <div className="space-y-2">
                  <Label>Religion</Label>
                  <Input {...form.register('other.religion')} />
                </div>
              </div>
            </section>

            <VisitRegistrationClinicalSections
              register={form.register}
              watch={form.watch}
              setValue={form.setValue}
              visible={{
                vitals: sectionVisible.vitals,
                labTests: sectionVisible.labTests,
                risAppointment: sectionVisible.risAppointment,
              }}
            />

            {sectionVisible.appointmentDetails ? (
              <VisitRegistrationAppointmentSection
                register={form.register}
                watch={form.watch}
                setValue={form.setValue}
              />
            ) : null}

            {sectionVisible.billing ? (
              <VisitRegistrationBillingSection
                register={form.register}
                watch={form.watch}
                setValue={form.setValue}
                paymentModeError={form.formState.errors.billing?.payment_mode?.message}
              />
            ) : null}

            <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Other details
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="visit-reg-referred-by">Referred by</Label>
                  <Input
                    id="visit-reg-referred-by"
                    {...form.register('notes.referral')}
                    placeholder="Referring doctor or source"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="visit-reg-clinical-notes">Notes</Label>
                  <textarea
                    id="visit-reg-clinical-notes"
                    className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    {...form.register('notes.additional')}
                    placeholder="Clinical notes or remarks"
                  />
                </div>
              </div>
            </section>

            <footer className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-background/90 backdrop-blur-sm py-4 md:flex-row md:items-center md:justify-between supports-[backdrop-filter]:bg-background/80">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled>
                  <Printer className="size-4 mr-1" />
                  Print Patient ID
                </Button>
                <Button type="button" variant="outline" size="sm" disabled>
                  <Printer className="size-4 mr-1" />
                  Print Visit Form
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  Total: {formatInr(formGate.grandTotal)}
                  {createVisitBlockHint ? (
                    <span className="text-destructive"> — {createVisitBlockHint}</span>
                  ) : null}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => form.reset()} disabled={mutation.isPending}>
                  Clear
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending || !canCreateVisit}
                  title={createVisitBlockHint}
                >
                  {mutation.isPending ? 'Saving…' : 'Create Visit'}
                </Button>
                <Button type="button" variant="secondary" disabled>
                  Save &amp; Print Labels
                </Button>
              </div>
            </footer>
          </form>
          ) : null}
        </div>

        <aside className="w-full lg:w-72 shrink-0 p-6 bg-muted/30 border-t lg:border-t-0 lg:border-l border-border">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="size-4" />
                Today&apos;s visits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StatRow label="Total visits" value="98" />
              <StatRow label="Doctor consultations pending" value="40" accent="warning" />
              <StatRow label="Doctor consultations done" value="58" accent="success" />
              <p className="text-xs text-muted-foreground pt-2">
                Summary is placeholder data until visit list API is wired.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'warning' | 'success';
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          accent === 'warning'
            ? 'font-semibold text-amber-700'
            : accent === 'success'
              ? 'font-semibold text-emerald-700'
              : 'font-medium'
        }
      >
        {value}
      </span>
    </div>
  );
}

function AddressBlock({
  title,
  prefix,
  register,
}: {
  title: string;
  prefix: 'permanent_address' | 'residential_address';
  register: UseFormRegister<FormValues>;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 md:p-5 space-y-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Address line 1</Label>
          <Input {...register(`${prefix}.line1`)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Address line 2</Label>
          <Input {...register(`${prefix}.line2`)} />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input {...register(`${prefix}.city`)} />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Input {...register(`${prefix}.state`)} />
        </div>
        <div className="space-y-2">
          <Label>District</Label>
          <Input {...register(`${prefix}.district`)} />
        </div>
        <div className="space-y-2">
          <Label>Pincode</Label>
          <Input {...register(`${prefix}.pincode`)} />
        </div>
      </div>
    </section>
  );
}
