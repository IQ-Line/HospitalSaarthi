import { Skeleton } from '@pulse/ui/skeleton';
import type { NursePatientsStats } from '../types';

interface NurseStatsCardsProps {
  stats: NursePatientsStats | undefined;
  isLoading: boolean;
}

const STAT_ITEMS = [
  { key: 'total' as const, label: 'Total Visits' },
  { key: 'pendingVitals' as const, label: 'Pending Vitals' },
  { key: 'vitalsTaken' as const, label: 'Vitals Taken' },
  { key: 'doctorReviewed' as const, label: 'Doctor Reviewed' },
];

export function NurseStatsCards({ stats, isLoading }: NurseStatsCardsProps) {
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
