import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const displayName = useAuthStore((s) => s.displayName);
  const tenantName = useTenantStore((s) => s.tenantName);
  const isLoaded = usePermissionsStore((s) => s.isLoaded);
  const hasModuleAccess = usePermissionsStore((s) => s.hasModuleAccess);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-60 border-r bg-sidebar p-4 flex flex-col">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">HIMS</h1>
          {tenantName && <p className="text-sm text-muted-foreground">{tenantName}</p>}
        </div>
        <nav className="space-y-1 flex-1">
          <NavLink to="/dashboard" label="Dashboard" />
          {hasModuleAccess('master-data') && (
            <NavLink to="/master-data" label="Master Data" />
          )}
        </nav>
        <div className="pt-4 border-t">
          <p className="text-sm truncate text-muted-foreground">{displayName}</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="block rounded-md px-3 py-2 text-sm text-foreground/70 hover:bg-sidebar-accent transition-colors"
      activeProps={{ className: 'block rounded-md px-3 py-2 text-sm bg-sidebar-accent font-medium text-sidebar-accent-foreground' }}
    >
      {label}
    </Link>
  );
}
