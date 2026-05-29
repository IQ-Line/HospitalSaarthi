import { createFileRoute } from '@tanstack/react-router';
import { AdminDashboard } from '@/features/dashboard/components/admin-dashboard';
import { NavigationModuleDiscovery } from '@/features/dashboard/components/navigation-module-discovery';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="min-h-full bg-muted/30">
      <AdminDashboard />
      <div className="border-t bg-background px-4 pb-6 md:px-6">
        <NavigationModuleDiscovery />
      </div>
    </div>
  );
}
