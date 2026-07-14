import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Search } from 'lucide-react';
import { PageHeaderWithTabs } from '@pulse/patterns/page-header-with-tabs';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { DataTable } from '@/components/data-table';
import {
  usePharmacyReplenishmentIndents,
  usePharmacyReplenishmentLowStock,
  usePharmacyReplenishmentStores,
} from '../../api/replenishment-queries';
import type {
  IndentRequestStatus,
  PharmacyLowStockRow,
  ReplenishmentTab,
} from '../../types/replenishment-ui.types';
import { PharmacyPageShell } from '../pharmacy-page-shell';
import { ReplenishmentIndentsTable } from './replenishment-indents-table';

const REPLENISHMENT_TABS = [
  { value: 'low-stock', label: 'Low stock' },
  { value: 'indents', label: 'Indent requests' },
] as const;

const LOW_STOCK_PAGE_SIZE = 10;

function lowStockStatusLabel(status: PharmacyLowStockRow['status']): string {
  const map: Record<PharmacyLowStockRow['status'], string> = {
    low_stock: 'Low stock',
    out_of_stock: 'Out of stock',
    adequate: 'Adequate',
  };
  return map[status];
}

function lowStockStatusClass(status: PharmacyLowStockRow['status']): string {
  const map: Record<PharmacyLowStockRow['status'], string> = {
    low_stock: 'border-amber-500/60 text-amber-800',
    out_of_stock: 'border-red-500/60 text-red-700',
    adequate: 'border-green-500/60 text-green-700',
  };
  return map[status];
}

type PharmacyReplenishmentPageProps = {
  activeTab: ReplenishmentTab;
};

export function PharmacyReplenishmentPage({ activeTab }: PharmacyReplenishmentPageProps) {
  const navigate = useNavigate();
  const { data: stores = [] } = usePharmacyReplenishmentStores();
  const [storeId, setStoreId] = useState('');

  const [lowStockSearch, setLowStockSearch] = useState('');
  const [lowStockPage, setLowStockPage] = useState(1);

  const [indentSearch, setIndentSearch] = useState('');
  const [indentStatus, setIndentStatus] = useState('__all__');
  const [indentPage, setIndentPage] = useState(1);
  const [indentPageSize, setIndentPageSize] = useState(10);

  const lowStockParams = useMemo(
    () => ({
      q: lowStockSearch.trim() || undefined,
      page: lowStockPage,
      page_size: LOW_STOCK_PAGE_SIZE,
    }),
    [lowStockSearch, lowStockPage],
  );

  const indentParams = useMemo(
    () => ({
      q: indentSearch.trim() || undefined,
      status: indentStatus as IndentRequestStatus | '__all__',
      page: indentPage,
      page_size: indentPageSize,
    }),
    [indentSearch, indentStatus, indentPage, indentPageSize],
  );

  const lowStockQuery = usePharmacyReplenishmentLowStock({
    store_id: storeId || stores[0]?.id,
    q: lowStockParams.q,
    page: lowStockParams.page,
    page_size: lowStockParams.page_size,
  });

  const indentsQuery = usePharmacyReplenishmentIndents({
    from_store_id: storeId || stores[0]?.id,
    q: indentParams.q,
    status: indentParams.status,
    page: indentParams.page,
    page_size: indentParams.page_size,
    enabled: activeTab === 'indents',
  });

  const lowStockColumns = useMemo<ColumnDef<PharmacyLowStockRow>[]>(
    () => [
      {
        id: 'drug',
        header: 'Drug',
        accessorKey: 'drug_name',
      },
      {
        id: 'item_code',
        header: 'Item code',
        accessorKey: 'item_code',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.item_code}</span>
        ),
      },
      {
        id: 'available',
        header: () => <span className="block w-full text-right">Available</span>,
        cell: ({ row }) => (
          <span className="block w-full text-right tabular-nums">
            {row.original.available_qty}
          </span>
        ),
      },
      {
        id: 'reorder_level',
        header: () => <span className="block w-full text-right">Reorder level</span>,
        cell: ({ row }) => (
          <span className="block w-full text-right tabular-nums">
            {row.original.reorder_level > 0 ? row.original.reorder_level : '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant="outline" className={lowStockStatusClass(row.original.status)}>
            {lowStockStatusLabel(row.original.status)}
          </Badge>
        ),
      },
    ],
    [],
  );

  const setActiveTab = (tab: string) => {
    void navigate({
      to: '/pharmacy/replenishment',
      search: tab === 'indents' ? { tab: 'indents' } : {},
    });
  };

  const newIndentButton = (
    <Button type="button" size="sm" className="h-9" asChild>
      <Link to="/pharmacy/replenishment/new">
        <Plus className="mr-1.5 size-4" />
        {activeTab === 'indents' ? 'New' : 'New Indent'}
      </Link>
    </Button>
  );

  return (
    <PharmacyPageShell title="Replenishment" breadcrumbLabel="Replenishment" hideTitle>
      <PageHeaderWithTabs
        title="Replenishment"
        tabs={[...REPLENISHMENT_TABS]}
        value={activeTab}
        onValueChange={setActiveTab}
        actions={newIndentButton}
      />
      <div className="flex flex-col gap-4 p-6 pt-4">
        {activeTab === 'low-stock' ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {stores.length > 0 ? (
                <Select
                  value={storeId || stores[0]?.id}
                  onValueChange={setStoreId}
                >
                  <SelectTrigger className="h-9 w-[240px]">
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
              ) : null}
              <div className="relative w-full sm:max-w-[260px]">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={lowStockSearch}
                  onChange={(e) => {
                    setLowStockSearch(e.target.value);
                    setLowStockPage(1);
                  }}
                  placeholder="Search..."
                  className="h-9 pl-9"
                />
              </div>
            </div>
            <DataTable
              columns={lowStockColumns}
              data={lowStockQuery.data?.data ?? []}
              isLoading={lowStockQuery.isLoading}
              emptyTitle="No low-stock items for this store."
              showColumnMenu
              manualPagination={{
                pageIndex: lowStockPage - 1,
                pageSize: LOW_STOCK_PAGE_SIZE,
                total: lowStockQuery.data?.total ?? 0,
                onPageChange: (pageIndex) => setLowStockPage(pageIndex + 1),
                onPageSizeChange: () => {
                  /* fixed page size for demo */
                },
              }}
            />
          </>
        ) : (
          <ReplenishmentIndentsTable
            rows={indentsQuery.data?.data ?? []}
            isLoading={indentsQuery.isLoading}
            statusFilter={indentStatus}
            onStatusFilterChange={(value) => {
              setIndentStatus(value);
              setIndentPage(1);
            }}
            search={indentSearch}
            onSearchChange={(value) => {
              setIndentSearch(value);
              setIndentPage(1);
            }}
            page={indentPage}
            pageSize={indentPageSize}
            total={indentsQuery.data?.total ?? 0}
            onPageChange={setIndentPage}
            onPageSizeChange={setIndentPageSize}
          />
        )}
      </div>
    </PharmacyPageShell>
  );
}
