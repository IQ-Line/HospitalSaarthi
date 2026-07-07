import { type ColumnDef } from '@tanstack/react-table';
import { VisitpadRowActions } from '@/features/visitpad/components/visitpad-row-actions';

/** Right-aligned edit column for Visitpad catalog tables. */
export function visitpadActionsColumn<T extends { id: string }>({
  onEdit,
  disabled,
  canEdit = true,
}: {
  onEdit: (row: T) => void;
  disabled?: boolean;
  canEdit?: boolean;
}): ColumnDef<T, unknown> {
  return {
    id: 'actions',
    header: '',
    enableHiding: false,
    meta: { label: 'Actions' },
    cell: ({ row }) => (
      <VisitpadRowActions
        onEdit={() => onEdit(row.original)}
        disabled={disabled}
        canEdit={canEdit}
      />
    ),
  };
}
