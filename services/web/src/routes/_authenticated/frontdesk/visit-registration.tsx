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
import {
  RegistrationPatientSection,
  type RegistrationAbhaContext,
} from '@/features/frontdesk/components/registration-patient-section';
import { getAbhaCard } from '@/features/abha/api/m1-enrolment';
import { downloadAbhaCardFile } from '@/features/abha/utils/download-abha-card';
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
  birthDateFromAgeYmd,
  computeBillingGrandTotal,
  hasEnteredAgeYmd,
  isVisitRegistrationFormComplete,
  visitRegistrationBlockHint,
  visitRegistrationFormBlockers,
  defaultVisitRegistrationAddress,
  parseDateOnly,
  startOfLocalDay,
} from '@/features/frontdesk/utils/visit-registration-helpers';
import { ApiError } from '@/lib/api-client';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useSyncRegistrationBillingTariffs } from '@/features/frontdesk/hooks/use-sync-registration-billing-tariffs';
import { useVisitRegistrationTariffs } from '@/features/frontdesk/hooks/use-visit-registration-tariffs';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated/frontdesk/visit-registration')({
  component: VisitRegistrationRoute,
});

type FormValues = CreateVisitRequestBody;

function VisitRegistrationRoute() {
  const [abhaDialogOpen, setAbhaDialogOpen] = useState(false);
  const [abhaDialogFlow, setAbhaDialogFlow] = useState<'create' | 'verify'>('create');
  const { canCreate, canRead } = useCatalogModuleCrud('registration', {
    productModuleSlug: 'frontdesk',
  });
  const [abhaRegistration, setAbhaRegistration] = useState<RegistrationAbhaContext | null>(
    null,
  );
  const [abhaCardDownloading, setAbhaCardDownloading] = useState(false);
  /** Header search UI; patient/registration lookup from form phase is not wired yet. */
  const [formSearchDraft, setFormSearchDraft] = useState('');
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
        abha_address: '',
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
        department_name: '',
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
        registration_fee: { unit_price: 0, tax_percent: 0, discount_percent: 0, discount: 0, item_code: '', service_name: '' },
        consultation_fee: { unit_price: 0, tax_percent: 0, discount_percent: 0, discount: 0, item_code: '', service_name: '' },
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
    billingAmountPaid,
    patientPhone,
    patientFirstName,
    appointmentProviderId,
    appointmentDepartmentId,
    appointmentVisitTypeCode,
    appointmentDepartmentName,
    dateOfBirth,
    ageYears,
    ageMonths,
    ageDays,
  ] = useWatch({
    control: form.control,
    name: [
      'billing.registration_fee',
      'billing.consultation_fee',
      'billing.invoice_discount',
      'billing.payment_mode',
      'billing.amount_paid',
      'patient.phone',
      'patient.first_name',
      'appointment.provider_id',
      'appointment.department_id',
      'appointment.visit_type_code',
      'appointment.department_name',
      'patient.date_of_birth',
      'patient.age_years',
      'patient.age_months',
      'patient.age_days',
    ],
  });

  /** When age fields drive DOB, skip the next DOB→age reaction (avoids overwriting month/day while typing). */
  const skipDobToAgeSyncRef = useRef(false);

  const hasProvider = Boolean(appointmentProviderId?.trim());
  const departmentId = (appointmentDepartmentId ?? '').trim() || null;
  const tariffs = useVisitRegistrationTariffs(departmentId, appointmentProviderId?.trim() || null);

  useSyncRegistrationBillingTariffs(
    form.watch,
    form.setValue,
    tariffs.registrationFeeLine,
    tariffs.consultationFeeLine,
    hasProvider,
  );

  const formGate = {
    phone: patientPhone,
    firstName: patientFirstName,
    departmentId: appointmentDepartmentId,
    providerId: appointmentProviderId,
    visitTypeCode: appointmentVisitTypeCode,
    grandTotal: computeBillingGrandTotal(
      billingRegistrationFee ?? { unit_price: 0, tax_percent: 0, discount_percent: 0, discount: 0 },
      billingConsultationFee ?? { unit_price: 0, tax_percent: 0, discount_percent: 0, discount: 0 },
      billingInvoiceDiscount ?? 0,
    ),
    amountPaid: billingAmountPaid,
    paymentMode: billingPaymentMode,
    hasProvider,
    consultationUnitPrice: billingConsultationFee?.unit_price ?? 0,
    registrationItemCode: billingRegistrationFee?.item_code,
    consultationItemCode: billingConsultationFee?.item_code,
  };
  const canCreateVisit = isVisitRegistrationFormComplete(formGate);
  const createVisitBlockHint = visitRegistrationBlockHint(formGate);

  useEffect(() => {
    if (skipDobToAgeSyncRef.current) {
      skipDobToAgeSyncRef.current = false;
      return;
    }

    const raw = (dateOfBirth ?? '').trim();
    if (!raw) {
      if (!hasEnteredAgeYmd(ageYears, ageMonths, ageDays)) {
        form.setValue('patient.age_years', null, { shouldValidate: false });
        form.setValue('patient.age_months', null, { shouldValidate: false });
        form.setValue('patient.age_days', null, { shouldValidate: false });
      }
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

  useEffect(() => {
    if (!hasEnteredAgeYmd(ageYears, ageMonths, ageDays)) {
      if ((dateOfBirth ?? '').trim()) {
        skipDobToAgeSyncRef.current = true;
        form.setValue('patient.date_of_birth', '', { shouldValidate: false });
      }
      return;
    }

    const y = typeof ageYears === 'number' && !Number.isNaN(ageYears) ? ageYears : 0;
    const mo = typeof ageMonths === 'number' && !Number.isNaN(ageMonths) ? ageMonths : 0;
    const d = typeof ageDays === 'number' && !Number.isNaN(ageDays) ? ageDays : 0;
    const derivedDob = birthDateFromAgeYmd(y, mo, d);
    if ((dateOfBirth ?? '').trim() !== derivedDob) {
      skipDobToAgeSyncRef.current = true;
      form.setValue('patient.date_of_birth', derivedDob, { shouldValidate: false });
    }
  }, [ageYears, ageMonths, ageDays, dateOfBirth, form]);

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
  const pendingAbhaDistrictRef = useRef<string | null>(null);
  const permanentState = useWatch({ control: form.control, name: 'permanent_address.state' });

  const applyPendingAbhaDistrict = () => {
    const districtCode = pendingAbhaDistrictRef.current;
    if (!districtCode || !form.getValues('permanent_address.state')) return;
    form.setValue('permanent_address.district', districtCode, { shouldValidate: true });
    pendingAbhaDistrictRef.current = null;
  };

  useEffect(() => {
    applyPendingAbhaDistrict();
  }, [permanentState, form]);

  const applyAbhaPayloadToForm = (payload: AbhaCreatedPayload) => {
    if (payload.abhaNumber) {
      form.setValue('patient.abha_number', payload.abhaNumber, { shouldValidate: true });
    }
    if (payload.abhaAddress) {
      form.setValue('patient.abha_address', payload.abhaAddress, { shouldValidate: true });
    }

    if (payload.phone) {
      form.setValue('patient.phone', payload.phone, { shouldValidate: true });
    }
    if (payload.firstName) {
      form.setValue('patient.first_name', payload.firstName, { shouldValidate: true });
    }
    if (payload.lastName) {
      form.setValue('patient.last_name', payload.lastName, { shouldValidate: true });
    }
    if (payload.gender) {
      form.setValue('patient.gender', payload.gender, { shouldValidate: true });
    }
    if (payload.dateOfBirth) {
      form.setValue('patient.date_of_birth', payload.dateOfBirth, { shouldValidate: true });
    }

    if (payload.address) {
      const { line1, state, district, pincode } = payload.address;
      if (line1) {
        form.setValue('permanent_address.line1', line1, { shouldValidate: true });
      }
      if (state) {
        form.setValue('permanent_address.state', state, { shouldValidate: true });
        if (district) {
          pendingAbhaDistrictRef.current = district;
        }
      } else if (district) {
        form.setValue('permanent_address.district', district, { shouldValidate: true });
      }
      if (pincode) {
        form.setValue('permanent_address.pincode', pincode, { shouldValidate: true });
      }
      applyPendingAbhaDistrict();
    }
  };

  const handleAbhaCreated = (payload: AbhaCreatedPayload) => {
    applyAbhaPayloadToForm(payload);
    const abhaNumber =
      payload.abhaNumber?.trim() || form.getValues('patient.abha_number')?.trim() || '';
    const abhaAddress =
      payload.abhaAddress?.trim() || form.getValues('patient.abha_address')?.trim() || '';
    if (payload.sessionId || abhaNumber || abhaAddress) {
      setAbhaRegistration({
        sessionId: payload.sessionId ?? '',
        abhaNumber,
        abhaAddress,
      });
    }
    toast.success('ABHA details applied to registration form');
  };

  const handleClearAbhaRegistration = () => {
    form.setValue('patient.abha_number', '', { shouldValidate: false });
    form.setValue('patient.abha_address', '', { shouldValidate: false });
    pendingAbhaDistrictRef.current = null;
    setAbhaRegistration(null);
    toast.message('ABHA details cleared');
  };

  const handleDownloadAbhaCard = async () => {
    const sessionId = abhaRegistration?.sessionId;
    if (!sessionId) {
      toast.error('No ABHA session available for download');
      return;
    }
    setAbhaCardDownloading(true);
    try {
      const res = await getAbhaCard(sessionId);
      downloadAbhaCardFile(res);
      toast.success('ABHA card download started');
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    } finally {
      setAbhaCardDownloading(false);
    }
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
      departmentId: data.appointment?.department_id,
      providerId: data.appointment?.provider_id,
      visitTypeCode: data.appointment?.visit_type_code,
      grandTotal: computeBillingGrandTotal(
        data.billing?.registration_fee ?? { unit_price: 0, tax_percent: 0, discount_percent: 0, discount: 0 },
        data.billing?.consultation_fee ?? { unit_price: 0, tax_percent: 0, discount_percent: 0, discount: 0 },
        data.billing?.invoice_discount ?? 0,
      ),
      amountPaid: data.billing?.amount_paid,
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
      if (blockers.includes('department')) {
        form.setError('appointment.department_id', {
          type: 'required',
          message: 'Department is required',
        });
      }
      if (blockers.includes('doctor')) {
        form.setError('appointment.provider_id', {
          type: 'required',
          message: 'Doctor is required',
        });
      }
      if (blockers.includes('visit type')) {
        form.setError('appointment.visit_type_code', {
          type: 'required',
          message: 'Visit type is required',
        });
      }
      if (blockers.includes('payment mode')) {
        form.setError('billing.payment_mode', {
          type: 'required',
          message: 'Payment mode is required',
        });
      }
      if (blockers.some((b) => b.startsWith('valid amount paid'))) {
        form.setError('billing.amount_paid', {
          type: 'validate',
          message: 'Enter exact total, floor, or ceiling of grand total',
        });
      }
      toast.error(visitRegistrationBlockHint(gate) ?? 'Complete all required fields.');
      return;
    }
    form.clearErrors([
      'patient.phone',
      'patient.first_name',
      'appointment.department_id',
      'appointment.provider_id',
      'appointment.visit_type_code',
      'billing.payment_mode',
    ]);

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
      <div
        className={
          phase === 'form'
            ? 'w-full px-3 py-3 md:px-4 md:py-4'
            : 'mx-auto w-full max-w-[1600px] p-4 md:p-6'
        }
      >
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

          {phase === 'list' && canRead ? (
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

              {listQuery.isError && !(listQuery.error instanceof ApiError && listQuery.error.status === 403) ? (
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-3 lg:mt-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
              <div className="min-w-0 space-y-3">
                {sectionVisible.patientDetails ? (
                  <RegistrationPatientSection
                    form={form}
                    abhaContext={abhaRegistration}
                    onClearAbhaRegistration={handleClearAbhaRegistration}
                    onDownloadAbhaCard={() => void handleDownloadAbhaCard()}
                    abhaCardDownloading={abhaCardDownloading}
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
                    tariffsLoading={tariffs.isLoading}
                    tariffsError={tariffs.isError}
                  />
                ) : null}

                {sectionVisible.billing ? (
                  <VisitRegistrationBillingSection
                    register={form.register}
                    watch={form.watch}
                    setValue={form.setValue}
                    paymentModeError={form.formState.errors.billing?.payment_mode?.message}
                    amountPaidError={form.formState.errors.billing?.amount_paid?.message}
                    variant="detailed"
                    tariffsLoading={tariffs.isLoading}
                    tariffsError={tariffs.isError}
                    hasProvider={hasProvider}
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
                    onClick={() => {
                      form.reset();
                      setAbhaRegistration(null);
                    }}
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

