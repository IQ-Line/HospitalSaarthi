import { type ColumnDef } from '@tanstack/react-table';
import { VisitpadRowActions } from '@/features/visitpad/components/visitpad-row-actions';

/** Right-aligned edit/delete column; `enableHiding: false` keeps it pinned in the Columns menu. */
export function visitpadActionsColumn<T extends { id: string }>({
  onEdit,
  onDelete,
  disabled,
  canEdit = true,
  canDelete = true,
}: {
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
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
        onDelete={() => onDelete(row.original)}
        disabled={disabled}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    ),
  };
}
