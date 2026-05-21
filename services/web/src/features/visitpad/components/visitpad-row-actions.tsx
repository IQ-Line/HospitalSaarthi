import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@pulse/ui/button';

interface VisitpadRowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

/** Edit + delete (soft delete via API) for Visitpad catalog tables — matches reference row actions. */
export function VisitpadRowActions({
  onEdit,
  onDelete,
  disabled = false,
  canEdit = true,
  canDelete = true,
}: VisitpadRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onEdit}
        disabled={disabled || !canEdit}
        aria-label="Edit row"
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        disabled={disabled || !canDelete}
        className="text-destructive hover:text-destructive"
        aria-label="Delete row"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
