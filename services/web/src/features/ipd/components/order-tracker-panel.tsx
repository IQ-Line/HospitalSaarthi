import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import type { AdmissionDetail } from '../types';
import { EpisodeOrderList } from './episode-order-list';
import { NewOrderPanel } from './new-order-panel';

type OrderTrackerView = 'list' | 'new_order';

type OrderTrackerPanelProps = {
  admission: AdmissionDetail;
  initialView?: OrderTrackerView;
};

export function OrderTrackerPanel({
  admission,
  initialView = 'list',
}: OrderTrackerPanelProps) {
  const [view, setView] = useState<OrderTrackerView>(initialView);

  if (view === 'new_order') {
    return <NewOrderPanel admission={admission} onBack={() => setView('list')} />;
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Order Tracker</h1>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setView('new_order')}>
          <Plus className="size-4" />
          New Order
        </Button>
      </div>

      <div className="flex-1 space-y-4 bg-muted/30 px-4 py-4 md:px-6">
        <EpisodeOrderList
          admissionId={admission.id}
          variant="full"
          onNewOrder={() => setView('new_order')}
        />
      </div>
    </div>
  );
}
