import { createFileRoute } from '@tanstack/react-router';
import { roleListOptions } from '@/features/user-management/api/queries';
import { UserManagementPageShell } from '@/features/user-management/components/user-management-page-shell';
import { RoleManagementPanel } from '@/features/user-management/components/role-management-panel';
import { resolveUserManagementListTenantScope } from '@/features/user-management/lib/user-tenant-scope';
import { guardRolesAdminRoute } from '@/features/user-management/lib/route-guards';
import { isPlatformSuperAdminFromAccessToken } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated/user-management/roles')({
  beforeLoad: guardRolesAdminRoute,
  loader: ({ context }) => {
    const tenantStore = useTenantStore.getState();
    const scope = resolveUserManagementListTenantScope({
      isPlatformSuperAdmin: isPlatformSuperAdminFromAccessToken(
        useAuthStore.getState().accessToken,
      ),
      homeTenantId: tenantStore.homeTenantId,
      activeTenantId: tenantStore.tenantId,
    });
    return context.queryClient.ensureQueryData(roleListOptions(scope));
  },
  component: UserManagementRolesPage,
});

function UserManagementRolesPage() {
  const isPlatformSuperAdmin = isPlatformSuperAdminFromAccessToken(
    useAuthStore((s) => s.accessToken),
  );
  return (
    <UserManagementPageShell
      section="roles"
      title={isPlatformSuperAdmin ? 'Platform roles' : 'Roles'}
      description={
        isPlatformSuperAdmin
          ? 'Roles on your platform tenant. Hospital roles are managed per tenant in Configurator.'
          : 'Set up roles and choose what each role allows people to do.'
      }
    >
      <RoleManagementPanel />
    </UserManagementPageShell>
  );
}
