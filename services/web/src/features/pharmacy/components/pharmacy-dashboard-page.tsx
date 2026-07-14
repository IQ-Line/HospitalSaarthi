import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';
import { Skeleton } from '@pulse/ui/skeleton';
import { fetchPharmacyDashboardMock } from '../api/pharmacy-ui-mock';
import { pharmacyQueryKeys } from '../api/query-keys';
import { PharmacyPageShell } from './pharmacy-page-shell';

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-8 w-12" />
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  );
}

export function PharmacyDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: pharmacyQueryKeys.dashboard(),
    queryFn: fetchPharmacyDashboardMock,
  });

  const queueCount = data?.open_queue_count ?? 0;
  const lowStock = data?.low_stock_batches ?? 0;

  return (
    <PharmacyPageShell
      title="Pharmacy"
      description="Queue, dispensing, stock, and compliance."
      breadcrumbLabel="Dashboard"
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Link
                to="/pharmacy/queue"
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="transition-colors hover:border-primary/40">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open queue</CardTitle>
                    <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tabular-nums">{queueCount}</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Prescriptions awaiting action
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low stock batches</CardTitle>
                  <AlertTriangle className="size-4 text-amber-600" aria-hidden />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums">{lowStock}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Batches at or below 5 units
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Shortcuts</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              to="/pharmacy/dispensing"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Counter sale
              <ArrowRight className="size-3" aria-hidden />
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              onClick={() => toast.info('Reports will be available in a future release.')}
            >
              Reports
              <ArrowRight className="size-3" aria-hidden />
            </button>
          </CardContent>
        </Card>
      </div>
    </PharmacyPageShell>
  );
}
