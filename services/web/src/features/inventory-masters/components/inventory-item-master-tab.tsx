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

/** Dropdown masters for the create form — not tied to table search/filters. */
const ITEM_MASTER_FORM_LOOKUP_PARAMS: InventoryMasterListParams = { status: 'active' };

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
  const create = useInventoryItemCreate();

  const listParams = useMemo<InventoryMasterListParams>(
    () => ({ search: search || undefined, status }),
    [search, status],
  );

  const catalogTenantId = useInventoryMastersTenantId();

  const categoriesQuery = useInventoryCategories(ITEM_MASTER_FORM_LOOKUP_PARAMS);
  const itemTypesQuery = useInventoryItemTypes(ITEM_MASTER_FORM_LOOKUP_PARAMS);
  const uomsQuery = useInventoryUoms(ITEM_MASTER_FORM_LOOKUP_PARAMS);
  const storageQuery = useInventoryStorageConditions(ITEM_MASTER_FORM_LOOKUP_PARAMS);
  const hsnQuery = useInventoryHsnGst(ITEM_MASTER_FORM_LOOKUP_PARAMS);
  const manufacturersQuery = useInventoryManufacturers(ITEM_MASTER_FORM_LOOKUP_PARAMS);
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

  const itemRows = useMemo(() => {
    let rows = itemsQuery.data?.data ?? [];
    if (categoryFilter !== 'all') {
      rows = rows.filter((row) => row.product_category === categoryFilter);
    }
    if (classificationFilter !== 'all') {
      rows = rows.filter((row) => row.classification === classificationFilter);
    }
    return rows;
  }, [categoryFilter, classificationFilter, itemsQuery.data?.data]);

  const itemCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of itemsQuery.data?.data ?? []) {
      if (row.product_category && row.product_category !== '—') {
        set.add(row.product_category);
      }
    }
    return [...set].sort();
  }, [itemsQuery.data?.data]);

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

    sidePanel.open(
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
      />,
      closePanel,
      {
        showShellCloseButton: false,
        sidePanelWidth: 'min(560px, 45vw)',
        contentFingerprint: 'create',
      },
    );
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
              {itemCategoryOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
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
    />
  );
}

export function InventoryItemMasterTabShell({ children }: { children: ReactNode }) {
  return <PageShell sidePanelWidth="min(560px, 45vw)">{children}</PageShell>;
}
