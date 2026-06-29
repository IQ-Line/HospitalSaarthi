import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import { FormTable, type FormTableColumn } from '@/features/create-rx/components/form-table';
import { SectionCard } from '@/features/create-rx/components/section-card';
import { VitalsGrid } from '@/features/create-rx/components/vitals-grid';
import { useVisitpadMasters } from '@/features/create-rx/hooks/use-visitpad-masters';
import { useCreateRxStore } from '@/features/create-rx/create-rx.store';
import type { ChiefComplaintRow, CreateRxFormData, ImmunizationRow } from '@/features/create-rx/types';
import { prepareCreateRxFormDataForSession } from '@/features/create-rx/lib/form-data-session';
import { saveNursePreConsult } from '../api/nurse-prescription';
import { nursePatientsQueryKeys } from '../api/query-keys';

const SEVERITY_OPTIONS = [
  { label: 'Mild', value: 'mild' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Severe', value: 'severe' },
];

const DURATION_UNIT_OPTIONS = [
  { label: 'Days', value: 'days' },
  { label: 'Weeks', value: 'weeks' },
  { label: 'Months', value: 'months' },
  { label: 'Years', value: 'years' },
];

interface NursePreConsultPanelProps {
  visitId: string;
}

export function NursePreConsultPanel({ visitId }: NursePreConsultPanelProps) {
  const queryClient = useQueryClient();
  const {
    isLoading: catalogLoading,
    vaccineOptions,
    manufacturerOptions,
    chiefComplaintOptions,
  } = useVisitpadMasters();

  const context = useCreateRxStore((s) => s.context);
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const formData = useCreateRxStore((s) => s.formData);
  const resetForVisit = useCreateRxStore((s) => s.resetForVisit);
  const chiefComplaints = useCreateRxStore((s) => s.formData.chiefComplaints);
  const immunizations = useCreateRxStore((s) => s.formData.immunizations);
  const addComplaintRow = useCreateRxStore((s) => s.addComplaintRow);
  const removeComplaintRow = useCreateRxStore((s) => s.removeComplaintRow);
  const updateComplaintRow = useCreateRxStore((s) => s.updateComplaintRow);
  const addImmunizationRow = useCreateRxStore((s) => s.addImmunizationRow);
  const removeImmunizationRow = useCreateRxStore((s) => s.removeImmunizationRow);
  const updateImmunizationRow = useCreateRxStore((s) => s.updateImmunizationRow);

  const saveMutation = useMutation({
    mutationFn: (data: CreateRxFormData) =>
      saveNursePreConsult(visitId, context?.patient.id ?? '', data),
    onError: () => {
      toast.error('Failed to save');
    },
  });

  const complaintColumns = useMemo<FormTableColumn<ChiefComplaintRow>[]>(
    () => [
      {
        key: 'complaint',
        label: 'Complaint',
        type: 'creatable-select',
        placeholder: 'Search or type complaint',
        options: chiefComplaintOptions,
      },
      { key: 'duration', label: 'Duration', type: 'number', width: '80px', placeholder: '#' },
      {
        key: 'durationUnit',
        label: 'Unit',
        type: 'select',
        width: '100px',
        options: DURATION_UNIT_OPTIONS,
      },
      {
        key: 'severity',
        label: 'Severity',
        type: 'select',
        width: '120px',
        options: SEVERITY_OPTIONS,
      },
    ],
    [chiefComplaintOptions],
  );

  const immunizationColumns = useMemo<FormTableColumn<ImmunizationRow>[]>(
    () => [
      {
        key: 'vaccineName',
        label: 'Vaccine',
        type: 'creatable-select',
        placeholder: 'Search or type vaccine',
        options: vaccineOptions,
      },
      {
        key: 'manufacturer',
        label: 'Manufacturer',
        type: 'creatable-select',
        placeholder: 'Search or type manufacturer',
        options: manufacturerOptions,
      },
      { key: 'lotNumber', label: 'Lot #', width: '100px' },
      { key: 'dateOfDose', label: 'Date', type: 'date', width: '130px' },
      { key: 'doseNumber', label: 'Dose #', width: '70px' },
      { key: 'nextDueDate', label: 'Next Due', type: 'date', width: '130px' },
      { key: 'notes', label: 'Notes' },
    ],
    [vaccineOptions, manufacturerOptions],
  );

  const saveSection = (label: string) => {
    if (isReadOnly) return;
    saveMutation.mutate(formData, {
      onSuccess: (saved) => {
        toast.success(`${label} saved`);
        if (context) {
          resetForVisit(
            context,
            saved.is_read_only,
            prepareCreateRxFormDataForSession(saved.form_data, saved.is_read_only),
            saved.prescription_id,
          );
        }
        void queryClient.invalidateQueries({ queryKey: nursePatientsQueryKeys.all });
      },
    });
  };

  return (
    <div className="space-y-4 p-4 pb-8">
      <SectionCard title="Patient Details">
        <div className="mb-4 flex justify-end">
          {!isReadOnly ? (
            <Button
              type="button"
              size="sm"
              className="bg-[#0d9488] text-white hover:bg-[#0f766e]"
              disabled={saveMutation.isPending}
              onClick={() => saveSection('Vitals')}
            >
              Save Vitals
            </Button>
          ) : null}
        </div>
        <VitalsGrid />
      </SectionCard>

      <SectionCard>
        <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
          {!isReadOnly ? (
            <>
              <Button
                type="button"
                size="sm"
                className="bg-[#0d9488] text-white hover:bg-[#0f766e]"
                disabled={saveMutation.isPending}
                onClick={() => saveSection('Chief complaints')}
              >
                Save
              </Button>
            </>
          ) : null}
        </div>
        <FormTable
          title="Chief Complaints"
          addButtonLabel="Add Complaint"
          columns={complaintColumns}
          rows={chiefComplaints}
          readOnly={isReadOnly}
          catalogLoading={catalogLoading}
          onAdd={addComplaintRow}
          onRemove={removeComplaintRow}
          onUpdate={(i, field, value) =>
            updateComplaintRow(i, field as keyof ChiefComplaintRow, value)
          }
        />
      </SectionCard>

      <SectionCard>
        <div className="mb-2 flex justify-end">
          {!isReadOnly ? (
            <Button
              type="button"
              size="sm"
              className="bg-[#0d9488] text-white hover:bg-[#0f766e]"
              disabled={saveMutation.isPending}
              onClick={() => saveSection('Immunisation details')}
            >
              Save
            </Button>
          ) : null}
        </div>
        <FormTable
          title="Immunisation Details"
          addButtonLabel="Add Immunisation"
          columns={immunizationColumns}
          rows={immunizations}
          readOnly={isReadOnly}
          catalogLoading={catalogLoading}
          onAdd={addImmunizationRow}
          onRemove={removeImmunizationRow}
          onUpdate={(i, field, value) =>
            updateImmunizationRow(i, field as keyof ImmunizationRow, value)
          }
        />
      </SectionCard>
    </div>
  );
}
