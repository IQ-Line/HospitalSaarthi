import { RotateCcw, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { executeCreateVisitFlow, fetchVisitTypeDecision, type VisitTypeDecisionResult } from '@/features/frontdesk/api/registrations';
import { indianMobileRegisterOptions } from '@/lib/indian-mobile';
import type { RegistrationReportQueryContext } from '@/features/frontdesk/api/registration-documents';
import {
  RegistrationReportsModal,
  type RegistrationReportView,
} from '@/components/registration-reports-modal';
import { CreateAbhaDialog } from '@/features/abha/components/create-abha-dialog';
import type { AbhaCreatedPayload } from '@/features/abha/types';
import { RegistrationFormHeader, RegistrationTodayStatsSidebar } from '@/features/frontdesk/components/registration-form-chrome';
import {
  ScanShareQueueDialog,
  mergeScanSharePrefill,
  redeemScanShareToken,
  submitScanShareTokenLookup,
  useScanShareStatus,
  type PrefillPayload,
} from '@/features/frontdesk/components/scan-share-queue';
import {
  RegistrationPatientSection,
  type RegistrationAbhaContext,
} from '@/features/frontdesk/components/registration-patient-section';
import { getAbhaCard } from '@/features/abha/api/m1-enrolment';
import { ensurePatientAbhaAddressIdentifier } from '@/features/opd-patients/api/empi-patients';
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
  applyFollowUpPrefill,
  type OpdRegistrationFollowUpState,
} from '@/features/frontdesk/lib/apply-follow-up-prefill';
import {
  ageYmdSinceBirth,
  birthDateFromAgeYmd,
  buildVisitTypeDecisionPatientPayload,
  computeBillingGrandTotal,
  FIRST_VISIT_TYPE_CODE,
  hasEnteredAgeYmd,
  isFollowUpVisitType,
  isVisitRegistrationFormComplete,
  visitRegistrationBlockHint,
  visitRegistrationFormBlockers,
  visitTypeDecisionRequestKey,
  defaultVisitRegistrationAddress,
  parseDateOnly,
  startOfLocalDay,
} from '@/features/frontdesk/utils/visit-registration-helpers';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useSyncRegistrationBillingTariffs } from '@/features/frontdesk/hooks/use-sync-registration-billing-tariffs';
import { useSyncRegistrationAppointmentRoom } from '@/features/frontdesk/hooks/use-sync-registration-appointment-room';
import { useVisitRegistrationTariffs } from '@/features/frontdesk/hooks/use-visit-registration-tariffs';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { useProviderList } from '@/features/user-management/api/queries';
import { useTenantStore } from '@/stores/tenant.store';

type ReportsModalConfig = {
  registrationId: string;
  reportContext: RegistrationReportQueryContext;
  singleView?: RegistrationReportView;
  footerMode: 'registration' | 'list';
};

type FormValues = CreateVisitRequestBody;

type VisitSubmitPayload = CreateVisitRequestBody & { existingPatientId?: string };

export function OpdRegistrationCreatePage() {
  const navigate = useNavigate();
  const followUpFrom = useRouterState({
    select: (s) => (s.location.state as OpdRegistrationFollowUpState | undefined)?.followUpFrom,
  });
  const followUpAppliedRef = useRef<string | null>(null);
  const [abhaDialogOpen, setAbhaDialogOpen] = useState(false);
  const [abhaDialogFlow, setAbhaDialogFlow] = useState<'create' | 'verify'>('create');
  const { canCreate } = useCatalogModuleCrud('registration', {
    productModuleSlug: 'frontdesk',
  });
  const [abhaRegistration, setAbhaRegistration] = useState<RegistrationAbhaContext | null>(
    null,
  );
  const [abhaCardDownloading, setAbhaCardDownloading] = useState(false);
  /** Header search UI; patient/registration lookup from form phase is not wired yet. */
  const [formSearchDraft, setFormSearchDraft] = useState('');
  const [scanShareQueueOpen, setScanShareQueueOpen] = useState(false);
  const [scanShareTokenDraft, setScanShareTokenDraft] = useState('');
  const pendingScanShareTokenRef = useRef<number | null>(null);
  const scanShareStatusQuery = useScanShareStatus();
  const scanShareAvailable = scanShareStatusQuery.data?.available === true;
  const scanShareDisabledReason =
    scanShareStatusQuery.data?.reason ??
    (scanShareStatusQuery.isLoading
      ? 'Checking ABDM scan-and-share…'
      : 'ABDM scan-and-share is not available for this tenant.');
  const tenantName = useTenantStore((s) => s.tenantName);
  const branches = useTenantStore((s) => s.branches);
  const activeBranch = useTenantStore((s) => s.activeBranch);
  const branchName =
    branches.find((b) => b.id === activeBranch)?.name ?? 'Main branch';
  const branchLabel = [tenantName, branchName].filter(Boolean).join(' — ') || 'Noida — Main Branch';

  const [showExtendedPatient, setShowExtendedPatient] = useState(false);
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null);
  const abhaIdentifierSyncKeyRef = useRef<string | null>(null);
  const [visitDecisionMeta, setVisitDecisionMeta] = useState<VisitTypeDecisionResult | null>(null);
  const [isVisitTypeLocked, setIsVisitTypeLocked] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [reportsModal, setReportsModal] = useState<ReportsModalConfig | null>(null);
  const queryClient = useQueryClient();
  const sectionVisible = useVisitRegistrationSectionsStore((s) => s.visible);

  const form = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      branch_id: null,
      patient: {
        phone: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: '',
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

  const applyScanSharePrefill = useCallback(
    (payload: PrefillPayload) => {
      form.reset(mergeScanSharePrefill(form.getValues(), payload.prefill));
      pendingScanShareTokenRef.current = payload.token_number;
      const abha = payload.prefill.patient?.abha_address;
      const abhaNumber = payload.prefill.patient?.abha_number;
      if (abha) {
        setAbhaRegistration({
          sessionId: `scan-share-${payload.token_number}`,
          abhaAddress: abha,
          abhaNumber: abhaNumber ?? '',
        });
      }
    },
    [form],
  );

  const [
    billingRegistrationFee,
    billingConsultationFee,
    billingInvoiceDiscount,
    billingPaymentMode,
    billingAmountPaid,
    patientPhone,
    patientFirstName,
    patientMiddleName,
    patientLastName,
    patientGender,
    patientAbhaNumber,
    patientAbhaAddress,
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
      'patient.middle_name',
      'patient.last_name',
      'patient.gender',
      'patient.abha_number',
      'patient.abha_address',
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
  const providersQuery = useProviderList(null, {
    enabled: true,
    department_id: departmentId ?? undefined,
  });
  const tariffs = useVisitRegistrationTariffs(departmentId, appointmentProviderId?.trim() || null);

  useSyncRegistrationBillingTariffs(
    form.watch,
    form.setValue,
    tariffs.registrationFeeLine,
    tariffs.consultationFeeLine,
    hasProvider,
    visitDecisionMeta?.fee === 0,
  );

  useSyncRegistrationAppointmentRoom(
    departmentId,
    appointmentProviderId?.trim() || null,
    tariffs.consultationRoomNumber,
    form.setValue,
  );
  const resolvedDeskPatientId =
    existingPatientId ?? visitDecisionMeta?.resolved_patient_id ?? null;

  const syncAbhaIdentifierToEmpi = useCallback(async (patientId: string, abhaAddress: string) => {
    const value = abhaAddress.trim();
    if (!value) return;
    const syncKey = `${patientId}:${value}`;
    if (abhaIdentifierSyncKeyRef.current === syncKey) return;
    try {
      await ensurePatientAbhaAddressIdentifier(patientId, value);
      abhaIdentifierSyncKeyRef.current = syncKey;
    } catch {
      // Best-effort — visit submit and visit-type-decision also link.
    }
  }, []);

  const visitTypeDecisionPatient = useMemo(
    () =>
      buildVisitTypeDecisionPatientPayload({
        patientId: resolvedDeskPatientId,
        phone: patientPhone,
        firstName: patientFirstName,
        middleName: patientMiddleName,
        lastName: patientLastName,
        gender: patientGender,
        dateOfBirth,
        ageYears,
        ageMonths,
        ageDays,
        abhaNumber: patientAbhaNumber,
        abhaAddress: patientAbhaAddress,
      }),
    [
      resolvedDeskPatientId,
      patientPhone,
      patientFirstName,
      patientMiddleName,
      patientLastName,
      patientGender,
      dateOfBirth,
      ageYears,
      ageMonths,
      ageDays,
      patientAbhaNumber,
      patientAbhaAddress,
    ],
  );

  useEffect(() => {
    if (!resolvedDeskPatientId || !patientAbhaAddress?.trim()) return;
    void syncAbhaIdentifierToEmpi(resolvedDeskPatientId, patientAbhaAddress);
  }, [resolvedDeskPatientId, patientAbhaAddress, syncAbhaIdentifierToEmpi]);

  const visitTypeDecisionKey = useMemo(
    () =>
      visitTypeDecisionRequestKey(
        (appointmentDepartmentId ?? '').trim(),
        visitTypeDecisionPatient,
      ),
    [appointmentDepartmentId, visitTypeDecisionPatient],
  );
  const debouncedVisitTypeDecisionKey = useDebouncedValue(visitTypeDecisionKey, 300);

  useEffect(() => {
    if (!followUpFrom) return;
    const key = followUpFrom.registration_id;
    if (followUpAppliedRef.current === key) return;
    followUpAppliedRef.current = key;
    applyFollowUpPrefill(followUpFrom, form, {
      setExistingPatientId,
      setAbhaRegistration,
    });
  }, [followUpFrom, form]);

  useEffect(() => {
    const departmentId = (appointmentDepartmentId ?? '').trim();
    if (!departmentId) {
      setVisitDecisionMeta(null);
      setIsVisitTypeLocked(false);
      form.setValue('appointment.visit_type_code', FIRST_VISIT_TYPE_CODE, { shouldValidate: true });
      return;
    }

    const stableKey = visitTypeDecisionRequestKey(departmentId, visitTypeDecisionPatient);
    if (debouncedVisitTypeDecisionKey !== stableKey) return;

    let cancelled = false;
    void fetchVisitTypeDecision({
      department_id: departmentId,
      patient: visitTypeDecisionPatient,
    })
      .then((data) => {
        if (cancelled) return;
        setVisitDecisionMeta(data);
        setIsVisitTypeLocked(data.is_locked);
        form.setValue('appointment.visit_type_code', data.visit_type_code, { shouldValidate: true });
      })
      .catch(() => {
        if (cancelled) return;
        setVisitDecisionMeta(null);
        setIsVisitTypeLocked(false);
        form.setValue('appointment.visit_type_code', FIRST_VISIT_TYPE_CODE, { shouldValidate: true });
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedVisitTypeDecisionKey, appointmentDepartmentId, visitTypeDecisionPatient, form]);

  const visitTypeHint =
    visitDecisionMeta?.consultation_type === 'free-followup' && visitDecisionMeta.valid_till
      ? `Free follow-up valid till ${new Date(visitDecisionMeta.valid_till).toLocaleDateString()} · fee ₹${visitDecisionMeta.fee}`
      : visitDecisionMeta
        ? `Consultation fee ₹${visitDecisionMeta.fee}`
        : null;

  const formGate = {
    phone: patientPhone,
    firstName: patientFirstName,
    gender: patientGender,
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
  } = form.register('patient.phone', indianMobileRegisterOptions());

  const submitIdempotencyKeyRef = useRef<string | undefined>(undefined);

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
      if (pincode) {
        form.setValue('permanent_address.pincode', pincode, { shouldValidate: true });
      }
      if (state) {
        form.setValue('permanent_address.state', state, { shouldValidate: true });
        if (district) {
          form.setValue('permanent_address.district', district, { shouldValidate: true });
        }
      }
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
    const patientId = existingPatientId ?? visitDecisionMeta?.resolved_patient_id ?? null;
    if (patientId && abhaAddress) {
      void syncAbhaIdentifierToEmpi(patientId, abhaAddress);
    }
    toast.success('ABHA details applied to registration form');
  };

  const handleClearAbhaRegistration = () => {
    form.setValue('patient.abha_number', '', { shouldValidate: false });
    form.setValue('patient.abha_address', '', { shouldValidate: false });
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
    mutationFn: (data: VisitSubmitPayload) => {
      const { existingPatientId: patientId, ...formData } = data;
      const idempotencyKey = submitIdempotencyKeyRef.current ?? crypto.randomUUID();
      submitIdempotencyKeyRef.current = idempotencyKey;
      const providerId = formData.appointment?.provider_id?.trim();
      const doctorName = providerId
        ? providersQuery.data?.find((provider) => provider.id === providerId)?.full_name
        : undefined;
      return executeCreateVisitFlow(formData, {
        idempotencyKey,
        existingPatientId: patientId,
        reportMeta: {
          departmentName: formData.appointment?.department_name,
          doctorName,
          facilityName: branchLabel,
        },
      });
    },
    onSettled: () => {
      submitIdempotencyKeyRef.current = undefined;
    },
    onSuccess: (res, variables) => {
      const redeemToken = pendingScanShareTokenRef.current;
      if (redeemToken != null) {
        pendingScanShareTokenRef.current = null;
        void redeemScanShareToken(redeemToken).catch(() => {
          toast.warning(`Visit saved, but token ${redeemToken} could not be cleared`);
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['scan-share', 'active'] });
      void queryClient.invalidateQueries({ queryKey: ['registrations', 'list'] });
      const isFollowUp =
        Boolean(variables.existingPatientId) ||
        isFollowUpVisitType(variables.appointment?.visit_type_code);
      if (isFollowUp) {
        toast.success(
          res.visit_id
            ? `Follow-up visit saved — ${res.visit_id}`
            : 'Follow-up visit saved.',
        );
      } else if (res.patient_uhid) {
        toast.success(`Registration saved — UHID ${res.patient_uhid}`);
      } else {
        toast.success('Registration saved.');
      }
      form.reset();
      setExistingPatientId(null);
      setAbhaRegistration(null);
      setReportsModal({
        registrationId: res.registration_id,
        reportContext: res.report_context,
        footerMode: 'registration',
      });
      setReportsModalOpen(true);
    },
    onError: (err) => {
      toast.error(mutationErrorMessage(err));
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const gate = {
      phone: data.patient?.phone,
      firstName: data.patient?.first_name,
      gender: data.patient?.gender,
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
          message: 'Enter a valid 10-digit mobile number (must start with 6, 7, 8, or 9)',
        });
      }
      if (blockers.includes('first name')) {
        form.setError('patient.first_name', {
          type: 'required',
          message: 'First name is required',
        });
      }
      if (blockers.includes('gender')) {
        form.setError('patient.gender', {
          type: 'required',
          message: 'Gender is required',
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
    if (isFollowUpVisitType(data.appointment?.visit_type_code) && !visitDecisionMeta?.resolved_patient_id && !existingPatientId) {
      toast.error('Use Follow-up on the registrations list for an existing patient.');
      return;
    }
    form.clearErrors([
      'patient.phone',
      'patient.first_name',
      'patient.gender',
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
    mutation.mutate({
      ...payload,
      existingPatientId: visitDecisionMeta?.resolved_patient_id ?? existingPatientId ?? undefined,
    });
  };

  return (
    <div className="bg-background">
      <div className="w-full px-3 py-3 md:px-4 md:py-4">
        <RegistrationFormHeader
          searchValue={formSearchDraft}
          onSearchChange={setFormSearchDraft}
          onPatientQueue={() => setScanShareQueueOpen(true)}
          tokenValue={scanShareTokenDraft}
          onTokenChange={scanShareAvailable ? setScanShareTokenDraft : undefined}
          onTokenSubmit={
            scanShareAvailable
              ? () => {
                  void submitScanShareTokenLookup(scanShareTokenDraft, applyScanSharePrefill);
                }
              : undefined
          }
          scanShareDisabled={!scanShareAvailable}
          scanShareDisabledReason={scanShareDisabledReason}
          actions={<VisitRegistrationSectionMenu />}
        />
        <ScanShareQueueDialog
          open={scanShareQueueOpen}
          onOpenChange={setScanShareQueueOpen}
          onApply={applyScanSharePrefill}
          status={scanShareStatusQuery.data}
          statusLoading={scanShareStatusQuery.isLoading}
          onRefreshStatus={() => void scanShareStatusQuery.refetch()}
        />

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
                    isVisitTypeLocked={isVisitTypeLocked}
                    visitTypeHint={visitTypeHint}
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
      </div>

      <CreateAbhaDialog
        open={abhaDialogOpen}
        onOpenChange={setAbhaDialogOpen}
        flow={abhaDialogFlow}
        onSuccess={handleAbhaCreated}
      />

      {reportsModal ? (
        <RegistrationReportsModal
          open={reportsModalOpen}
          onOpenChange={(open) => {
            setReportsModalOpen(open);
            if (!open) {
              const fromRegistrationFlow = reportsModal.footerMode === 'registration';
              setReportsModal(null);
              if (fromRegistrationFlow) {
                void navigate({ to: '/frontdesk/opd-registration' });
              }
            }
          }}
          registrationId={reportsModal.registrationId}
          reportContext={reportsModal.reportContext}
          singleView={reportsModal.singleView}
          footerMode={reportsModal.footerMode}
        />
      ) : null}
    </div>
  );
}

