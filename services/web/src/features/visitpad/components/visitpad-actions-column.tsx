import { type ColumnDef } from '@tanstack/react-table';
import { VisitpadRowActions } from '@/features/visitpad/components/visitpad-row-actions';

/** Right-aligned edit column; optional deactivate when no status toggle exists. */
export function visitpadActionsColumn<T extends { id: string }>({
  onEdit,
  onDelete,
  disabled,
  canEdit = true,
  canDelete = true,
}: {
  onEdit: (row: T) => void;
  onDelete?: (row: T) => void;
  disabled?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}): ColumnDef<T, unknown> {
  return {
    id: 'actions',
    header: '',
    enableHiding: false,
    meta: { label: 'Actions' },
    cell: ({ row }) => (
      <VisitpadRowActions
        onEdit={() => onEdit(row.original)}
        onDelete={onDelete ? () => onDelete(row.original) : undefined}
        disabled={disabled}
        canEdit={canEdit}
        canDelete={canDelete && onDelete != null}
      />
    ),
  };
}
