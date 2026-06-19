import { createFileRoute, redirect } from '@tanstack/react-router';
import { resolvePlatformSuperAdmin, resolveTenantAdmin } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { OpdRegistrationBillingReportScreen } from '@/features/analytics/components/opd-registration-billing-report-screen';

export const Route = createFileRoute('/_authenticated/analytics/opd-registration-billing')({
  beforeLoad: () => {
    const accessToken = useAuthStore.getState().accessToken;
    const authRoles = useAuthStore.getState().roles;
    const principalRoles = usePermissionsStore.getState().roles;
    const roleInput = { accessToken, authRoles, principalRoles };
    const isSuperAdmin = resolvePlatformSuperAdmin(roleInput);
    const isTenantAdmin = resolveTenantAdmin(roleInput);
    if (!isSuperAdmin && !isTenantAdmin) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: OpdRegistrationBillingReportRoute,
});

function OpdRegistrationBillingReportRoute() {
  return <OpdRegistrationBillingReportScreen />;
}
