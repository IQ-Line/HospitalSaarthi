import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@pulse/ui/button';

interface EntityRowActionsProps {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function EntityRowActions({
  onView,
  onEdit,
  onDelete,
  disabled = false,
}: EntityRowActionsProps) {
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
        disabled={disabled}
        aria-label="Edit record"
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        disabled={disabled}
        className="text-destructive hover:text-destructive"
        aria-label="Delete record"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
