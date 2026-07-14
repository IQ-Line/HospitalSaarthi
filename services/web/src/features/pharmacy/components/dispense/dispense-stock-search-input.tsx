import { useEffect, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@pulse/ui/popover';
import { cn } from '@pulse/utils';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import {
  searchDispenseStoreStock,
  type DispenseStoreStockOption,
} from '../../api/search-dispense-store-stock';
import { useSelectedPharmacyStoreId } from '../../store';

type DispenseStockSearchInputProps = {
  value: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onSelect: (item: {
    id: string;
    code: string;
    name: string;
    available: number;
    batch: string;
    mrp: string;
    gst_percent: string;
  }) => void;
};

export function DispenseStockSearchInput({
  value,
  disabled = false,
  onValueChange,
  onSelect,
}: DispenseStockSearchInputProps) {
  const selectedStoreId = useSelectedPharmacyStoreId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<DispenseStoreStockOption[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 250);

  useEffect(() => {
    if (!open || disabled) return;

    if (!selectedStoreId) {
      setOptions([]);
      setIsFetching(false);
      return;
    }

    let cancelled = false;
    setIsFetching(true);
    void searchDispenseStoreStock(selectedStoreId, debouncedSearch)
      .then((items) => {
        if (!cancelled) {
          setOptions(items);
          setIsFetching(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          setIsFetching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, disabled, open, selectedStoreId]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSearch('');
    }
  };

  const handleSelect = (item: DispenseStoreStockOption) => {
    // Parent onSelect already sets display name + code/available/mrp.
    // Do not call onValueChange here — a second updateRow against stale `rows`
    // would wipe the selection fields.
    onSelect(item);
    setOpen(false);
    setSearch('');
  };

  const triggerLabel = value.trim() || 'Select or search stock item…';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-9 w-full min-w-[180px] justify-between gap-2 px-3 font-normal',
            !value.trim() && 'text-muted-foreground',
          )}
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        <Input
          className="mb-2 h-9"
          placeholder="Search stock at this store…"
          value={search}
          autoFocus
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="max-h-56 overflow-y-auto">
          {isFetching ? (
            <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading stock…
            </p>
          ) : options.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              {!selectedStoreId
                ? 'Select a pharmacy store to load stock.'
                : search.trim()
                  ? 'No stock matches at this store.'
                  : 'No stock available at this store.'}
            </p>
          ) : (
            options.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleSelect(item)}
              >
                <span className="font-medium leading-snug">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.code} · Avail {item.available} · MRP ₹{item.mrp}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
