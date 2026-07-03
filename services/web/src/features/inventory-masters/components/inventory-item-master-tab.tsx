import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { PageShell, usePageSidePanelSafe } from '@pulse/layouts/page-shell';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { useDepartments } from '@/features/master-data/api/departments';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { useInventoryItemCreate } from '@/features/inventory-masters/api/item-mutations';
import {
  INVENTORY_MASTERS_DEFAULT_PAGE_SIZE,
  INVENTORY_MASTERS_FORM_LOOKUP_PARAMS,
  INVENTORY_MASTERS_PAGE_SIZES,
} from '@/features/inventory-masters/api/list-url';
import {
  useInventoryCategories,
  useInventoryHsnGst,
  useInventoryItems,
  useInventoryItemTypes,
  useInventoryManufacturers,
  useInventoryStorageConditions,
  useInventoryUoms,
} from '@/features/inventory-masters/api/queries';
import { ItemMasterFormPanel } from '@/features/inventory-masters/items/item-master-form-panel';
import type { CreateItemMasterPayload } from '@/features/inventory-masters/items/item-master-model';
import { useInventoryMastersTenantId } from '@/features/inventory-masters/lib/inventory-catalog-api-context';
import {
  InventoryMasterStatusBadge,
} from '@/features/inventory-masters/components/inventory-master-status-badge';
import {
  inventoryMasterIndexColumn,
  InventoryMastersTableCard,
} from '@/features/inventory-masters/components/inventory-masters-table-card';
import type {
  InventoryItemMaster,
  InventoryMasterListParams,
} from '@/features/inventory-masters/types';

const CLASSIFICATION_LABELS: Record<InventoryItemMaster['classification'], string> = {
  inventory_item: 'Inventory Item',
  medicine: 'Medicine',
};

type InventoryItemMasterTabProps = {
  onRegisterAdd?: (openAdd: (() => void) | undefined) => void;
  search: string;
  onSearchChange: (value: string) => void;
  status: InventoryMasterListParams['status'];
  onStatusChange: (value: InventoryMasterListParams['status']) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  classificationFilter: string;
  onClassificationFilterChange: (value: string) => void;
};

export function InventoryItemMasterTab({
  onRegisterAdd,
  search,
  onSearchChange,
  status,
  onStatusChange,
  categoryFilter,
  onCategoryFilterChange,
  classificationFilter,
  onClassificationFilterChange,
}: InventoryItemMasterTabProps) {
  const sidePanel = usePageSidePanelSafe();
  const [panelMode, setPanelMode] = useState<'closed' | 'create'>('closed');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(INVENTORY_MASTERS_DEFAULT_PAGE_SIZE);
  const create = useInventoryItemCreate();

  useEffect(() => {
    setPageIndex(0);
  }, [search, status, categoryFilter, classificationFilter]);

  const listParams = useMemo<InventoryMasterListParams>(
    () => ({
      search: search || undefined,
      status,
      pageIndex,
      pageSize,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      classification:
        classificationFilter === 'inventory_item' || classificationFilter === 'medicine'
          ? classificationFilter
          : 'all',
    }),
    [search, status, pageIndex, pageSize, categoryFilter, classificationFilter],
  );

  const catalogTenantId = useInventoryMastersTenantId();

  const categoriesQuery = useInventoryCategories(INVENTORY_MASTERS_FORM_LOOKUP_PARAMS);
  const itemTypesQuery = useInventoryItemTypes(INVENTORY_MASTERS_FORM_LOOKUP_PARAMS);
  const uomsQuery = useInventoryUoms(INVENTORY_MASTERS_FORM_LOOKUP_PARAMS);
  const storageQuery = useInventoryStorageConditions(INVENTORY_MASTERS_FORM_LOOKUP_PARAMS);
  const hsnQuery = useInventoryHsnGst(INVENTORY_MASTERS_FORM_LOOKUP_PARAMS);
  const manufacturersQuery = useInventoryManufacturers(INVENTORY_MASTERS_FORM_LOOKUP_PARAMS);
  const departmentsQuery = useDepartments(undefined, {
    formCatalog: true,
    iqTenantId: catalogTenantId,
  });

  const itemLookupMaps = useMemo(() => {
    const itemTypeNameById = new Map<string, string>();
    for (const row of itemTypesQuery.data?.data ?? []) {
      itemTypeNameById.set(row.id, row.item_type);
    }
    const categoryNameById = new Map<string, string>();
    for (const row of categoriesQuery.data?.data ?? []) {
      categoryNameById.set(row.id, row.category_name);
    }
    return { itemTypeNameById, categoryNameById };
  }, [categoriesQuery.data?.data, itemTypesQuery.data?.data]);

  const itemsQuery = useInventoryItems(listParams, itemLookupMaps);
  const itemRows = itemsQuery.data?.data ?? [];
  const itemTotal = itemsQuery.data?.total ?? 0;

  const categoryFilterOptions = useMemo(
    () =>
      (categoriesQuery.data?.data ?? [])
        .filter((row) => row.status === 'active')
        .sort((a, b) => a.category_name.localeCompare(b.category_name)),
    [categoriesQuery.data?.data],
  );

  const itemColumns = useMemo<ColumnDef<InventoryItemMaster, unknown>[]>(
    () => [
      inventoryMasterIndexColumn<InventoryItemMaster>(),
      {
        accessorKey: 'item_code',
        header: 'Item Code',
        meta: { label: 'Item Code' },
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      { accessorKey: 'item_name', header: 'Item Name', meta: { label: 'Item Name' } },
      { accessorKey: 'display_name', header: 'Display Name', meta: { label: 'Display Name' } },
      {
        accessorKey: 'classification',
        header: 'Classification',
        meta: { label: 'Classification' },
        cell: ({ getValue }) => CLASSIFICATION_LABELS[getValue<InventoryItemMaster['classification']>()],
      },
      { accessorKey: 'item_type', header: 'Item Type', meta: { label: 'Item Type' } },
      { accessorKey: 'product_category', header: 'Category', meta: { label: 'Category' } },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue<InventoryItemMaster['status']>()} />,
      },
    ],
    [],
  );

  const closePanel = useCallback(() => {
    setPanelMode('closed');
  }, []);

  const openCreatePanel = useCallback(() => {
    setPanelMode('create');
  }, []);

  useEffect(() => {
    onRegisterAdd?.(openCreatePanel);
    return () => onRegisterAdd?.(undefined);
  }, [onRegisterAdd, openCreatePanel]);

  const handleSubmit = useCallback(
    async (payload: CreateItemMasterPayload) => {
      try {
        await create.mutateAsync(payload);
        toast.success('Item created');
        closePanel();
      } catch (error) {
        toast.error(mutationErrorMessage(error));
      }
    },
    [closePanel, create],
  );

  useEffect(() => {
    if (!sidePanel) return;
    if (panelMode === 'closed') {
      sidePanel.close();
      return;
    }

    const panel = (
      <ItemMasterFormPanel
        key="create"
        open
        onClose={closePanel}
        isSaving={create.isPending}
        categories={categoriesQuery.data?.data ?? []}
        itemTypes={itemTypesQuery.data?.data ?? []}
        uoms={uomsQuery.data?.data ?? []}
        storageConditions={storageQuery.data?.data ?? []}
        hsnRows={hsnQuery.data?.data ?? []}
        manufacturers={manufacturersQuery.data?.data ?? []}
        departments={departmentsQuery.data?.data ?? []}
        onSubmit={handleSubmit}
      />
    );

    const openOptions = {
      showShellCloseButton: false,
      sidePanelWidth: 'min(560px, 45vw)',
      contentFingerprint: 'create',
    } as const;

    // `open()` skips updates when the fingerprint is unchanged (loop guard). Lookup
    // queries (departments, categories, …) often resolve after the first open, so
    // refresh panel content without remounting the form via `setContent`.
    if (sidePanel.isOpen) {
      sidePanel.setContent(panel);
    } else {
      sidePanel.open(panel, closePanel, openOptions);
    }
  }, [
    panelMode,
    sidePanel,
    closePanel,
    handleSubmit,
    create.isPending,
    categoriesQuery.data?.data,
    itemTypesQuery.data?.data,
    uomsQuery.data?.data,
    storageQuery.data?.data,
    hsnQuery.data?.data,
    manufacturersQuery.data?.data,
    departmentsQuery.data?.data,
  ]);

  return (
    <InventoryMastersTableCard
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search items…"
      status={status}
      onStatusChange={onStatusChange}
      extraFilters={
        <>
          <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryFilterOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classificationFilter} onValueChange={onClassificationFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All classifications" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classifications</SelectItem>
              <SelectItem value="inventory_item">Inventory Item</SelectItem>
              <SelectItem value="medicine">Medicine</SelectItem>
            </SelectContent>
          </Select>
        </>
      }
      columns={itemColumns}
      data={itemRows}
      isLoading={itemsQuery.isLoading}
      emptyTitle="No items found"
      emptyDescription="Add an item or adjust your filters."
      manualPagination={{
        pageIndex,
        pageSize,
        total: itemTotal,
        pageSizeOptions: INVENTORY_MASTERS_PAGE_SIZES,
        onPageChange: setPageIndex,
        onPageSizeChange: (next) => {
          setPageSize(next);
          setPageIndex(0);
        },
      }}
    />
  );
}

export function InventoryItemMasterTabShell({ children }: { children: ReactNode }) {
  return <PageShell sidePanelWidth="min(560px, 45vw)">{children}</PageShell>;
}
