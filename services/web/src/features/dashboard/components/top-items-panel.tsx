import type { TopItemRow } from '../types';

interface TopItemsColumnProps {
  title: string;
  items: TopItemRow[];
  countLabel: string;
}

function TopItemsColumn({ title, items, countLabel }: TopItemsColumnProps) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <h4 className="text-lg font-semibold">{title}</h4>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No data available</p>
        ) : (
          items.map((item) => (
            <div key={item.name} className="rounded-md border bg-card p-3 shadow-sm">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.count} {countLabel}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface TopItemsPanelProps {
  medicines: TopItemRow[];
  diagnoses: TopItemRow[];
  diagnostics: TopItemRow[];
}

export function TopItemsPanel({ medicines, diagnoses, diagnostics }: TopItemsPanelProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <TopItemsColumn title="Top Medicines" items={medicines} countLabel="times prescribed" />
      <TopItemsColumn title="Top Diagnoses" items={diagnoses} countLabel="times recorded" />
      <TopItemsColumn title="Top Diagnostics" items={diagnostics} countLabel="times ordered" />
    </div>
  );
}
