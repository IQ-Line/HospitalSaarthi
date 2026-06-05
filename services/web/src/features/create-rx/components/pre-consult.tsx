import { useMemo } from 'react';
import {
  useInvalidCellsForSection,
  useSectionHasErrors,
} from '../hooks/use-visitpad-field-errors';
import { useVisitpadMasters } from '../hooks/use-visitpad-masters';
import { useCreateRxStore } from '../create-rx.store';
import type { ChiefComplaintRow, ImmunizationRow } from '../types';
import { FormTable, type FormTableColumn } from './form-table';
import { SectionCard } from './section-card';
import { VitalsGrid } from './vitals-grid';

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

export function PreConsult() {
  const {
    isLoading: catalogLoading,
    vaccineOptions,
    manufacturerOptions,
    chiefComplaintOptions,
  } = useVisitpadMasters();
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const chiefComplaints = useCreateRxStore((s) => s.formData.chiefComplaints);
  const immunizations = useCreateRxStore((s) => s.formData.immunizations);
  const addComplaintRow = useCreateRxStore((s) => s.addComplaintRow);
  const removeComplaintRow = useCreateRxStore((s) => s.removeComplaintRow);
  const updateComplaintRow = useCreateRxStore((s) => s.updateComplaintRow);
  const addImmunizationRow = useCreateRxStore((s) => s.addImmunizationRow);
  const removeImmunizationRow = useCreateRxStore((s) => s.removeImmunizationRow);
  const updateImmunizationRow = useCreateRxStore((s) => s.updateImmunizationRow);
  const chiefComplaintInvalidCells = useInvalidCellsForSection('chiefComplaints');
  const immunizationInvalidCells = useInvalidCellsForSection('immunizations');
  const chiefComplaintsHasErrors = useSectionHasErrors('chiefComplaints');
  const immunizationsHasErrors = useSectionHasErrors('immunizations');

  const complaintColumns = useMemo<FormTableColumn<ChiefComplaintRow>[]>(
    () => [
      {
        key: 'complaint',
        label: 'Complaint',
        type: 'select',
        placeholder: 'Select complaint',
        options: chiefComplaintOptions,
      },
      {
        key: 'severity',
        label: 'Severity',
        type: 'select',
        width: '120px',
        options: SEVERITY_OPTIONS,
      },
      { key: 'duration', label: 'Duration', type: 'number', width: '80px', placeholder: '#' },
      {
        key: 'durationUnit',
        label: 'Unit',
        type: 'select',
        width: '100px',
        options: DURATION_UNIT_OPTIONS,
      },
      { key: 'notes', label: 'Notes', placeholder: 'Notes' },
    ],
    [chiefComplaintOptions],
  );

  const immunizationColumns = useMemo<FormTableColumn<ImmunizationRow>[]>(
    () => [
      {
        key: 'vaccineName',
        label: 'Vaccine',
        type: 'select',
        placeholder: 'Select vaccine',
        options: vaccineOptions,
      },
      {
        key: 'manufacturer',
        label: 'Manufacturer',
        type: 'select',
        placeholder: 'Select manufacturer',
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

  return (
    <div className="space-y-4 p-4 pb-6">
      <SectionCard title="Vitals">
        <VitalsGrid />
      </SectionCard>

      <SectionCard hasError={chiefComplaintsHasErrors}>
        <FormTable
          title="Chief Complaints"
          addButtonLabel="Add Complaint"
          columns={complaintColumns}
          rows={chiefComplaints}
          readOnly={isReadOnly}
          catalogLoading={catalogLoading}
          invalidCells={chiefComplaintInvalidCells}
          highlightSection={chiefComplaintsHasErrors}
          onAdd={addComplaintRow}
          onRemove={removeComplaintRow}
          onUpdate={(i, field, value) =>
            updateComplaintRow(i, field as keyof ChiefComplaintRow, value)
          }
        />
      </SectionCard>

      <SectionCard hasError={immunizationsHasErrors}>
        <FormTable
          title="Immunisation Details"
          addButtonLabel="Add Immunisation"
          columns={immunizationColumns}
          rows={immunizations}
          readOnly={isReadOnly}
          catalogLoading={catalogLoading}
          invalidCells={immunizationInvalidCells}
          highlightSection={immunizationsHasErrors}
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
