import {
  useInvalidCellsForSection,
  useSectionHasErrors,
} from '../../hooks/use-visitpad-field-errors';
import { useCreateRxStore } from '../../create-rx.store';
import type { ImagingRow } from '../../types';
import { FormTable, type FormTableColumn } from '../form-table';
import { SectionHeader } from '../section-header';

const IMAGING_CHIPS = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'PET Scan', 'Mammogram'];

const COLUMNS: FormTableColumn<ImagingRow>[] = [
  { key: 'testName', label: 'Test Name', placeholder: 'Imaging test' },
  { key: 'byWhen', label: 'By When', placeholder: 'When' },
  { key: 'instructions', label: 'Instructions', placeholder: 'Instructions' },
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

export function ImagingSection() {
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const rows = useCreateRxStore((s) => s.formData.imagingRequired);
  const add = useCreateRxStore((s) => s.addImagingRow);
  const remove = useCreateRxStore((s) => s.removeImagingRow);
  const update = useCreateRxStore((s) => s.updateImagingRow);
  const invalidCells = useInvalidCellsForSection('imagingRequired');
  const hasErrors = useSectionHasErrors('imagingRequired');

  const addChip = (name: string) => {
    if (rows.some((r) => r.testName === name)) return;
    add();
    const index = useCreateRxStore.getState().formData.imagingRequired.length - 1;
    update(index, 'testName', name);
  };

  return (
    <div>
      <SectionHeader
        title="Radiology Test"
        addLabel="Add Imaging"
        onAdd={add}
        readOnly={isReadOnly}
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {IMAGING_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={isReadOnly}
            onClick={() => addChip(chip)}
            className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>
      <FormTable
        title="Radiology Test"
        addButtonLabel="Add Imaging"
        columns={COLUMNS}
        rows={rows}
        readOnly={isReadOnly}
        invalidCells={invalidCells}
        highlightSection={hasErrors}
        hideTitle
        hideAdd
        emptyMessage="No radiology tests added."
        onAdd={add}
        onRemove={remove}
        onUpdate={(i, field, value) => update(i, field as keyof ImagingRow, value)}
      />
    </div>
  );
}
