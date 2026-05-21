import { createFileRoute, redirect } from '@tanstack/react-router';
import { firstAccessibleVisitpadPath } from '@/lib/visitpad-default-route';
import { usePermissionsStore } from '@/stores/permissions.store';

export const Route = createFileRoute('/_authenticated/visitpad/')({
  beforeLoad: () => {
    const capabilityKeys = usePermissionsStore.getState().capabilityKeys;
    const target = firstAccessibleVisitpadPath(capabilityKeys) ?? '/dashboard';
    throw redirect({ to: target });
  },
});
