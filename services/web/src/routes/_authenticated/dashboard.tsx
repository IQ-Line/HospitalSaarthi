import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { authClient } from '@/lib/auth-client';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const displayName = useAuthStore((s) => s.displayName);
  const permissionMap = usePermissionsStore((s) => s.map);
  const canReadUsers = usePermissionsStore((s) =>
    s.hasFeaturePermission('user-management', 'users', 'read'),
  );
  const permissionsUnavailable = Object.keys(permissionMap).length === 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="flex items-center gap-3">
          {displayName && (
            <span className="text-sm text-muted-foreground">{displayName}</span>
          )}
          <LogoutButton />
        </div>
      </div>
      <p className="text-gray-600">
        HIMS Platform is running. Module pages will appear in the sidebar as they are built.
      </p>
      <UserListPermissionHint
        canReadUsers={canReadUsers}
        permissionsUnavailable={permissionsUnavailable}
      />
    </div>
  );
}

function LogoutButton() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearTenant = useTenantStore((s) => s.clearTenant);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authClient.signOut();
    } catch {
      // Best-effort
    }
    clearSession();
    clearTenant();
    navigate({ to: '/login' });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut}>
      <LogOut className="size-3.5" />
      {loggingOut ? 'Logging out...' : 'Logout'}
    </Button>
  );
}

function UserListPermissionHint({
  canReadUsers,
  permissionsUnavailable,
}: {
  canReadUsers: boolean;
  permissionsUnavailable: boolean;
}) {
  if (permissionsUnavailable) {
    return (
      <p className="mt-4 text-sm text-muted-foreground" data-testid="cerbos-user-list-unavailable">
        Backend permission map is being retried. APIs still enforce authz while the shell refreshes
        UX permissions.
      </p>
    );
  }

  return (
    <p className="mt-4 text-sm text-muted-foreground" data-testid="cerbos-user-list-result">
      Backend permission map: <span className="font-medium">{canReadUsers ? 'user list allowed' : 'user list denied'}</span>
      {' — '}
      shell UX stays aligned with the same authz decisions enforced by the APIs.
    </p>
  );
}
