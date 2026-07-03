import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@pulse/ui/button';

interface EntityRowActionsProps {
  onView: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  /** Disables edit/delete when true (view stays enabled). Prefer `canEdit` / `canDelete` for per-action gates. */
  readOnly?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function EntityRowActions({
  onView,
  onEdit,
  onDelete,
  disabled = false,
  readOnly = false,
  canEdit,
  canDelete,
}: EntityRowActionsProps) {
  const allowEdit = !readOnly && (canEdit ?? true);
  const showDelete = !readOnly && canDelete !== false && onDelete != null;
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onView}
        disabled={disabled}
        aria-label="View record"
      >
        <Eye className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onEdit}
        disabled={disabled || !allowEdit}
        aria-label="Edit record"
      >
        <Pencil className="size-4" />
      </Button>
      {showDelete ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          disabled={disabled}
          className="text-destructive hover:text-destructive"
          aria-label="Deactivate record"
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
