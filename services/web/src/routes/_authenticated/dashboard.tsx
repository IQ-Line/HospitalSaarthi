import { createFileRoute } from '@tanstack/react-router';
import { useIsAllowed, type AsyncResult } from '@cerbos/react';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const userListCheck = useIsAllowed({
    resource: {
      kind: 'user',
      id: 'list',
      attr: {
        iq_tenant_id: tenantId ?? '',
        department: null,
        required_clearance: 0,
      },
    },
    action: 'user.list',
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
      <p className="text-gray-600">
        HIMS Platform is running. Module pages will appear in the sidebar as they are built.
      </p>
      <CerbosUserListHint check={userListCheck} />
    </div>
  );
}

function CerbosUserListHint({ check }: { check: AsyncResult<boolean> }) {
  if (check.isLoading) {
    return (
      <p className="mt-4 text-sm text-muted-foreground" data-testid="cerbos-user-list-loading">
        Checking user list permission with Cerbos…
      </p>
    );
  }
  if (check.error) {
    return (
      <p className="mt-4 text-sm text-destructive" data-testid="cerbos-user-list-error">
        Cerbos check failed (is the PDP reachable at VITE_CERBOS_URL?). UX only — APIs still enforce
        authz.
      </p>
    );
  }
  return (
    <p className="mt-4 text-sm text-muted-foreground" data-testid="cerbos-user-list-result">
      Cerbos PDP (dynamic): <span className="font-medium">{check.data ? 'user.list allowed' : 'user.list denied'}</span>
      {' — '}
      use the permission map for fast shell gating; use Cerbos hooks when resource context matters.
    </p>
  );
}
