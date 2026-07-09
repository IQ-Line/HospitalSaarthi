import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Minus, Plus } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@pulse/ui/tabs';
import { DataTable } from '@/components/data-table';
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import { OPERATIONAL_INVENTORY_API_ENABLED } from '../lib/inventory-api-enabled';
import {
  canShowIncomingTab,
  canShowOutgoingTab,
  defaultIndentDirection,
  type IndentListDirection,
} from '../lib/indent-workflow';
import { INDENT_STATUS_FILTER_OPTIONS, indentStatusBadgeVariant, indentStatusLabel } from '../lib/indent-status';
import { useInventoryIndentStores, useInventoryIndents, useInventoryStores } from '../api/queries';
import type { InventoryIndentRow, InventoryIndentStoreOption } from '../types';
import { InventoryPageShell } from './inventory-page-shell';

function formatIndentDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function IndentLinesSubRow({ lines }: { lines: InventoryIndentRow['lines'] }) {
  if (lines.length === 0) {
    return (
      <div className="bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        No items on this indent.
      </div>
    );
  }
  return (
    <div className="bg-muted/30 px-4 py-3">
      <ul className="space-y-2 text-sm">
        {lines.map((line) => (
          <li key={line.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-medium">{line.item_name}</span>
              <span className="text-muted-foreground"> · {line.item_code}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">
              {line.requested_qty} {line.uom}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MOCK_INDENT_STORES: InventoryIndentStoreOption[] = [
  {
    id: 'store-cms',
    name: 'Central Medical Store',
    store_code: 'CMS-001',
    indent_authority: false,
    indent_target_store_id: null,
  },
  {
    id: 'store-new',
    name: 'New store',
    store_code: '000-STO-00001',
    indent_authority: true,
    indent_target_store_id: 'store-cms',
  },
  {
    id: 'store-inv',
    name: 'Inventory store',
    store_code: 'INV-002',
    indent_authority: true,
    indent_target_store_id: 'store-cms',
  },
];

type InventoryIndentsPageProps = {
  direction?: IndentListDirection;
  storeId?: string;
};

export function InventoryIndentsPage({ direction: directionProp, storeId: storeIdProp }: InventoryIndentsPageProps) {
  const navigate = useNavigate();
  const { data: liveIndentStores = [], isLoading: storesLoading } = useInventoryIndentStores();
  const { data: fallbackStores = [] } = useInventoryStores();
  const indentStores = OPERATIONAL_INVENTORY_API_ENABLED
    ? liveIndentStores
    : MOCK_INDENT_STORES.length > 0
      ? MOCK_INDENT_STORES
      : fallbackStores.map((store) => ({
          id: store.id,
          name: store.name,
          store_code: store.store_code,
          indent_authority: store.id !== 'store-cms',
          indent_target_store_id: store.id !== 'store-cms' ? 'store-cms' : null,
        }));

  const [storeId, setStoreId] = useState(storeIdProp ?? '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | InventoryIndentRow['status']>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeStore = indentStores.find((store) => store.id === storeId);

  useEffect(() => {
    if (storeIdProp) {
      setStoreId(storeIdProp);
      return;
    }
    if (!storeId && indentStores.length > 0) {
      setStoreId(indentStores[0]!.id);
    }
  }, [storeId, storeIdProp, indentStores]);

  const direction = directionProp ?? defaultIndentDirection(activeStore);
  const showOutgoing = canShowOutgoingTab(activeStore);
  const showIncoming = canShowIncomingTab(activeStore);
  const showTabs = showOutgoing && showIncoming;

  const listParams = useMemo(
    () => ({
      search: search || undefined,
      status,
      page,
      limit: pageSize,
      // Outgoing = receiving store's requests (To). Incoming = approving/sending store's inbox (From).
      ...(direction === 'outgoing' && storeId ? { to_store_id: storeId } : {}),
      ...(direction === 'incoming' && storeId ? { from_store_id: storeId } : {}),
    }),
    [direction, page, pageSize, search, status, storeId],
  );

  const { data, isLoading } = useInventoryIndents(listParams);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const openIndent = (indentId: string) => {
    void navigate({
      to: '/inventory/indents/$indentId',
      params: { indentId },
      search: { view: direction, storeId },
    });
  };

  const outgoingColumns = useMemo<ColumnDef<InventoryIndentRow, unknown>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        meta: { label: '#', headerClassName: 'w-12' },
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {(page - 1) * pageSize + row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: 'indent_number',
        header: 'Indent #',
        meta: { label: 'Indent #' },
        cell: ({ row, getValue }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => openIndent(row.original.id)}
          >
            {getValue<string>()}
          </button>
        ),
      },
      {
        accessorKey: 'request_date',
        header: 'Indent date',
        meta: { label: 'Indent date' },
        cell: ({ getValue }) => formatIndentDate(getValue<string>()),
      },
      { accessorKey: 'from_store', header: 'From store', meta: { label: 'From store' } },
      {
        accessorKey: 'priority',
        header: 'Priority',
        meta: { label: 'Priority' },
        cell: ({ getValue }) => String(getValue<string>()).toUpperCase(),
      },
      {
        id: 'items',
        header: 'Items',
        meta: { label: 'Items' },
        cell: ({ row }) => row.original.lines.filter((line) => line.item_id || line.item_name).length,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => {
          const value = getValue<InventoryIndentRow['status']>();
          return (
            <Badge variant={indentStatusBadgeVariant(value)}>{indentStatusLabel(value)}</Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Action',
        meta: { headerClassName: 'w-24' },
        cell: ({ row }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => openIndent(row.original.id)}>
            Open
          </Button>
        ),
      },
      {
        id: 'expand',
        header: '',
        meta: { headerClassName: 'w-12' },
        cell: ({ row }) => {
          const isOpen = expandedId === row.original.id;
          return (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={isOpen ? 'Collapse indent lines' : 'Expand indent lines'}
              onClick={(event) => {
                event.stopPropagation();
                setExpandedId(isOpen ? null : row.original.id);
              }}
            >
              {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
            </Button>
          );
        },
      },
    ],
    [expandedId, page, pageSize, direction, storeId],
  );

  const incomingColumns = useMemo<ColumnDef<InventoryIndentRow, unknown>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        meta: { label: '#', headerClassName: 'w-12' },
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {(page - 1) * pageSize + row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: 'indent_number',
        header: 'Indent number',
        meta: { label: 'Indent number' },
        cell: ({ row, getValue }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => openIndent(row.original.id)}
          >
            {getValue<string>()}
          </button>
        ),
      },
      {
        accessorKey: 'request_date',
        header: 'Indent date',
        meta: { label: 'Indent date' },
        cell: ({ getValue }) => formatIndentDate(getValue<string>()),
      },
      { accessorKey: 'to_store', header: 'Receiving store', meta: { label: 'Receiving store' } },
      {
        id: 'requested_by',
        header: 'Requested by',
        meta: { label: 'Requested by' },
        cell: ({ row }) => row.original.created_by?.slice(0, 8) ?? '—',
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        meta: { label: 'Priority' },
        cell: ({ getValue }) => String(getValue<string>()).toUpperCase(),
      },
      {
        id: 'items',
        header: 'Number of items',
        meta: { label: 'Number of items' },
        cell: ({ row }) => row.original.lines.filter((line) => line.item_id || line.item_name).length,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => {
          const value = getValue<InventoryIndentRow['status']>();
          return (
            <Badge variant={indentStatusBadgeVariant(value)}>{indentStatusLabel(value)}</Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Action',
        meta: { headerClassName: 'w-24' },
        cell: ({ row }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => openIndent(row.original.id)}>
            Open
          </Button>
        ),
      },
    ],
    [page, pageSize, direction, storeId],
  );

  const columns = direction === 'incoming' ? incomingColumns : outgoingColumns;

  const handleDirectionChange = (next: IndentListDirection) => {
    void navigate({
      to: '/inventory/indents',
      search: { tab: next, storeId: storeId || undefined },
    });
  };

  const handleStoreChange = (nextStoreId: string) => {
    setStoreId(nextStoreId);
    setPage(1);
    const nextStore = indentStores.find((store) => store.id === nextStoreId);
    const nextDirection = defaultIndentDirection(nextStore);
    void navigate({
      to: '/inventory/indents',
      search: { tab: nextDirection, storeId: nextStoreId },
    });
  };

  return (
    <InventoryPageShell
      title="Stock indents"
      breadcrumbLabel="Indents"
      actions={
        activeStore?.indent_authority ? (
          <Button type="button" size="sm" asChild>
            <Link to="/inventory/indents/new" search={{ view: 'outgoing', storeId }}>
              + New indent
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {showTabs ? (
            <Tabs value={direction} onValueChange={(value) => handleDirectionChange(value as IndentListDirection)}>
              <TabsList>
                {showOutgoing ? <TabsTrigger value="outgoing">Outgoing indents</TabsTrigger> : null}
                {showIncoming ? <TabsTrigger value="incoming">Incoming indents</TabsTrigger> : null}
              </TabsList>
            </Tabs>
          ) : (
            <p className="text-sm font-medium text-foreground">
              {direction === 'incoming' ? 'Incoming indents' : 'Outgoing indents'}
            </p>
          )}

          <div className="min-w-[220px] space-y-1">
            <p className="text-xs text-muted-foreground">Store</p>
            <Select value={storeId || undefined} onValueChange={handleStoreChange} disabled={storesLoading}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {indentStores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.store_code} — {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="flex flex-wrap items-center gap-3 border-b p-3">
            <EntityTableToolbar
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search indent #"
              debounceMs={0}
            />
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as typeof status);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDENT_STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 pt-0">
            <DataTable
              columns={columns}
              data={rows}
              isLoading={isLoading}
              getRowId={(row) => row.id}
              expandedRowId={direction === 'outgoing' ? expandedId : null}
              renderSubRow={(row) => <IndentLinesSubRow lines={row.lines} />}
              emptyTitle={direction === 'incoming' ? 'No incoming indents' : 'No outgoing indents'}
              emptyDescription={
                direction === 'incoming'
                  ? 'Indents received by this store will appear here.'
                  : 'Create a new indent to request stock from the fulfilling store.'
              }
              manualPagination={{
                pageIndex: page - 1,
                pageSize,
                total,
                pageSizeOptions: [10, 20, 50],
                onPageChange: (pageIndex) => setPage(pageIndex + 1),
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setPage(1);
                },
              }}
            />
          </div>
        </div>
      </div>
    </InventoryPageShell>
  );
}
