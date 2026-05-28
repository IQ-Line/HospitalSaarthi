import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FootfallPoint } from '../types';

function formatFootfallDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface PatientFootfallChartProps {
  data: FootfallPoint[];
}

export function PatientFootfallChart({ data }: PatientFootfallChartProps) {
  const chartData = data.map((row) => ({
    date: formatFootfallDate(row.date),
    count: row.count,
  }));

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-medium">Patient Footfall (last 3 days)</h3>
      <div className="mt-6 h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={0}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
