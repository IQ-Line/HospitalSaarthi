import { Badge } from '@pulse/ui/badge';
import type { InventoryMasterStatus } from '../types';

const STATUS_LABELS: Record<InventoryMasterStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export function InventoryMasterStatusBadge({ status }: { status: InventoryMasterStatus }) {
  return (
    <Badge variant={status === 'active' ? 'default' : 'secondary'}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function InventoryMasterYesBadge({ value }: { value: boolean }) {
  if (!value) {
    return <span className="text-muted-foreground">No</span>;
  }
  return <Badge variant="default">Yes</Badge>;
}
