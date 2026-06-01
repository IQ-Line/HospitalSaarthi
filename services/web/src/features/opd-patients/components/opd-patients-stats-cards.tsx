import { Skeleton } from '@pulse/ui/skeleton';
import type { OpdPatientsStats } from '../types';

interface OpdPatientsStatsCardsProps {
  stats: OpdPatientsStats | undefined;
  isLoading: boolean;
}

const STAT_ITEMS = [
  { key: 'total' as const, label: 'Total Visits' },
  { key: 'pending' as const, label: 'Doctor Pending Reviews' },
  { key: 'cancelled' as const, label: 'Cancelled' },
  { key: 'reviewed' as const, label: 'Doctor Reviewed' },
];

/**
 * Reference: Patients/index.tsx frontdesk/doctor stats Grid — white cards, gray.500 labels, 2xl bold values.
 */
export function OpdPatientsStatsCards({ stats, isLoading }: OpdPatientsStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {STAT_ITEMS.map(({ key, label }) => (
        <div
          key={key}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-base text-gray-500">{label}</span>
            {isLoading ? (
              <Skeleton className="h-8 w-10 shrink-0" />
            ) : (
              <span className="text-2xl font-bold tabular-nums text-black">
                {stats?.[key] ?? 0}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
