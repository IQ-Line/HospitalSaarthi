import { useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  isIndentReadyForTransferQueue,
  transferQueueAction,
} from '../lib/indent-workflow';
import {
  canDispatchTransfer,
  canReceiveTransfer,
  defaultTransferDirection,
  incomingTransferStoreFilter,
  outgoingTransferStoreFilter,
  type TransferListDirection,
} from '../lib/transfer-workflow';
import { validateIndentForTransferPrefill } from '../lib/transfer-indent-prefill';
import { indentStatusBadgeVariant, indentStatusLabel } from '../lib/indent-status';
import {
  TRANSFER_STATUS_FILTER_OPTIONS,
  transferStatusBadgeClass,
  transferStatusLabel,
} from '../lib/transfer-status';
import {
  useInventoryIndentDetail,
  useInventoryIndentStores,
  useInventoryIndents,
  useInventoryStores,
  useInventoryTransferDetail,
  useInventoryTransfers,
} from '../api/queries';
import type { InventoryIndentRow, InventoryTransferRow } from '../types';
import type { InventoryOperationalVariant } from '../lib/inventory-operational-variant';
import { operationalNewTransferPath } from '../lib/inventory-operational-variant';
import { InventoryPageShell } from './inventory-page-shell';
import { InventoryTransferDialog } from './inventory-transfer-dialog';
import { InventoryTransferReceiveDialog } from './inventory-transfer-receive-dialog';

function formatTransferDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type TransferRoutePrefill = {
  indentId?: string;
  transferId?: string;
  fromStoreId?: string;
  toStoreId?: string;
};

type TransferQueueRow = {
  indent: InventoryIndentRow;
  action: 'create' | 'dispatch';
  draftTransferId?: string;
};

type InventoryTransfersPageProps = {
  direction?: TransferListDirection;
  storeId?: string;
  routePrefill?: TransferRoutePrefill;
  variant?: InventoryOperationalVariant;
  presentation?: 'operations' | 'counter';
};

export function InventoryTransfersPage({
  direction: directionProp,
  storeId: storeIdProp,
  routePrefill,
  variant = 'inventory',
  presentation = 'operations',
}: InventoryTransfersPageProps) {
  const navigate = useNavigate();
  const { data: indentStores = [] } = useInventoryIndentStores();
  const { data: inventoryStores = [] } = useInventoryStores();
  const stores = indentStores.length > 0 ? indentStores : inventoryStores;

  const [storeId, setStoreId] = useState(storeIdProp ?? routePrefill?.fromStoreId ?? '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | InventoryTransferRow['status']>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [selectedIndent, setSelectedIndent] = useState<InventoryIndentRow | null>(null);

  const direction = directionProp ?? defaultTransferDirection();
  const isCounterPresentation = presentation === 'counter' || variant === 'pharmacy';
  const newTransferPath = operationalNewTransferPath(variant);

  useEffect(() => {
    if (storeIdProp) {
      setStoreId(storeIdProp);
    }
  }, [storeIdProp]);

  useEffect(() => {
    if (storeIdProp) return;
    if (!storeId && stores.length > 0) {
      setStoreId(stores[0]!.id);
    }
  }, [storeId, storeIdProp, stores]);

  const { data: indentDetail } = useInventoryIndentDetail(routePrefill?.indentId);
  const { data: routeTransferDetail } = useInventoryTransferDetail(routePrefill?.transferId);
  const { data: selectedTransferDetail } = useInventoryTransferDetail(
    (dispatchDialogOpen || receiveDialogOpen) && selectedTransferId ? selectedTransferId : undefined,
  );

  const { data: readyIndentsData, isLoading: readyIndentsLoading } = useInventoryIndents({
    limit: 200,
    ...(direction === 'outgoing' && storeId ? outgoingTransferStoreFilter(storeId) : {}),
  });

  const { data: draftTransfersData } = useInventoryTransfers({
    status: 'draft',
    limit: 200,
    ...(direction === 'outgoing' && storeId ? outgoingTransferStoreFilter(storeId) : {}),
  });

  const draftTransferIds = useMemo(
    () => new Set((draftTransfersData?.data ?? []).map((row) => row.id)),
    [draftTransfersData?.data],
  );

  const readyQueue = useMemo(() => {
    if (direction !== 'outgoing') return [];
    const needle = search.trim().toLowerCase();
    return (readyIndentsData?.data ?? [])
      .filter((indent) => isIndentReadyForTransferQueue(indent, draftTransferIds))
      .filter((indent) => {
        if (!needle) return true;
        return (
          indent.indent_number.toLowerCase().includes(needle) ||
          indent.to_store.toLowerCase().includes(needle)
        );
      })
      .map((indent): TransferQueueRow => ({
        indent,
        action: transferQueueAction(indent, draftTransferIds) ?? 'create',
        draftTransferId: indent.inventory_stock_transfer_id ?? undefined,
      }));
  }, [direction, draftTransferIds, readyIndentsData?.data, search]);

  const transferListParams = useMemo(() => {
    const mappedStatus =
      status === 'all'
        ? undefined
        : ({
            Draft: 'draft',
            Dispatched: 'in_transit',
            'Partially received': 'partially_received',
            Completed: 'completed',
            Rejected: 'rejected',
            Cancelled: 'cancelled',
          }[status] as const);

    return {
      search: search || undefined,
      status: isCounterPresentation || (direction === 'incoming' && status === 'all') ? undefined : mappedStatus,
      statuses:
        !isCounterPresentation && direction === 'incoming' && status === 'all'
          ? (['in_transit', 'partially_received'] as const)
          : undefined,
      page,
      limit: pageSize,
      ...(isCounterPresentation && storeId ? outgoingTransferStoreFilter(storeId) : {}),
      ...(!isCounterPresentation && direction === 'outgoing' && storeId
        ? outgoingTransferStoreFilter(storeId)
        : {}),
      ...(!isCounterPresentation && direction === 'incoming' && storeId
        ? incomingTransferStoreFilter(storeId)
        : {}),
    };
  }, [direction, isCounterPresentation, page, pageSize, search, status, storeId]);

  const { data: transferData, isLoading: transfersLoading } = useInventoryTransfers(transferListParams);
  const transferRows = transferData?.data ?? [];

  useEffect(() => {
    if (routePrefill?.transferId && routeTransferDetail) {
      setSelectedTransferId(routeTransferDetail.id);
      setSelectedIndent(null);
      if (canReceiveTransfer(routeTransferDetail)) {
        setReceiveDialogOpen(true);
      } else {
        setDispatchDialogOpen(true);
      }
      return;
    }
    if (!routePrefill?.indentId || !indentDetail) return;
    const validation = validateIndentForTransferPrefill(indentDetail);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    if (
      indentDetail.inventory_stock_transfer_id &&
      draftTransferIds.has(indentDetail.inventory_stock_transfer_id)
    ) {
      setSelectedTransferId(indentDetail.inventory_stock_transfer_id);
      setSelectedIndent(null);
      setDispatchDialogOpen(true);
    } else {
      setSelectedTransferId(null);
      setSelectedIndent(indentDetail);
      setDispatchDialogOpen(true);
    }
  }, [draftTransferIds, indentDetail, routePrefill?.indentId, routePrefill?.transferId, routeTransferDetail]);

  const setDirection = (next: TransferListDirection) => {
    const transfersRoute =
      variant === 'pharmacy' ? '/pharmacy/transfers' : '/inventory/transfers';
    void navigate({
      to: transfersRoute,
      search: { tab: next, storeId: storeId || undefined },
    });
  };

  const handleStoreChange = (nextStoreId: string) => {
    setStoreId(nextStoreId);
    setPage(1);
    const transfersRoute =
      variant === 'pharmacy' ? '/pharmacy/transfers' : '/inventory/transfers';
    void navigate({
      to: transfersRoute,
      search: { tab: direction, storeId: nextStoreId },
    });
  };

  const openQueueRow = (row: TransferQueueRow) => {
    if (row.action === 'dispatch' && row.draftTransferId) {
      setSelectedIndent(null);
      setSelectedTransferId(row.draftTransferId);
      setDispatchDialogOpen(true);
      return;
    }
    const validation = validateIndentForTransferPrefill(row.indent);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    setSelectedTransferId(null);
    setSelectedIndent(row.indent);
    setDispatchDialogOpen(true);
  };

  const openOutgoingTransfer = (row: InventoryTransferRow) => {
    setSelectedIndent(null);
    setSelectedTransferId(row.id);
    setDispatchDialogOpen(true);
  };

  const openIncomingTransfer = (row: InventoryTransferRow) => {
    setSelectedIndent(null);
    setSelectedTransferId(row.id);
    setReceiveDialogOpen(true);
  };

  const readyColumns = useMemo<ColumnDef<TransferQueueRow, unknown>[]>(
    () => [
      {
        id: 'indent_number',
        header: 'Indent #',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.indent.indent_number}</span>
        ),
      },
      { id: 'to_store', header: 'Requesting store', cell: ({ row }) => row.original.indent.to_store },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={indentStatusBadgeVariant(row.original.indent.status)}>
            {indentStatusLabel(row.original.indent.status)}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => openQueueRow(row.original)}>
            {row.original.action === 'dispatch' ? 'Dispatch' : 'Create transfer'}
          </Button>
        ),
      },
    ],
    [],
  );

  const outgoingColumns = useMemo<ColumnDef<InventoryTransferRow, unknown>[]>(
    () => [
      {
        accessorKey: 'transfer_number',
        header: 'Transfer #',
        cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'transfer_date',
        header: 'Date',
        cell: ({ getValue }) => formatTransferDate(getValue<string>()),
      },
      { accessorKey: 'to_store', header: 'To' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant="outline" className={`text-xs ${transferStatusBadgeClass(getValue<InventoryTransferRow['status']>())}`}>
            {transferStatusLabel(getValue<InventoryTransferRow['status']>())}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          canDispatchTransfer(row.original) ? (
            <Button type="button" variant="outline" size="sm" onClick={() => openOutgoingTransfer(row.original)}>
              Dispatch
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => openOutgoingTransfer(row.original)}>
              View
            </Button>
          ),
      },
    ],
    [],
  );

  const incomingColumns = useMemo<ColumnDef<InventoryTransferRow, unknown>[]>(
    () => [
      {
        accessorKey: 'transfer_number',
        header: 'Transfer #',
        cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'indent_number',
        header: 'Linked indent',
        cell: ({ getValue }) => getValue<string>() ?? '—',
      },
      { accessorKey: 'from_store', header: 'Source store' },
      {
        accessorKey: 'transfer_date',
        header: 'Dispatch date',
        cell: ({ getValue }) => formatTransferDate(getValue<string>()),
      },
      {
        id: 'items',
        header: 'Items',
        cell: ({ row }) => row.original.line_count ?? row.original.lines.length ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant="outline" className={`text-xs ${transferStatusBadgeClass(getValue<InventoryTransferRow['status']>())}`}>
            {transferStatusLabel(getValue<InventoryTransferRow['status']>())}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          canReceiveTransfer(row.original) ? (
            <Button type="button" variant="outline" size="sm" onClick={() => openIncomingTransfer(row.original)}>
              Receive
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => openIncomingTransfer(row.original)}>
              View
            </Button>
          ),
      },
    ],
    [],
  );

  const dialogTransfer = selectedTransferDetail ?? routeTransferDetail ?? null;
  const transferLoading = Boolean(selectedTransferId) && !dialogTransfer;

  const counterColumns = useMemo<ColumnDef<InventoryTransferRow, unknown>[]>(
    () => [
      {
        accessorKey: 'transfer_number',
        header: 'Transfer #',
        cell: ({ row }) => (
          <button
            type="button"
            className="font-mono text-xs text-primary hover:underline"
            onClick={() => openOutgoingTransfer(row.original)}
          >
            {row.original.transfer_number}
          </button>
        ),
      },
      {
        id: 'date',
        header: 'Date',
        cell: ({ row }) => formatTransferDate(row.original.transfer_date),
      },
      { accessorKey: 'from_store', header: 'From' },
      { accessorKey: 'to_store', header: 'To' },
      {
        accessorKey: 'transfer_type',
        header: 'Type',
        cell: ({ getValue }) => (getValue<string>() === 'emergency' ? 'Emergency' : 'Normal'),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant="outline" className={`text-xs ${transferStatusBadgeClass(getValue<InventoryTransferRow['status']>())}`}>
            {transferStatusLabel(getValue<InventoryTransferRow['status']>())}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <InventoryPageShell
      title="Stock transfers"
      breadcrumbLabel="Transfers"
      variant={variant}
      actions={
        isCounterPresentation ? (
          <Button type="button" size="sm" className="gap-1.5" asChild>
            <Link to={newTransferPath}>
              <Plus className="size-4" aria-hidden />
              New transfer
            </Link>
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid min-w-[14rem] gap-1">
            <span className="text-xs text-muted-foreground">Store context</span>
            <Select value={storeId || undefined} onValueChange={handleStoreChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.store_code} — {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isCounterPresentation ? (
          <Tabs value={direction} onValueChange={(value) => setDirection(value as TransferListDirection)}>
            <TabsList>
              <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
              <TabsTrigger value="incoming">Incoming</TabsTrigger>
            </TabsList>
          </Tabs>
          ) : null}
        </div>

        {isCounterPresentation ? (
          <div className="rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
              <EntityTableToolbar
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Search..."
                debounceMs={0}
              />
            </div>
            <div className="p-3 pt-0">
              <DataTable
                columns={counterColumns}
                data={transferRows}
                isLoading={transfersLoading}
                getRowId={(row) => row.id}
                emptyTitle="No transfers"
                emptyDescription="Stock transfers for this store will appear here."
                manualPagination={{
                  pageIndex: page - 1,
                  pageSize,
                  total: transferData?.total ?? 0,
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
        ) : direction === 'outgoing' ? (
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
                <div>
                  <h2 className="text-sm font-medium">Ready for transfer</h2>
                  <p className="text-xs text-muted-foreground">
                    Approved indents and draft transfers from this store.
                  </p>
                </div>
                <EntityTableToolbar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search indent"
                  debounceMs={0}
                />
              </div>
              <div className="p-3 pt-0">
                <DataTable
                  columns={readyColumns}
                  data={readyQueue}
                  isLoading={readyIndentsLoading}
                  getRowId={(row) => row.indent.id}
                  emptyTitle="No indents awaiting dispatch"
                  emptyDescription="Approved stock-transfer indents from this store will appear here."
                />
              </div>
            </div>

            <div className="rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
                <h2 className="text-sm font-medium">Outgoing transfers</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value as typeof status);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[10rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFER_STATUS_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 pt-0">
                <DataTable
                  columns={outgoingColumns}
                  data={transferRows}
                  isLoading={transfersLoading}
                  getRowId={(row) => row.id}
                  emptyTitle="No outgoing transfers"
                  emptyDescription="Transfers dispatched from this store appear here."
                  manualPagination={{
                    pageIndex: page - 1,
                    pageSize,
                    total: transferData?.total ?? 0,
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
        ) : (
          <div className="rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
              <div>
                <h2 className="text-sm font-medium">Incoming transfers</h2>
                <p className="text-xs text-muted-foreground">
                  Dispatched transfers awaiting receipt at this store.
                </p>
              </div>
              <EntityTableToolbar
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Search transfer"
                debounceMs={0}
              />
            </div>
            <div className="p-3 pt-0">
              <DataTable
                columns={incomingColumns}
                data={transferRows}
                isLoading={transfersLoading}
                getRowId={(row) => row.id}
                emptyTitle="No incoming transfers"
                emptyDescription="Dispatched transfers addressed to this store will appear here."
                manualPagination={{
                  pageIndex: page - 1,
                  pageSize,
                  total: transferData?.total ?? 0,
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
        )}
      </div>

      <InventoryTransferDialog
        open={dispatchDialogOpen}
        onOpenChange={(open) => {
          setDispatchDialogOpen(open);
          if (!open) {
            setSelectedTransferId(null);
            setSelectedIndent(null);
          }
        }}
        transfer={dialogTransfer}
        transferLoading={transferLoading}
        indentPrefill={selectedIndent ?? (routePrefill?.indentId ? indentDetail : null)}
      />

      <InventoryTransferReceiveDialog
        open={receiveDialogOpen}
        onOpenChange={(open) => {
          setReceiveDialogOpen(open);
          if (!open) setSelectedTransferId(null);
        }}
        transfer={dialogTransfer}
        transferLoading={transferLoading}
      />
    </InventoryPageShell>
  );
}
