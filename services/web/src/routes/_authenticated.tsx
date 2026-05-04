import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
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

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-surface-dim">Loading permissions...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar — replace with @pulse/layouts AppShell when integrated */}
      <aside className="w-60 border-r border-surface-dim bg-surface p-4">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">HIMS</h1>
          {tenantName && <p className="text-sm text-gray-500">{tenantName}</p>}
        </div>
        <nav className="space-y-1">
          {/* Navigation links will be permission-gated here */}
          <p className="text-xs text-gray-400">Modules load based on permissions</p>
        </nav>
        <div className="mt-auto pt-4 border-t border-surface-dim">
          <p className="text-sm truncate">{displayName}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
