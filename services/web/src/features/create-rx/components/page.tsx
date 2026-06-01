import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { TwoColumnLayout } from '@pulse/layouts/two-column-layout';
import { Button } from '@pulse/ui/button';
import { Skeleton } from '@pulse/ui/skeleton';
import { opdPatientsQueryKeys } from '@/features/opd-patients/api/query-keys';
import { resolveOpdConsultationTenantId } from '@/features/opd-patients/lib/opd-consultation-tenant';
import {
  endOpdConsultation,
  fetchOpdPrescriptionSession,
  saveOpdPrescriptionDraft,
} from '../api/opd-prescription';
import { fetchCreateRxVisitContext } from '../api/visit-context';
import { hasAtLeastOneChiefComplaint } from '../lib/chief-complaint-validation';
import {
  prepareCreateRxFormDataForSession,
  sanitizeCreateRxFormDataForPersist,
} from '../lib/form-data-session';
import { resolveCreateRxSession } from '../lib/resolve-create-rx-session';
import { useCreateRxStore } from '../create-rx.store';
import { CreateRxDocumentsTab } from './documents-tab';
import { CreateRxHeader } from './header';
import { CreateRxMainTabs } from './main-tabs';
import { CreateRxPatientProfile } from './patient-profile';
import { CreateRxRightPanel } from './right-panel';
import { CreateRxVisitPad } from './visit-pad';

interface CreateRxPageProps {
  visitId: string;
  mode?: 'edit' | 'view';
  /** False when opening a brand-new consultation (Start RX). Defaults to true. */
  loadPrescription?: boolean;
}

export function CreateRxPage({
  visitId,
  mode = 'edit',
  loadPrescription = true,
}: CreateRxPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loading = useCreateRxStore((s) => s.loading);
  const context = useCreateRxStore((s) => s.context);
  const opdPrescriptionId = useCreateRxStore((s) => s.opdPrescriptionId);
  const activeMainTab = useCreateRxStore((s) => s.activeMainTab);
  const resetForVisit = useCreateRxStore((s) => s.resetForVisit);
  const setLoading = useCreateRxStore((s) => s.setLoading);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const ctx = await fetchCreateRxVisitContext(visitId);
        if (cancelled) return;
        if (!ctx) {
          resetForVisit(null, false);
          return;
        }

        if (!resolveOpdConsultationTenantId()) {
          toast.error('Tenant context is missing. Sign in again and retry.');
          resetForVisit(null, false);
          return;
        }

        const prescription = loadPrescription
          ? await fetchOpdPrescriptionSession(ctx.visit.id, ctx.patient.id)
          : null;
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
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [visitId, mode, loadPrescription, resetForVisit, setLoading, queryClient]);

  const handleSave = async () => {
    const visit = context?.visit;
    const patientId = context?.patient.id;
    if (!visit?.id || !patientId) return;

    try {
      const formData = sanitizeCreateRxFormDataForPersist(useCreateRxStore.getState().formData);
      const saved = await saveOpdPrescriptionDraft(
        visit.id,
        patientId,
        formData,
        opdPrescriptionId,
      );
      resetForVisit(
        context,
        useCreateRxStore.getState().isReadOnly,
        prepareCreateRxFormDataForSession(saved.form_data, saved.is_read_only),
        saved.prescription_id,
      );
      toast.success('Prescription draft saved');
    } catch {
      toast.error('Failed to save prescription draft.');
    }
  };

  const handleEndConsultation = async () => {
    const rawFormData = useCreateRxStore.getState().formData;
    if (!hasAtLeastOneChiefComplaint(rawFormData.chiefComplaints)) {
      toast.error('Add at least one chief complaint before ending consultation.');
      return;
    }

    const visit = context?.visit;
    const patientId = context?.patient.id;
    if (!visit?.id || !patientId) return;

    try {
      const formData = sanitizeCreateRxFormDataForPersist(rawFormData);
      await endOpdConsultation(visit.id, patientId, formData, opdPrescriptionId);
      void queryClient.invalidateQueries({ queryKey: opdPatientsQueryKeys.all });
      toast.success('Consultation ended. Patient status updated to Consulted.');
      void navigate({ to: '/patients' });
    } catch {
      toast.error('Failed to end consultation.');
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
      <CreateRxVisitPad onSave={handleSave} onEndConsultation={handleEndConsultation} />
    ) : activeMainTab === 'documents' ? (
      <CreateRxDocumentsTab />
    ) : (
      <CreateRxPatientProfile />
    );

  return (
    <div className="flex h-[calc(100dvh-2.5rem)] min-h-0 flex-col overflow-hidden bg-gray-50">
      <div className="shrink-0 bg-white px-2 pt-2 md:px-3">
        <CreateRxHeader />
        <CreateRxMainTabs />
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
          right={<CreateRxRightPanel />}
          leftClassName="min-h-0 overflow-hidden bg-white"
          rightClassName="min-h-0 overflow-hidden"
          rightBodyClassName="h-full overflow-hidden"
        />
      </div>
    </div>
  );
}
