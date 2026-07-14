import { useEffect, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@pulse/ui/popover';
import { cn } from '@pulse/utils';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import {
  searchDispenseMedicineItems,
  type DispenseMedicineItemOption,
} from '../api/search-dispense-medicine-items';
import { useSelectedPharmacyStoreId } from '../store';

type PharmacyInventoryMedicineSearchInputProps = {
  value: string;
  /** Tenant formulary medicine id persisted on dispense lines. */
  formularyMedicineId?: string | null;
  onSelect: (item: DispenseMedicineItemOption) => void;
  onClearSelection?: () => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
};

function ItemOptionRow({
  item,
  selected,
  onSelect,
}: {
  item: DispenseMedicineItemOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left text-sm hover:bg-muted',
        selected && 'bg-muted',
      )}
      onClick={onSelect}
    >
      <span className="font-medium leading-snug">{item.display_name}</span>
      <span className="text-xs text-muted-foreground">
        {item.item_code} · Avail {item.available_qty} · MRP ₹{item.mrp} · GST {item.gst_percent}%
      </span>
    </button>
  );
}

export function PharmacyInventoryMedicineSearchInput({
  value,
  formularyMedicineId,
  onSelect,
  disabled = false,
  placeholder = 'Select or search item…',
  error,
}: PharmacyInventoryMedicineSearchInputProps) {
  const selectedStoreId = useSelectedPharmacyStoreId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<DispenseMedicineItemOption[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (!open || disabled) return;

    if (!selectedStoreId) {
      setOptions([]);
      setIsFetching(false);
      return;
    }

    let cancelled = false;
    setIsFetching(true);
    void searchDispenseMedicineItems(debouncedSearch, selectedStoreId)
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

  const handleSelect = (item: DispenseMedicineItemOption) => {
    onSelect(item);
    setOpen(false);
    setSearch('');
  };

  const triggerLabel = value.trim() || placeholder;
  const showInvalid = Boolean(error);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={showInvalid || undefined}
          className={cn(
            'h-9 w-full min-w-[200px] justify-between gap-2 px-3 font-normal',
            showInvalid && 'border-destructive',
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
          placeholder="Search item master…"
          value={search}
          autoFocus
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="max-h-56 overflow-y-auto">
          {isFetching ? (
            <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading items…
            </p>
          ) : options.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              {!selectedStoreId
                ? 'Select a pharmacy store to load items.'
                : search.trim()
                  ? 'No matches at this store — try another search.'
                  : 'No stocked formulary medicines at this store.'}
            </p>
          ) : (
            options.map((item) => (
              <ItemOptionRow
                key={item.id}
                item={item}
                selected={formularyMedicineId === item.tenant_formulary_id}
                onSelect={() => handleSelect(item)}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
