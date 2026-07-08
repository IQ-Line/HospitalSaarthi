import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { PageHeaderWithBack } from '@pulse/patterns/page-header-with-back';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Textarea } from '@pulse/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@pulse/ui/toggle-group';
import { toast } from 'sonner';
import {
  fetchPharmacyStoresMock,
  saveIndentDraftMock,
  searchIndentItemsMock,
} from '../../api/replenishment-ui-mock';
import { pharmacyQueryKeys } from '../../api/query-keys';
import { createEmptyIndentDraftLine } from '../../lib/indent-draft';
import type { IndentDraftLine, IndentPriority } from '../../types/replenishment-ui.types';
import { PharmacyPageShell } from '../pharmacy-page-shell';
import { IndentRequestedItemsTable } from './indent-requested-items-table';
import { IndentSummaryPanel } from './indent-summary-panel';

const DEFAULT_FROM_STORE = 'store-central-medical';
const DEFAULT_TO_STORE = 'store-inventory';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PharmacyCreateIndentPage() {
  const [indentDate, setIndentDate] = useState(todayIsoDate);
  const [fromStoreId, setFromStoreId] = useState(DEFAULT_FROM_STORE);
  const [toStoreId, setToStoreId] = useState(DEFAULT_TO_STORE);
  const [priority, setPriority] = useState<IndentPriority>('normal');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<IndentDraftLine[]>(() => [createEmptyIndentDraftLine()]);
  const [itemSearch, setItemSearch] = useState('');
  const [activeLineKey, setActiveLineKey] = useState<string | null>(null);

  const storesQuery = useQuery({
    queryKey: pharmacyQueryKeys.replenishmentStores(),
    queryFn: fetchPharmacyStoresMock,
  });

  const itemSearchQuery = useQuery({
    queryKey: pharmacyQueryKeys.indentItemSearch(itemSearch),
    queryFn: () => searchIndentItemsMock(itemSearch),
    enabled: itemSearch.trim().length >= 2,
  });

  const saveMutation = useMutation({
    mutationFn: saveIndentDraftMock,
    onSuccess: (result) => {
      toast.success(`Draft saved as ${result.indent_number} (demo).`);
    },
    onError: () => {
      toast.error('Unable to save draft.');
    },
  });

  const stores = storesQuery.data ?? [];

  const searchSuggestions = useMemo(() => {
    if (itemSearch.trim().length < 2) return [];
    return itemSearchQuery.data ?? [];
  }, [itemSearch, itemSearchQuery.data]);

  useEffect(() => {
    if (itemSearch.trim().length < 2) return;
    if (activeLineKey) return;
    const emptyLine = lines.find((line) => !line.item_id);
    const fallback = lines[lines.length - 1];
    setActiveLineKey(emptyLine?.key ?? fallback?.key ?? null);
  }, [itemSearch, lines, activeLineKey]);

  const updateLine = (key: string, patch: Partial<IndentDraftLine>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const applyItemToLine = (
    lineKey: string,
    item: NonNullable<typeof searchSuggestions>[number],
  ) => {
    setLines((prev) => {
      const next = prev.map((line) =>
        line.key === lineKey
          ? {
              ...line,
              item_id: item.id,
              item_name: item.name,
              item_code: item.item_code,
              available_qty: item.available_qty,
              base_uom: item.base_uom,
              last_grn_date: item.last_grn_date,
              requested_qty: line.requested_qty === '0' ? '1' : line.requested_qty,
            }
          : line,
      );
      const last = next[next.length - 1];
      if (last?.item_id) {
        return [...next, createEmptyIndentDraftLine()];
      }
      return next;
    });
    setItemSearch('');
    setActiveLineKey(null);
  };

  const handleSaveDraft = () => {
    saveMutation.mutate();
  };

  const headerActions = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:w-[280px]">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={itemSearch}
          onChange={(e) => setItemSearch(e.target.value)}
          placeholder="Search or scan item to add..."
          className="h-9 pl-9"
        />
        {searchSuggestions.length > 0 && activeLineKey ? (
          <div className="absolute top-full z-20 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
            {searchSuggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full flex-col rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => applyItemToLine(activeLineKey, item)}
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.item_code}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <Button
        type="button"
        size="sm"
        className="h-9"
        disabled={saveMutation.isPending}
        onClick={handleSaveDraft}
      >
        Save draft
      </Button>
    </div>
  );

  return (
    <PharmacyPageShell
      title="Create indent request"
      breadcrumbLabel="New"
      breadcrumbTrail={[{ label: 'Replenishment', href: '/pharmacy/replenishment' }]}
      hideTitle
    >
      <PageHeaderWithBack
        title="Create indent request"
        backButton={{ href: '/pharmacy/replenishment' }}
        actions={headerActions}
        className="px-6 pt-2"
      />
      <div className="flex flex-col gap-6 px-6 pb-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="indent-date">Indent date</Label>
              <Input
                id="indent-date"
                type="date"
                className="h-9"
                value={indentDate}
                onChange={(e) => setIndentDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="from-store">From store</Label>
              <Select value={fromStoreId} onValueChange={setFromStoreId}>
                <SelectTrigger id="from-store" className="h-9">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="to-store">To store</Label>
              <Select value={toStoreId} onValueChange={setToStoreId}>
                <SelectTrigger id="to-store" className="h-9">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
              <Label>Priority</Label>
              <ToggleGroup
                type="single"
                value={priority}
                onValueChange={(value) => {
                  if (value) setPriority(value as IndentPriority);
                }}
                variant="outline"
                className="justify-start"
              >
                <ToggleGroupItem value="normal" className="h-9 px-4">
                  Normal
                </ToggleGroupItem>
                <ToggleGroupItem value="urgent" className="h-9 px-4">
                  Urgent
                </ToggleGroupItem>
                <ToggleGroupItem value="stat" className="h-9 px-4">
                  STAT
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="indent-remarks">Remarks</Label>
            <Textarea
              id="indent-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes for the receiving store..."
              className="min-h-[72px] resize-none"
            />
          </div>

          <IndentRequestedItemsTable
            lines={lines}
            onLineChange={updateLine}
            onItemSearchFocus={(lineKey) => {
              setActiveLineKey(lineKey);
            }}
          />

          <p className="text-xs text-muted-foreground">
            Demo UI — connect replenishment API to persist indents.{' '}
            <Link to="/pharmacy/replenishment" className="text-primary hover:underline">
              Back to replenishment
            </Link>
          </p>
        </div>

        <IndentSummaryPanel lines={lines} />
      </div>
    </PharmacyPageShell>
  );
}
