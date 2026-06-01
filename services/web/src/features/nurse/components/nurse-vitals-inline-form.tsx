import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { VitalsGrid } from '@/features/create-rx/components/vitals-grid';
import { useCreateRxStore } from '@/features/create-rx/create-rx.store';
import { prepareCreateRxFormDataForSession } from '@/features/create-rx/lib/form-data-session';
import type { CreateRxFormData } from '@/features/create-rx/types';
import { fetchOpdPrescriptionSession, saveNursePreConsult } from '../api/nurse-prescription';
import { nursePatientsQueryKeys } from '../api/query-keys';

interface NurseVitalsInlineFormProps {
  visitId: string;
  patientId: string;
  readOnly?: boolean;
  onCancel: () => void;
  onSaved: () => void;
}

export function NurseVitalsInlineForm({
  visitId,
  patientId,
  readOnly = false,
  onCancel,
  onSaved,
}: NurseVitalsInlineFormProps) {
  const queryClient = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const resetForVisit = useCreateRxStore((s) => s.resetForVisit);
  const formData = useCreateRxStore((s) => s.formData);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const session = await fetchOpdPrescriptionSession(visitId, patientId);
        if (cancelled) return;
        const initial = prepareCreateRxFormDataForSession(session?.form_data, readOnly);
        resetForVisit(null, readOnly, initial);
        setHydrated(true);
      } catch {
        if (!cancelled) {
          resetForVisit(null, readOnly, prepareCreateRxFormDataForSession(undefined, readOnly));
          setHydrated(true);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [visitId, patientId, readOnly, resetForVisit]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateRxFormData) => saveNursePreConsult(visitId, data),
    onSuccess: () => {
      toast.success('Vitals saved');
      void queryClient.invalidateQueries({ queryKey: nursePatientsQueryKeys.all });
      onSaved();
    },
    onError: () => {
      toast.error('Failed to save vitals');
    },
  });

  if (!hydrated) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading vitals…</p>;
  }

  return (
    <div className="border-t border-gray-100 bg-[#FAFAFA] px-4 py-4">
      <VitalsGrid />
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {readOnly ? 'Close' : 'Cancel'}
        </Button>
        {!readOnly ? (
          <Button
            type="button"
            size="sm"
            className="bg-[#0d9488] text-white hover:bg-[#0f766e]"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(formData)}
          >
            Save Vitals
          </Button>
        ) : null}
      </div>
    </div>
  );
}
