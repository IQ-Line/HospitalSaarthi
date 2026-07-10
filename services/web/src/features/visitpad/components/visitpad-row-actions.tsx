import { Pencil } from 'lucide-react';
import { Button } from '@pulse/ui/button';

interface VisitpadRowActionsProps {
  onEdit: () => void;
  disabled?: boolean;
  canEdit?: boolean;
}

/** Edit action for Visitpad catalog tables — matches reference row actions. */
export function VisitpadRowActions({
  onEdit,
  disabled = false,
  canEdit = true,
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
    </div>
  );
}
