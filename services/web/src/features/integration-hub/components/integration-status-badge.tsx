import { Badge } from '@pulse/ui/badge';
import type { IntegrationStatus } from '../types';

const labels: Record<IntegrationStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  disabled: 'Disabled',
};

const variants: Record<IntegrationStatus, 'secondary' | 'default' | 'destructive'> = {
  draft: 'secondary',
  active: 'default',
  disabled: 'destructive',
};

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
