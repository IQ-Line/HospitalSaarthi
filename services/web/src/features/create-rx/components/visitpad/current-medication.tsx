import { useCallback, useMemo, useRef } from 'react';
import { fetchVisitpadMedicineById } from '@/features/visitpad/api';
import {
  findVisitpadMedicineByDisplayName,
  findVisitpadProcedureByDisplayName,
} from '../../lib/visitpad-catalog-options';
import {
  buildCatalogMedicineDefaults,
  resolveMedicineQuantityFromRow,
  shouldRecalculateMedicineQuantity,
} from '../../lib/medicine-catalog-defaults';
import {
  MEDICATION_DOSAGE_FORM_OPTIONS,
  MEDICATION_FREQUENCY_OPTIONS,
  MEDICATION_ROUTE_OPTIONS,
  MEDICATION_TOA_OPTIONS,
} from '../../lib/medication-rx-options';
import {
  useInvalidCellsForSection,
  useSectionHasErrors,
} from '../../hooks/use-visitpad-field-errors';
import { useVisitpadMasters } from '../../hooks/use-visitpad-masters';
import { useCreateRxStore } from '../../create-rx.store';
import type {
  DiagnosisRow,
  MedicineRow,
  ProcedureRow,
  TestRow,
} from '../../types';
import { FormTable, type FormTableColumn } from '../form-table';
import { SectionCard } from '../section-card';
import { SectionHeader } from '../section-header';
import { ImagingSection } from './imaging-section';

const CERTAINTY_OPTIONS = [
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Presumed', value: 'presumed' },
];

const TEST_STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
];

export function CurrentMedication() {
  const {
    isLoading: catalogLoading,
    diagnosisOptions,
    medicineOptions,
    procedureOptions,
    medicines,
    procedures: procedureCatalog,
  } = useVisitpadMasters();
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const diagnosis = useCreateRxStore((s) => s.formData.diagnosis);
  const medicinesRows = useCreateRxStore((s) => s.formData.medicines);
  const tests = useCreateRxStore((s) => s.formData.testsRequired);
  const procedureRows = useCreateRxStore((s) => s.formData.procedures);
  const addDiagnosis = useCreateRxStore((s) => s.addDiagnosisRow);
  const removeDiagnosis = useCreateRxStore((s) => s.removeDiagnosisRow);
  const updateDiagnosis = useCreateRxStore((s) => s.updateDiagnosisRow);
  const addMedicine = useCreateRxStore((s) => s.addMedicineRow);
  const removeMedicine = useCreateRxStore((s) => s.removeMedicineRow);
  const updateMedicine = useCreateRxStore((s) => s.updateMedicineRow);
  const patchMedicine = useCreateRxStore((s) => s.patchMedicineRow);
  const medicineSelectSeq = useRef(0);
  const addTest = useCreateRxStore((s) => s.addTestRow);
  const removeTest = useCreateRxStore((s) => s.removeTestRow);
  const updateTest = useCreateRxStore((s) => s.updateTestRow);
  const addProcedure = useCreateRxStore((s) => s.addProcedureRow);
  const removeProcedure = useCreateRxStore((s) => s.removeProcedureRow);
  const updateProcedure = useCreateRxStore((s) => s.updateProcedureRow);
  const patchProcedure = useCreateRxStore((s) => s.patchProcedureRow);
  const diagnosisInvalidCells = useInvalidCellsForSection('diagnosis');
  const medicineInvalidCells = useInvalidCellsForSection('medicines');
  const testInvalidCells = useInvalidCellsForSection('testsRequired');
  const procedureInvalidCells = useInvalidCellsForSection('procedures');
  const diagnosisHasErrors = useSectionHasErrors('diagnosis');
  const medicinesHasErrors = useSectionHasErrors('medicines');
  const testsHasErrors = useSectionHasErrors('testsRequired');
  const proceduresHasErrors = useSectionHasErrors('procedures');

  const diagnosisColumns = useMemo<FormTableColumn<DiagnosisRow>[]>(
    () => [
      {
        key: 'notes',
        label: 'Diagnosis',
        type: 'creatable-select',
        placeholder: 'Search or type diagnosis',
        options: diagnosisOptions,
      },
      {
        key: 'certainty',
        label: 'Certainty',
        type: 'select',
        width: '220px',
        options: CERTAINTY_OPTIONS,
      },
    ],
    [diagnosisOptions],
  );

  const medicineColumns = useMemo<FormTableColumn<MedicineRow>[]>(
    () => [
      {
        key: 'medicine',
        label: 'Medicine',
        type: 'creatable-select',
        placeholder: 'Search or type medicine name',
        options: medicineOptions,
      },
      {
        key: 'dosageForm',
        label: 'Dosage Form',
        type: 'select',
        placeholder: 'Type',
        emptyOptionLabel: 'Type',
        options: MEDICATION_DOSAGE_FORM_OPTIONS,
      },
      {
        key: 'route',
        label: 'Route',
        type: 'select',
        placeholder: 'Route',
        emptyOptionLabel: 'Route',
        options: MEDICATION_ROUTE_OPTIONS,
      },
      { key: 'strength', label: 'Strength' },
      {
        key: 'dosageMorning',
        label: 'Dosage',
        type: 'dosage-man',
        width: '110px',
        dosageManSubKeys: {
          morning: 'dosageMorning',
          afternoon: 'dosageAfternoon',
          night: 'dosageNight',
        },
      },
      { key: 'days', label: 'Days', type: 'number', width: '4.5rem', placeholder: '0' },
      {
        key: 'frequency',
        label: 'Frequency',
        type: 'select',
        placeholder: 'Frequency',
        emptyOptionLabel: 'Frequency',
        options: MEDICATION_FREQUENCY_OPTIONS,
      },
      {
        key: 'toa',
        label: 'TOA',
        type: 'select',
        placeholder: 'Time',
        emptyOptionLabel: 'Time',
        options: MEDICATION_TOA_OPTIONS,
      },
      { key: 'quantity', label: 'Quantity', type: 'number', width: '5rem' },
    ],
    [medicineOptions],
  );

  const testColumns = useMemo<FormTableColumn<TestRow>[]>(
    () => [
      { key: 'testName', label: 'Test Name', placeholder: 'Test name' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: TEST_STATUS_OPTIONS,
      },
    ],
    [],
  );

  const procedureColumns = useMemo<FormTableColumn<ProcedureRow>[]>(
    () => [
      {
        key: 'procedureName',
        label: 'Procedure',
        type: 'creatable-select',
        placeholder: 'Search or type procedure',
        options: procedureOptions,
      },
      { key: 'advisedDate', label: 'Advised Date', type: 'date', width: '130px' },
    ],
    [procedureOptions],
  );

  const applyCatalogMedicine = useCallback(
    async (index: number, displayName: string) => {
      const selectionSeq = ++medicineSelectSeq.current;
      const catalogFromList = findVisitpadMedicineByDisplayName(medicines, displayName);
      if (!catalogFromList) {
        patchMedicine(index, { medicine: displayName, medicineId: '' });
        return;
      }

      let catalog = catalogFromList;
      try {
        catalog = await fetchVisitpadMedicineById(catalogFromList.id);
      } catch {
        // Fall back to list row when detail fetch fails.
      }

      if (selectionSeq !== medicineSelectSeq.current) return;

      patchMedicine(index, {
        medicine: catalog.display_name,
        ...buildCatalogMedicineDefaults(catalog),
      });
    },
    [medicines, patchMedicine],
  );

  const handleMedicineUpdate = useCallback(
    (index: number, field: keyof MedicineRow, value: string) => {
      if (field === 'medicine') {
        void applyCatalogMedicine(index, value);
        return;
      }

      updateMedicine(index, field, value);

      if (field !== 'quantity' && shouldRecalculateMedicineQuantity(field)) {
        const row = useCreateRxStore.getState().formData.medicines[index];
        if (!row) return;
        const quantity = resolveMedicineQuantityFromRow(row);
        if (quantity) {
          updateMedicine(index, 'quantity', quantity);
        }
      }
    },
    [applyCatalogMedicine, updateMedicine],
  );

  const handleProcedureUpdate = useCallback(
    (index: number, field: keyof ProcedureRow, value: string) => {
      if (field === 'procedureName') {
        const catalogProcedure = findVisitpadProcedureByDisplayName(procedureCatalog, value);
        if (catalogProcedure) {
          patchProcedure(index, {
            procedureName: catalogProcedure.display_name,
            procedureId: catalogProcedure.id,
          });
          return;
        }
        patchProcedure(index, { procedureName: value, procedureId: '' });
        return;
      }

      updateProcedure(index, field, value);
    },
    [patchProcedure, procedureCatalog, updateProcedure],
  );

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
            <FormTable
              title="Diagnosis"
              addButtonLabel="Add Diagnosis"
              columns={diagnosisColumns}
              rows={diagnosis}
              readOnly={isReadOnly}
              catalogLoading={catalogLoading}
              invalidCells={diagnosisInvalidCells}
              highlightSection={diagnosisHasErrors}
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

          <FormTable
            title="Medications (Rx)"
            addButtonLabel="Add Medicine"
            indexColumnLabel="Sl. No."
            columns={medicineColumns}
            rows={medicinesRows}
            readOnly={isReadOnly}
            catalogLoading={catalogLoading}
            invalidCells={medicineInvalidCells}
            highlightSection={medicinesHasErrors}
            emptyMessage="No medications added. Click 'Add Medicine' to begin."
            onAdd={addMedicine}
            onRemove={removeMedicine}
            onUpdate={(i, field, value) =>
              handleMedicineUpdate(i, field as keyof MedicineRow, value)
            }
          />

          <FormTable
            title="Laboratory Test"
            addButtonLabel="Add Test"
            indexColumnLabel="Sl. No."
            columns={testColumns}
            rows={tests}
            readOnly={isReadOnly}
            invalidCells={testInvalidCells}
            highlightSection={testsHasErrors}
            emptyMessage="No tests added. Click 'Add Test' to begin."
            onAdd={addTest}
            onRemove={removeTest}
            onUpdate={(i, field, value) => updateTest(i, field as keyof TestRow, value)}
          />

          <ImagingSection />

          <FormTable
            title="Procedures"
            addButtonLabel="Add Procedure"
            indexColumnLabel="Sl. No."
            columns={procedureColumns}
            rows={procedureRows}
            readOnly={isReadOnly}
            catalogLoading={catalogLoading}
            invalidCells={procedureInvalidCells}
            highlightSection={proceduresHasErrors}
            emptyMessage="No procedures added. Click 'Add Procedure' to search the catalog or type a custom name."
            onAdd={addProcedure}
            onRemove={removeProcedure}
            onUpdate={(i, field, value) =>
              handleProcedureUpdate(i, field as keyof ProcedureRow, value)
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}
