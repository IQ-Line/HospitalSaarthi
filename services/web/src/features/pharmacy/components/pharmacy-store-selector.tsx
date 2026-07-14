import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { useMyPharmacyStores } from '../api/my-pharmacy-stores';
import { usePharmacyStore, useSelectedPharmacyStoreId } from '../store';

type PharmacyStoreSelectorProps = {
  /** Inline label for compact layouts (e.g. dispense header grid). */
  compact?: boolean;
};

function storeLabel(name: string, storeCode: string): string {
  return storeCode ? `${name} (${storeCode})` : name;
}

export function PharmacyStoreSelector({ compact = false }: PharmacyStoreSelectorProps) {
  const { data, isLoading, isError } = useMyPharmacyStores();
  const selectedStoreId = useSelectedPharmacyStoreId();
  const setSelectedStoreId = usePharmacyStore((state) => state.setSelectedStoreId);
  const stores = data?.stores ?? [];

  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? stores[0];

  if (isLoading) {
    return (
      <p className={compact ? 'text-sm text-muted-foreground' : 'text-sm text-muted-foreground'}>
        Loading stores…
      </p>
    );
  }

  if (isError) {
    return (
      <p className={compact ? 'text-sm text-destructive' : 'text-sm text-destructive'}>
        Unable to load stores
      </p>
    );
  }

  if (stores.length === 0) {
    return (
      <p className={compact ? 'text-sm text-muted-foreground' : 'text-sm text-muted-foreground'}>
        No store assigned
      </p>
    );
  }

  if (stores.length === 1) {
    const store = stores[0]!;
    return (
      <div className={compact ? undefined : 'min-w-[12rem]'}>
        {compact ? (
          <p className="mt-1 text-sm font-medium">{storeLabel(store.name, store.store_code)}</p>
        ) : (
          <p className="text-sm font-medium">{storeLabel(store.name, store.store_code)}</p>
        )}
      </div>
    );
  }

  const value = selectedStore?.id ?? stores[0]!.id;

  if (compact) {
    return (
      <Select value={value} onValueChange={setSelectedStoreId}>
        <SelectTrigger className="mt-1 h-9 w-full">
          <SelectValue placeholder="Select store" />
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              {storeLabel(store.name, store.store_code)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="min-w-[12rem]">
      <Select value={value} onValueChange={setSelectedStoreId}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select store" />
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              {storeLabel(store.name, store.store_code)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
