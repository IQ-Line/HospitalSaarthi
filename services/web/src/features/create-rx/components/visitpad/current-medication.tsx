import { useCreateRxStore } from '../../create-rx.store';
import type {
  DiagnosisRow,
  MedicineRow,
  ProcedureRow,
  TestRow,
} from '../../types';
import { CreateRxFormTable, type FormTableColumn } from '../form-table';
import { SectionCard } from '../section-card';
import { SectionHeader } from '../section-header';
import { CreateRxImagingSection } from './imaging-section';

const DIAGNOSIS_COLUMNS: FormTableColumn<DiagnosisRow>[] = [
  { key: 'notes', label: 'Diagnosis', placeholder: 'Add Diagnosis' },
  {
    key: 'certainty',
    label: 'Certainty',
    type: 'select',
    width: '220px',
    options: [
      { label: 'Confirmed', value: 'confirmed' },
      { label: 'Presumed', value: 'presumed' },
    ],
  },
];

const MEDICINE_COLUMNS: FormTableColumn<MedicineRow>[] = [
  { key: 'medicine', label: 'Medicine', placeholder: 'Medicine name' },
  { key: 'dosageForm', label: 'Dosage Form', placeholder: 'Tablet' },
  { key: 'route', label: 'Route', placeholder: 'Oral' },
  { key: 'strength', label: 'Strength', placeholder: '500mg' },
  { key: 'dosage', label: 'Dosage', placeholder: '1-0-1' },
  { key: 'days', label: 'Days', type: 'number', width: '70px' },
  { key: 'frequency', label: 'Frequency', placeholder: 'OD' },
  { key: 'quantity', label: 'Quantity', type: 'number', width: '80px' },
];

const TEST_COLUMNS: FormTableColumn<TestRow>[] = [
  { key: 'testName', label: 'Test Name', placeholder: 'Test name' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Pending', value: 'pending' },
      { label: 'Completed', value: 'completed' },
    ],
  },
];

const PROCEDURE_COLUMNS: FormTableColumn<ProcedureRow>[] = [
  { key: 'procedureName', label: 'Procedure', placeholder: 'Procedure name' },
  { key: 'advisedDate', label: 'Advised Date', type: 'date', width: '130px' },
];

export function CreateRxCurrentMedication() {
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const diagnosis = useCreateRxStore((s) => s.formData.diagnosis);
  const medicines = useCreateRxStore((s) => s.formData.medicines);
  const tests = useCreateRxStore((s) => s.formData.testsRequired);
  const procedures = useCreateRxStore((s) => s.formData.procedures);
  const addDiagnosis = useCreateRxStore((s) => s.addDiagnosisRow);
  const removeDiagnosis = useCreateRxStore((s) => s.removeDiagnosisRow);
  const updateDiagnosis = useCreateRxStore((s) => s.updateDiagnosisRow);
  const addMedicine = useCreateRxStore((s) => s.addMedicineRow);
  const removeMedicine = useCreateRxStore((s) => s.removeMedicineRow);
  const updateMedicine = useCreateRxStore((s) => s.updateMedicineRow);
  const addTest = useCreateRxStore((s) => s.addTestRow);
  const removeTest = useCreateRxStore((s) => s.removeTestRow);
  const updateTest = useCreateRxStore((s) => s.updateTestRow);
  const addProcedure = useCreateRxStore((s) => s.addProcedureRow);
  const removeProcedure = useCreateRxStore((s) => s.removeProcedureRow);
  const updateProcedure = useCreateRxStore((s) => s.updateProcedureRow);

  return (
    <div className="p-4">
      <SectionCard>
        <h3 className="mb-6 text-base font-semibold text-gray-700">Current Medication</h3>
        <div className="space-y-6">
          <div>
            <SectionHeader
              title="Diagnosis"
              addLabel="Add Diagnosis"
              onAdd={addDiagnosis}
              readOnly={isReadOnly}
            />
            <CreateRxFormTable
              title="Diagnosis"
              addButtonLabel="Add Diagnosis"
              columns={DIAGNOSIS_COLUMNS}
              rows={diagnosis}
              readOnly={isReadOnly}
              hideTitle
              hideAdd
              emptyMessage="No diagnoses added. Click 'Add Diagnosis' to begin."
              onAdd={addDiagnosis}
              onRemove={removeDiagnosis}
              onUpdate={(i, field, value) =>
                updateDiagnosis(i, field as keyof DiagnosisRow, value)
              }
            />
          </div>

          <CreateRxFormTable
            title="Medications (Rx)"
            addButtonLabel="Add Medicine"
            indexColumnLabel="Sl. No."
            columns={MEDICINE_COLUMNS}
            rows={medicines}
            readOnly={isReadOnly}
            emptyMessage="No medications added. Click 'Add Medicine' to begin."
            onAdd={addMedicine}
            onRemove={removeMedicine}
            onUpdate={(i, field, value) =>
              updateMedicine(i, field as keyof MedicineRow, value)
            }
          />

          <CreateRxFormTable
            title="Laboratory Test"
            addButtonLabel="Add Test"
            indexColumnLabel="Sl. No."
            columns={TEST_COLUMNS}
            rows={tests}
            readOnly={isReadOnly}
            emptyMessage="No laboratory tests added."
            onAdd={addTest}
            onRemove={removeTest}
            onUpdate={(i, field, value) => updateTest(i, field as keyof TestRow, value)}
          />

          <CreateRxImagingSection />

          <CreateRxFormTable
            title="Procedures"
            addButtonLabel="Add Procedure"
            indexColumnLabel="Sl. No."
            columns={PROCEDURE_COLUMNS}
            rows={procedures}
            readOnly={isReadOnly}
            emptyMessage="No procedures added."
            onAdd={addProcedure}
            onRemove={removeProcedure}
            onUpdate={(i, field, value) =>
              updateProcedure(i, field as keyof ProcedureRow, value)
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}
