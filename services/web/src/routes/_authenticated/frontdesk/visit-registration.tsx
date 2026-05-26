import { ChevronLeft, ChevronRight, RotateCcw, Save, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { executeCreateVisitFlow, listRegistrations } from '@/features/frontdesk/api/registrations';
import { CreateAbhaDialog } from '@/features/abha/components/create-abha-dialog';
import type { AbhaCreatedPayload } from '@/features/abha/types';
import { RegistrationFormHeader, RegistrationTodayStatsSidebar } from '@/features/frontdesk/components/registration-form-chrome';
import { RegistrationPatientSection } from '@/features/frontdesk/components/registration-patient-section';
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
  const [abhaDialogOpen, setAbhaDialogOpen] = useState(false);
  const [abhaDialogFlow, setAbhaDialogFlow] = useState<'create' | 'verify'>('create');
  /** Header search UI; patient/registration lookup from form phase is not wired yet. */
  const [formSearchDraft, setFormSearchDraft] = useState('');
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
        payment_mode: 'cash',
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

  const handleAbhaCreated = (payload: AbhaCreatedPayload) => {
    form.setValue('patient.abha_number', payload.abhaNumber, { shouldValidate: true });

    const currentPhone = form.getValues('patient.phone')?.trim();
    if (!currentPhone && payload.phone) {
      form.setValue('patient.phone', payload.phone, { shouldValidate: true });
    }

    const currentFirst = form.getValues('patient.first_name')?.trim();
    if (!currentFirst && payload.firstName) {
      form.setValue('patient.first_name', payload.firstName, { shouldValidate: true });
    }

    const currentLast = form.getValues('patient.last_name')?.trim();
    if (!currentLast && payload.lastName) {
      form.setValue('patient.last_name', payload.lastName, { shouldValidate: true });
    }

    if (payload.gender) {
      form.setValue('patient.gender', payload.gender, { shouldValidate: true });
    }

    const currentDob = form.getValues('patient.date_of_birth')?.trim();
    if (!currentDob && payload.dateOfBirth) {
      form.setValue('patient.date_of_birth', payload.dateOfBirth, { shouldValidate: true });
    }

    if (payload.address) {
      const { line1, state, district, pincode } = payload.address;
      const permanent = form.getValues('permanent_address');

      if (line1 && !permanent.line1?.trim()) {
        form.setValue('permanent_address.line1', line1, { shouldValidate: true });
      }
      if (state && !permanent.state?.trim()) {
        form.setValue('permanent_address.state', state, { shouldValidate: true });
      }
      if (district && !permanent.district?.trim()) {
        form.setValue('permanent_address.district', district, { shouldValidate: true });
      }
      if (pincode && !permanent.pincode?.trim()) {
        form.setValue('permanent_address.pincode', pincode, { shouldValidate: true });
      }
    }

    toast.success('ABHA details applied to registration form');
  };

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
    <div className="bg-background">
      <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
          {phase === 'list' ? (
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Registration</h1>
            <Button type="button" size="sm" onClick={() => setPhase('form')}>
              + New registration
            </Button>
          </header>
          ) : (
          <RegistrationFormHeader
            searchValue={formSearchDraft}
            onSearchChange={setFormSearchDraft}
            onPatientQueue={() => setPhase('list')}
            actions={<VisitRegistrationSectionMenu />}
          />
          )}

          {phase === 'list' ? (
            <div className="mt-6 space-y-4 rounded-lg border border-border bg-card p-4 md:p-5 shadow-sm">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 lg:mt-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
              <div className="min-w-0 space-y-4">
                {sectionVisible.patientDetails ? (
                  <RegistrationPatientSection
                    form={form}
                    onCreateAbha={() => {
                      setAbhaDialogFlow('create');
                      setAbhaDialogOpen(true);
                    }}
                    onVerifyAbha={() => {
                      setAbhaDialogFlow('verify');
                      setAbhaDialogOpen(true);
                    }}
                    patientPhoneRef={patientPhoneRef}
                    patientPhoneName={patientPhoneName}
                    patientPhoneOnBlur={patientPhoneOnBlur}
                    patientPhoneRhfOnChange={patientPhoneRhfOnChange}
                  />
                ) : null}

                <VisitRegistrationClinicalSections
                  register={form.register}
                  watch={form.watch}
                  setValue={form.setValue}
                  visible={{
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
                    variant="compact"
                  />
                ) : null}

                <footer className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={mutation.isPending || !canCreateVisit}
                    title={createVisitBlockHint ?? undefined}
                    className="h-10 gap-2 bg-primary px-6 text-primary-foreground hover:bg-primary/90"
                  >
                    <Save className="size-4" />
                    {mutation.isPending ? 'Saving…' : 'Create Visit'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-2 px-6"
                    onClick={() => form.reset()}
                    disabled={mutation.isPending}
                  >
                    <RotateCcw className="size-4" />
                    Clear
                  </Button>
                </footer>
                {createVisitBlockHint ? (
                  <p className="text-right text-xs text-destructive" role="status">
                    {createVisitBlockHint}
                  </p>
                ) : null}
              </div>

              <RegistrationTodayStatsSidebar />
            </div>
          </form>
          ) : null}
      </div>

      <CreateAbhaDialog
        open={abhaDialogOpen}
        onOpenChange={setAbhaDialogOpen}
        flow={abhaDialogFlow}
        onSuccess={handleAbhaCreated}
      />
    </div>
  );
}

