import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pulse/ui/table';
import { fetchVitalCheckIns } from '../api/vitals';
import { ipdQueryKeys } from '../api/query-keys';
import { formatEnumLabel } from '../lib/display';
import {
  formatBloodPressure,
  formatVitalRecordedAt,
  formatVitalValue,
} from '../lib/vital-types';

type SummaryVitalsPanelProps = {
  admissionId: string;
  onOpenVitalsChart: () => void;
};

export function SummaryVitalsPanel({ admissionId, onOpenVitalsChart }: SummaryVitalsPanelProps) {
  const { data: vitals = [], isLoading } = useQuery({
    queryKey: ipdQueryKeys.vitalCheckIns(admissionId),
    queryFn: () => fetchVitalCheckIns(admissionId),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
        Loading vitals…
      </div>
    );
  }

  if (vitals.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 p-8 text-center">
        <Activity className="size-10 text-muted-foreground/60" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">Vitals charting available at</p>
        <Button type="button" variant="link" className="h-auto p-0 text-base" onClick={onOpenVitalsChart}>
          Open Vitals Chart
        </Button>
      </div>
    );
  }

  const recent = vitals.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Recent vitals check-ins</p>
        <Button type="button" variant="outline" size="sm" onClick={onOpenVitalsChart}>
          Open Vitals Chart
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>HR</TableHead>
              <TableHead>BP</TableHead>
              <TableHead>Temp</TableHead>
              <TableHead>SpO2</TableHead>
              <TableHead>RR</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((row) => (
              <TableRow key={row.check_in_id}>
                <TableCell className="tabular-nums">{formatVitalRecordedAt(row.recorded_at)}</TableCell>
                <TableCell className="tabular-nums">{formatVitalValue(row.heart_rate)}</TableCell>
                <TableCell className="tabular-nums">
                  {formatBloodPressure(row.systolic_bp, row.diastolic_bp)}
                </TableCell>
                <TableCell className="tabular-nums">{formatVitalValue(row.temperature)}</TableCell>
                <TableCell className="tabular-nums">{formatVitalValue(row.spo2)}</TableCell>
                <TableCell className="tabular-nums">{formatVitalValue(row.respiratory_rate)}</TableCell>
                <TableCell>
                  {row.recorder_role ? formatEnumLabel(row.recorder_role) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
