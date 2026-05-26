import { Badge } from '@pulse/ui/badge';
import type { TodaysVisitRow } from '../types';

function statusVariant(status: TodaysVisitRow['status']): 'default' | 'secondary' | 'outline' {
  if (status === 'completed') return 'default';
  if (status === 'in_progress') return 'secondary';
  return 'outline';
}

interface TodaysVisitsTableProps {
  visits: TodaysVisitRow[];
}

export function TodaysVisitsTable({ visits }: TodaysVisitsTableProps) {
  const rows = visits.slice(0, 5);

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-medium">Today&apos;s Visits</h3>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Patient</th>
              <th className="pb-2 font-medium">Time</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-muted-foreground">
                  No visits today
                </td>
              </tr>
            ) : (
              rows.map((visit) => (
                <tr key={visit.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">{visit.patientName}</td>
                  <td className="py-3 pr-4 tabular-nums">{visit.time}</td>
                  <td className="py-3">
                    <Badge variant={statusVariant(visit.status)}>{visit.status}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
