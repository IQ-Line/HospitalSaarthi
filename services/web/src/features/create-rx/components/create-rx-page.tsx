import { Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { TwoColumnLayout } from '@pulse/layouts/two-column-layout';
import { Button } from '@pulse/ui/button';
import { Skeleton } from '@pulse/ui/skeleton';
import { getMockCreateRxVisitContext } from '../mock/visit-context.mock';
import { useCreateRxStore } from '../create-rx.store';
import { CreateRxDocumentsTab } from './create-rx-documents-tab';
import { CreateRxHeader } from './create-rx-header';
import { CreateRxMainTabs } from './create-rx-main-tabs';
import { CreateRxPatientProfile } from './create-rx-patient-profile';
import { CreateRxRightPanel } from './create-rx-right-panel';
import { CreateRxVisitPad } from './create-rx-visit-pad';

interface CreateRxPageProps {
  visitId: string;
  mode?: 'edit' | 'view';
}

export function CreateRxPage({ visitId, mode = 'edit' }: CreateRxPageProps) {
  const loading = useCreateRxStore((s) => s.loading);
  const context = useCreateRxStore((s) => s.context);
  const activeMainTab = useCreateRxStore((s) => s.activeMainTab);
  const resetForVisit = useCreateRxStore((s) => s.resetForVisit);
  const setLoading = useCreateRxStore((s) => s.setLoading);

  useEffect(() => {
    setLoading(true);
    const ctx = getMockCreateRxVisitContext(visitId);
    if (!ctx) {
      setLoading(false);
      resetForVisit(null, false);
      return;
    }
    resetForVisit(ctx, mode === 'view' || ctx.visit.status === 'completed');
  }, [visitId, mode, resetForVisit, setLoading]);

  const handleSave = () => {
    toast.success('Prescription draft saved (mock)');
  };

  const handleEndConsultation = () => {
    toast.success('End consultation flow will run when OPD API is wired');
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
