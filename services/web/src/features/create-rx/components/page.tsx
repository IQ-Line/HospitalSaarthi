import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TwoColumnLayout } from '@pulse/layouts/two-column-layout';
import { Button } from '@pulse/ui/button';
import { Skeleton } from '@pulse/ui/skeleton';
import { opdPatientsQueryKeys } from '@/features/opd-patients/api/query-keys';
import { resolveOpdConsultationTenantId } from '@/features/opd-patients/lib/opd-consultation-tenant';
import { updateRegistrationVisitStatus } from '@/features/frontdesk/api/registrations';
import {
  bootstrapOpdPrescriptionForVisit,
  endConsultation,
  fetchOpdPrescriptionSession,
  saveOpdPrescriptionDraft,
} from '../api/opd-prescription';
import { fetchCreateRxVisitContext } from '../api/visit-context';
import {
  prepareCreateRxFormDataForSession,
  sanitizeCreateRxFormDataForPersist,
} from '../lib/form-data-session';
import {
  validateVisitpadForm,
  VISITPAD_SECTION_LABELS,
} from '../lib/visitpad-validation';
import { resolveCreateRxSession } from '../lib/resolve-create-rx-session';
import { useCreateRxStore } from '../create-rx.store';
import { ConsultationStatusModal } from './consultation-status-modal';
import { DocumentsTab } from './documents-tab';
import { Header } from './header';
import { MainTabs } from './main-tabs';
import { PatientProfile } from './patient-profile';
import { RightPanel } from './right-panel';
import { VisitPad } from './visit-pad';
import { useCapability } from '@/hooks/use-capability';
import { OPD_PATIENT_UPDATE } from '@/lib/runtime-capability-keys';

interface PageProps {
  visitId: string;
  /** Registration/queue patient id when ``visitId`` is not the EMPI patient id (Start RX). */
  patientId?: string;
  mode?: 'edit' | 'view';
  /** False when opening a brand-new consultation (Start RX). Defaults to true. */
  loadPrescription?: boolean;
}

export function Page({
  visitId,
  patientId,
  mode = 'edit',
  loadPrescription = true,
}: PageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loading = useCreateRxStore((s) => s.loading);
  const context = useCreateRxStore((s) => s.context);
  const opdPrescriptionId = useCreateRxStore((s) => s.opdPrescriptionId);
  const activeMainTab = useCreateRxStore((s) => s.activeMainTab);
  const resetForVisit = useCreateRxStore((s) => s.resetForVisit);
  const setLoading = useCreateRxStore((s) => s.setLoading);
  const setActiveSectionTab = useCreateRxStore((s) => s.setActiveSectionTab);
  const setVisitpadFieldErrors = useCreateRxStore((s) => s.setVisitpadFieldErrors);
  const clearVisitpadFieldErrors = useCreateRxStore((s) => s.clearVisitpadFieldErrors);
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [endingConsultation, setEndingConsultation] = useState(false);
  const canUpdatePatient = useCapability(OPD_PATIENT_UPDATE);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (!resolveOpdConsultationTenantId()) {
          toast.error('Tenant context is missing. Sign in again and retry.');
          resetForVisit(null, false);
          return;
        }

        let prescription = loadPrescription
          ? await fetchOpdPrescriptionSession(visitId)
          : null;

        const patientKey = prescription?.patient_id ?? patientId?.trim() ?? visitId;
        if (!prescription && patientId?.trim()) {
          try {
            prescription = await bootstrapOpdPrescriptionForVisit(visitId, patientId);
          } catch {
            /* End/save will auto-ensure on server; ignore if OPD unreachable here */
          }
        }

        if (mode === 'edit' && visitId.trim()) {
          try {
            await updateRegistrationVisitStatus(visitId.trim(), 'in_progress');
          } catch {
            /* Non-blocking — save/end will still attempt status updates */
          }
        }
        const ctx = await fetchCreateRxVisitContext(patientKey);
        if (cancelled) return;
        if (!ctx) {
          resetForVisit(null, false);
          return;
        }

        if (prescription) {
          ctx.visit.id = prescription.visit_id;
        } else {
          ctx.visit.id = visitId;
        }
        const session = resolveCreateRxSession(ctx, mode, prescription);
        const formData = prepareCreateRxFormDataForSession(
          prescription?.form_data,
          session.isReadOnly,
        );
        resetForVisit(session.context, session.isReadOnly, formData, session.prescriptionId);
        void queryClient.invalidateQueries({ queryKey: opdPatientsQueryKeys.all });
      } catch {
        if (!cancelled) {
          toast.error('Failed to load consultation.');
          resetForVisit(null, false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [visitId, mode, loadPrescription, resetForVisit, setLoading, queryClient]);

  const persistDraft = async () => {
    const visit = context?.visit;
    const patientId = context?.patient.id;
    if (!visit?.id || !patientId) return false;

    try {
      const formData = sanitizeCreateRxFormDataForPersist(useCreateRxStore.getState().formData);
      const saved = await saveOpdPrescriptionDraft(
        visit.id,
        patientId,
        formData,
        opdPrescriptionId,
      );
      resetForVisit(
        {
          ...context,
          visit: { ...context.visit, id: saved.visit_id },
        },
        useCreateRxStore.getState().isReadOnly,
        prepareCreateRxFormDataForSession(saved.form_data, saved.is_read_only),
        saved.prescription_id,
      );
      toast.success('Prescription draft saved');
      return true;
    } catch {
      toast.error('Failed to save prescription draft.');
      return false;
    }
  };

  const applyVisitpadValidationErrors = () => {
    const rawFormData = useCreateRxStore.getState().formData;
    const validation = validateVisitpadForm(rawFormData, { requireChiefComplaint: true });
    if (validation.isValid) {
      clearVisitpadFieldErrors();
      return true;
    }

    setVisitpadFieldErrors(validation.errors);
    if (validation.firstSectionTab) {
      setActiveSectionTab(validation.firstSectionTab);
    }
    const sectionNames = validation.invalidSections
      .map((section) => VISITPAD_SECTION_LABELS[section])
      .join(', ');
    toast.error(`Complete required fields in: ${sectionNames}`);
    return false;
  };

  const handleContinueConsultation = async () => {
    const saved = await persistDraft();
    if (saved) {
      setConsultationModalOpen(false);
    }
  };

  const handleEndConsultation = async () => {
    if (!applyVisitpadValidationErrors()) {
      setConsultationModalOpen(false);
      return;
    }

    const visit = context?.visit;
    const patientId = context?.patient.id;
    if (!visit?.id || !patientId) return;

    setEndingConsultation(true);
    try {
      const formData = sanitizeCreateRxFormDataForPersist(useCreateRxStore.getState().formData);
      await endConsultation(visit.id, patientId, formData, opdPrescriptionId);
      void queryClient.invalidateQueries({ queryKey: opdPatientsQueryKeys.all });
      setConsultationModalOpen(false);
      toast.success('Consultation ended. Patient status updated to Consulted.');
      void navigate({ to: '/patients' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to end consultation.';
      toast.error(message);
    } finally {
      setEndingConsultation(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 bg-gray-50 p-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-gray-50 p-12">
        <p className="text-muted-foreground">Visit not found.</p>
        <Button type="button" variant="outline" asChild>
          <Link to="/patients">Back to Patients</Link>
        </Button>
      </div>
    );
  }

  const centerContent =
    activeMainTab === 'visitpad' ? (
      <VisitPad onSaveClick={() => canUpdatePatient && setConsultationModalOpen(true)} />
    ) : activeMainTab === 'documents' ? (
      <DocumentsTab />
    ) : (
      <PatientProfile />
    );

  return (
    <div className="flex h-[calc(100dvh-2.5rem)] min-h-0 flex-col overflow-hidden bg-gray-50">
      <div className="shrink-0 bg-white px-2 pt-2 md:px-3">
        <Header />
        <MainTabs />
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <TwoColumnLayout
          className="h-full"
          defaultLeftWidth={74}
          defaultRightWidth={26}
          minLeftWidth={50}
          minRightWidth={22}
          noPadding
          scrollable={false}
          left={centerContent}
          right={<RightPanel />}
          leftClassName="min-h-0 overflow-hidden bg-white"
          rightClassName="min-h-0 overflow-hidden"
          rightBodyClassName="h-full overflow-hidden"
        />
      </div>
      <ConsultationStatusModal
        open={consultationModalOpen}
        onOpenChange={setConsultationModalOpen}
        onContinue={() => void handleContinueConsultation()}
        onEndConsultation={() => void handleEndConsultation()}
        ending={endingConsultation}
        canMutate={canUpdatePatient}
      />
    </div>
  );
}
