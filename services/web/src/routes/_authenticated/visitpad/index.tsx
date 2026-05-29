import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  defaultVisitpadLandingPath,
  firstAccessibleVisitpadPath,
} from '@/lib/visitpad-default-route';
import { resolveNavigationCapabilityBypass } from '@/lib/resolve-nav-bypass';
import { usePermissionsStore } from '@/stores/permissions.store';

export const Route = createFileRoute('/_authenticated/visitpad/')({
  beforeLoad: () => {
    if (resolveNavigationCapabilityBypass()) {
      throw redirect({ to: defaultVisitpadLandingPath() });
    }
    const capabilityKeys = usePermissionsStore.getState().capabilityKeys;
    const target = firstAccessibleVisitpadPath(capabilityKeys) ?? '/dashboard';
    throw redirect({ to: target });
  },
});
