import { useCreateRxStore } from '../../create-rx.store';
import type { PhysicalActivityRow } from '../../types';
import { CreateRxFormTable, type FormTableColumn } from '../form-table';

const COLUMNS: FormTableColumn<PhysicalActivityRow>[] = [
  { key: 'steps', label: 'Steps', type: 'number', placeholder: 'Daily steps' },
  { key: 'sleepDuration', label: 'Sleep (hrs)', type: 'number', placeholder: 'Hours' },
  { key: 'caloriesBurned', label: 'Calories', type: 'number', placeholder: 'kcal' },
  {
    key: 'exerciseType',
    label: 'Exercise Type',
    placeholder: 'Walking, Yoga...',
  },
];

export function CreateRxPhysicalActivity() {
  const isReadOnly = useCreateRxStore((s) => s.isReadOnly);
  const rows = useCreateRxStore((s) => s.formData.physicalActivity);
  const add = useCreateRxStore((s) => s.addPhysicalActivityRow);
  const remove = useCreateRxStore((s) => s.removePhysicalActivityRow);
  const update = useCreateRxStore((s) => s.updatePhysicalActivityRow);

  return (
    <div className="p-4">
      <CreateRxFormTable
        title="Physical Activity"
        addButtonLabel="Add"
        columns={COLUMNS}
        rows={rows}
        readOnly={isReadOnly}
        emptyMessage="No physical activity added"
        onAdd={add}
        onRemove={remove}
        onUpdate={(i, field, value) => update(i, field as keyof PhysicalActivityRow, value)}
      />
    </div>
  );
}
