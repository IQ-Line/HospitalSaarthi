import { MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';

interface InventoryMasterRowActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function InventoryMasterRowActions({
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: InventoryMasterRowActionsProps) {
  const showPlaceholder = !onView && !onEdit && !onDelete;

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Row actions">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onView ? (
            <DropdownMenuItem onClick={onView}>View</DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => toast.info('View will be available when APIs are connected.')}
            >
              View
            </DropdownMenuItem>
          )}
          {canEdit ? (
            onEdit ? (
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => toast.info('Edit will be available when APIs are connected.')}
              >
                Edit
              </DropdownMenuItem>
            )
          ) : null}
          {canDelete ? (
            onDelete ? (
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                Delete
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => toast.info('Delete will be available when APIs are connected.')}
              >
                Delete
              </DropdownMenuItem>
            )
          ) : null}
          {showPlaceholder ? null : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
