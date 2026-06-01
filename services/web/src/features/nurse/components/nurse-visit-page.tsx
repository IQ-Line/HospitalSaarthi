import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { TwoColumnLayout } from '@pulse/layouts/two-column-layout';
import { Button } from '@pulse/ui/button';
import { Skeleton } from '@pulse/ui/skeleton';
import { Header } from '@/features/create-rx/components/header';
import { MainTabs } from '@/features/create-rx/components/main-tabs';
import { RightPanel } from '@/features/create-rx/components/right-panel';
import { fetchCreateRxVisitContextFromServices } from '@/features/create-rx/api/build-visit-context';
import { fetchOpdPrescriptionSession } from '@/features/create-rx/api/opd-prescription';
import { useCreateRxStore } from '@/features/create-rx/create-rx.store';
import { prepareCreateRxFormDataForSession } from '@/features/create-rx/lib/form-data-session';
import { resolveOpdConsultationTenantId } from '@/features/opd-patients/lib/opd-consultation-tenant';
import { NursePreConsultPanel } from './nurse-pre-consult-panel';
import { nursePatientsQueryKeys } from '../api/query-keys';

interface NurseVisitPageProps {
  visitId: string;
}

export function NurseVisitPage({ visitId }: NurseVisitPageProps) {
  const queryClient = useQueryClient();
  const loading = useCreateRxStore((s) => s.loading);
  const context = useCreateRxStore((s) => s.context);
  const activeMainTab = useCreateRxStore((s) => s.activeMainTab);
  const resetForVisit = useCreateRxStore((s) => s.resetForVisit);
  const setLoading = useCreateRxStore((s) => s.setLoading);
  const setActiveMainTab = useCreateRxStore((s) => s.setActiveMainTab);

  useEffect(() => {
    setActiveMainTab('visitpad');
  }, [setActiveMainTab]);

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

        const prescription = await fetchOpdPrescriptionSession(visitId);
        const patientKey = prescription?.patient_id ?? visitId;
        const ctx = await fetchCreateRxVisitContextFromServices(patientKey);
        if (cancelled) return;

        if (!ctx) {
          resetForVisit(null, false);
          return;
        }

        if (prescription) {
          ctx.visit.id = prescription.visit_id;
        }

        const isReadOnly = prescription?.is_read_only ?? false;
        const formData = prepareCreateRxFormDataForSession(
          prescription?.form_data,
          isReadOnly,
        );
        resetForVisit(ctx, isReadOnly, formData, prescription?.prescription_id ?? null);
        void queryClient.invalidateQueries({ queryKey: nursePatientsQueryKeys.all });
      } catch {
        if (!cancelled) {
          toast.error('Failed to load patient visit.');
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
  }, [visitId, resetForVisit, setLoading, queryClient]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="p-6">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/nurse/patients">
            <ArrowLeft className="size-4" />
            Back to patients
          </Link>
        </Button>
        <p className="mt-4 text-muted-foreground">Patient visit could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F5F5F5]">
      <div className="shrink-0 border-b bg-white px-3 py-2 md:px-4">
        <Button type="button" variant="ghost" size="sm" className="mb-2 gap-1" asChild>
          <Link to="/nurse/patients">
            <ArrowLeft className="size-4" />
            OPD Patients
          </Link>
        </Button>
        <Header />
        <MainTabs />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeMainTab === 'visitpad' ? (
          <TwoColumnLayout
            className="h-full"
            scrollable={false}
            noPadding
            defaultLeftWidth={62}
            defaultRightWidth={38}
            left={<NursePreConsultPanel visitId={visitId} />}
            right={<RightPanel />}
            leftClassName="min-w-0"
            rightClassName="hidden min-w-0 lg:flex"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            This tab is not available in the nurse workstation.
          </div>
        )}
      </div>
    </div>
  );
}
