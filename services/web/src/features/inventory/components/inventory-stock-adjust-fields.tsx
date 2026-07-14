import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Input } from '@pulse/ui/input';
import { useInventoryStockLots } from '../api/queries';
import type { InventoryStockRow } from '../types';

export type StockAdjustDraft = {
  stockId: string;
  delta: string;
  reason: string;
};

type StockAdjustRowFieldsProps = {
  row: InventoryStockRow;
  storeId: string;
  draft: StockAdjustDraft | undefined;
  onChange: (next: StockAdjustDraft) => void;
};

export function StockAdjustRowFields({
  row,
  storeId,
  draft,
  onChange,
}: StockAdjustRowFieldsProps) {
  const { data: lots = [], isLoading } = useInventoryStockLots(row.id, storeId || undefined);

  useEffect(() => {
    if (!draft && lots.length === 1) {
      onChange({ stockId: lots[0]!.id, delta: '0', reason: '' });
    }
  }, [draft, lots, onChange]);

  const value = draft ?? { stockId: '', delta: '0', reason: '' };

  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <Select
        value={value.stockId || undefined}
        onValueChange={(stockId) => onChange({ ...value, stockId })}
      >
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder={isLoading ? 'Loading…' : 'Select batch'} />
        </SelectTrigger>
        <SelectContent>
          {lots.map((lot) => (
            <SelectItem key={lot.id} value={lot.id}>
              {lot.lot_number} ({lot.quantity})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        className="h-8 w-20"
        value={value.delta}
        onChange={(event) => onChange({ ...value, delta: event.target.value })}
      />
      <Input
        className="h-8 min-w-[120px] flex-1"
        placeholder="Required"
        value={value.reason}
        onChange={(event) => onChange({ ...value, reason: event.target.value })}
      />
    </div>
  );
}
