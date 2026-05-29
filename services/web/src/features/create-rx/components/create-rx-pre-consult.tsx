import { useCreateRxStore } from '../create-rx.store';
import { CreateRxSectionCard } from './create-rx-section-card';
import type { ChiefComplaintRow, ImmunizationRow } from '../types';
import { CreateRxFormTable, type FormTableColumn } from './create-rx-form-table';
import { CreateRxVitalsGrid } from './create-rx-vitals-grid';

const COMPLAINT_COLUMNS: FormTableColumn<ChiefComplaintRow>[] = [
  { key: 'complaint', label: 'Complaint', placeholder: 'Enter complaint' },
  {
    key: 'severity',
    label: 'Severity',
    type: 'select',
    width: '120px',
    options: [
      { label: 'Mild', value: 'mild' },
      { label: 'Moderate', value: 'moderate' },
      { label: 'Severe', value: 'severe' },
    ],
  },
  { key: 'duration', label: 'Duration', type: 'number', width: '80px', placeholder: '#' },
  {
    key: 'durationUnit',
    label: 'Unit',
    type: 'select',
    width: '100px',
    options: [
      { label: 'Days', value: 'days' },
      { label: 'Weeks', value: 'weeks' },
      { label: 'Months', value: 'months' },
      { label: 'Years', value: 'years' },
    ],
  },
  { key: 'notes', label: 'Notes', placeholder: 'Notes' },
];

const IMMUNIZATION_COLUMNS: FormTableColumn<ImmunizationRow>[] = [
  { key: 'vaccineName', label: 'Vaccine', placeholder: 'Vaccine name' },
  { key: 'manufacturer', label: 'Manufacturer', placeholder: 'Manufacturer' },
  { key: 'lotNumber', label: 'Lot #', width: '100px' },
  { key: 'dateOfDose', label: 'Date', type: 'date', width: '130px' },
  { key: 'doseNumber', label: 'Dose #', width: '70px' },
  { key: 'nextDueDate', label: 'Next Due', type: 'date', width: '130px' },
  { key: 'notes', label: 'Notes' },
];

export function CreateRxPreConsult() {
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const chiefComplaints = useCreateRxStore((s) => s.formData.chiefComplaints);
  const immunizations = useCreateRxStore((s) => s.formData.immunizations);
  const addComplaintRow = useCreateRxStore((s) => s.addComplaintRow);
  const removeComplaintRow = useCreateRxStore((s) => s.removeComplaintRow);
  const updateComplaintRow = useCreateRxStore((s) => s.updateComplaintRow);
  const addImmunizationRow = useCreateRxStore((s) => s.addImmunizationRow);
  const removeImmunizationRow = useCreateRxStore((s) => s.removeImmunizationRow);
  const updateImmunizationRow = useCreateRxStore((s) => s.updateImmunizationRow);

  return (
    <div className="space-y-4 p-4 pb-6">
      <CreateRxSectionCard title="Vitals">
        <CreateRxVitalsGrid />
      </CreateRxSectionCard>

      <CreateRxSectionCard>
        <CreateRxFormTable
            title="Chief Complaints"
            addButtonLabel="Add Complaint"
            columns={COMPLAINT_COLUMNS}
            rows={chiefComplaints}
            readOnly={isReadOnly}
            onAdd={addComplaintRow}
            onRemove={removeComplaintRow}
            onUpdate={(i, field, value) =>
              updateComplaintRow(i, field as keyof ChiefComplaintRow, value)
            }
          />
      </CreateRxSectionCard>

      <CreateRxSectionCard>
        <CreateRxFormTable
            title="Immunisation Details"
            addButtonLabel="Add Immunisation"
            columns={IMMUNIZATION_COLUMNS}
            rows={immunizations}
            readOnly={isReadOnly}
            onAdd={addImmunizationRow}
            onRemove={removeImmunizationRow}
            onUpdate={(i, field, value) =>
              updateImmunizationRow(i, field as keyof ImmunizationRow, value)
            }
          />
      </CreateRxSectionCard>
    </div>
  );
}
