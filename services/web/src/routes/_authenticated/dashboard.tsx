import { createFileRoute } from '@tanstack/react-router';
import { AdminDashboard } from '@/features/dashboard/components/admin-dashboard';
import { NavigationModuleDiscovery } from '@/features/dashboard/components/navigation-module-discovery';
import { shouldUseDashboardMock } from '@/features/dashboard/api/facilities';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="min-h-full bg-muted/30">
      {shouldUseDashboardMock() ? (
        <p
          className="border-b bg-sky-50 px-4 py-1.5 text-center text-xs text-muted-foreground"
          data-testid="dashboard-mock-notice"
        >
          Dashboard metrics use mock data. Set{' '}
          <code className="text-xs">VITE_DASHBOARD_USE_MOCK=false</code> when analytics APIs are
          available.
        </p>
      ) : (
        <p
          className="border-b bg-amber-50 px-4 py-1.5 text-center text-xs text-muted-foreground"
          data-testid="dashboard-live-notice"
        >
          Live dashboard mode: metrics load from backend APIs only (mock disabled). Facilities load
          from Configurator tenants.
        </p>
      )}
      <AdminDashboard />
      <div className="border-t bg-background px-4 pb-6 md:px-6">
        <NavigationModuleDiscovery />
      </div>
    </div>
  );
}
