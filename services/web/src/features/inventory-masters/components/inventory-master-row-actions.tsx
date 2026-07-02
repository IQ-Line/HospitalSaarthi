import { MoreVertical } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@pulse/ui/dropdown-menu';

interface InventoryMasterRowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function InventoryMasterRowActions({
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: InventoryMasterRowActionsProps) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Row actions">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && onEdit ? <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem> : null}
          {canDelete && onDelete ? (
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              Deactivate
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
