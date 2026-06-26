import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@pulse/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import {
  useInventoryCategories,
  useInventoryHsnGst,
  useInventoryItems,
  useInventoryItemTypes,
  useInventoryManufacturers,
  useInventoryStorageConditions,
  useInventoryStoreTypes,
  useInventoryUoms,
} from '@/features/inventory-masters/api/queries';
import { InventoryMastersHeaderActions } from '@/features/inventory-masters/components/inventory-masters-header-actions';
import { InventoryMastersPageShell } from '@/features/inventory-masters/components/inventory-masters-page-shell';
import {
  InventoryMasterStatusBadge,
  InventoryMasterYesBadge,
} from '@/features/inventory-masters/components/inventory-master-status-badge';
import {
  inventoryMasterActionsColumn,
  inventoryMasterIndexColumn,
  InventoryMastersTableCard,
} from '@/features/inventory-masters/components/inventory-masters-table-card';
import { getInventoryMasterTabConfig } from '@/features/inventory-masters/inventory-masters-nav-model';
import type {
  InventoryCategory,
  InventoryHsnGst,
  InventoryItemMaster,
  InventoryItemType,
  InventoryManufacturer,
  InventoryMasterListParams,
  InventoryMasterTabId,
  InventoryStorageCondition,
  InventoryStoreType,
  InventoryUom,
} from '@/features/inventory-masters/types';

interface InventoryMastersTabPageProps {
  tabId: InventoryMasterTabId;
}

const CLASSIFICATION_LABELS: Record<InventoryItemMaster['classification'], string> = {
  inventory_item: 'Inventory Item',
  medicine: 'Medicine',
};

export function InventoryMastersTabPage({ tabId }: InventoryMastersTabPageProps) {
  const tab = getInventoryMasterTabConfig(tabId);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InventoryMasterListParams['status']>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [classificationFilter, setClassificationFilter] = useState('all');

  const listParams = useMemo<InventoryMasterListParams>(
    () => ({ search: search || undefined, status }),
    [search, status],
  );

  const itemsQuery = useInventoryItems(listParams);
  const categoriesQuery = useInventoryCategories(listParams);
  const itemTypesQuery = useInventoryItemTypes(listParams);
  const uomsQuery = useInventoryUoms(listParams);
  const storageQuery = useInventoryStorageConditions(listParams);
  const hsnQuery = useInventoryHsnGst(listParams);
  const manufacturersQuery = useInventoryManufacturers(listParams);
  const storeTypesQuery = useInventoryStoreTypes(listParams);

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
        cell: ({ getValue }) => {
          const value = getValue<InventoryItemMaster['classification']>();
          return (
            <Badge variant={value === 'medicine' ? 'default' : 'secondary'}>
              {CLASSIFICATION_LABELS[value]}
            </Badge>
          );
        },
      },
      { accessorKey: 'item_type', header: 'Item Type', meta: { label: 'Item Type' } },
      {
        accessorKey: 'product_category',
        header: 'Product Category',
        meta: { label: 'Product Category' },
      },
      { accessorKey: 'department', header: 'Department', meta: { label: 'Department' } },
      { accessorKey: 'manufacturer', header: 'Manufacturer', meta: { label: 'Manufacturer' } },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue()} />,
      },
      inventoryMasterActionsColumn<InventoryItemMaster>(),
    ],
    [],
  );

  const categoryColumns = useMemo<ColumnDef<InventoryCategory, unknown>[]>(
    () => [
      inventoryMasterIndexColumn<InventoryCategory>(),
      { accessorKey: 'category_name', header: 'Category Name', meta: { label: 'Category Name' } },
      {
        accessorKey: 'parent_category',
        header: 'Parent Category',
        meta: { label: 'Parent Category' },
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue()} />,
      },
      inventoryMasterActionsColumn<InventoryCategory>(),
    ],
    [],
  );

  const itemTypeColumns = useMemo<ColumnDef<InventoryItemType, unknown>[]>(
    () => [
      inventoryMasterIndexColumn<InventoryItemType>(),
      { accessorKey: 'item_type', header: 'Item Type', meta: { label: 'Item Type' } },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue()} />,
      },
      inventoryMasterActionsColumn<InventoryItemType>(),
    ],
    [],
  );

  const uomColumns = useMemo<ColumnDef<InventoryUom, unknown>[]>(
    () => [
      inventoryMasterIndexColumn<InventoryUom>(),
      { accessorKey: 'name', header: 'Name', meta: { label: 'Name' } },
      { accessorKey: 'abbreviation', header: 'Abbreviation', meta: { label: 'Abbreviation' } },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue()} />,
      },
      inventoryMasterActionsColumn<InventoryUom>(),
    ],
    [],
  );

  const storageColumns = useMemo<ColumnDef<InventoryStorageCondition, unknown>[]>(
    () => [
      inventoryMasterIndexColumn<InventoryStorageCondition>(),
      {
        accessorKey: 'storage_condition',
        header: 'Storage condition',
        meta: { label: 'Storage condition' },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        meta: { label: 'Description' },
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue()} />,
      },
      inventoryMasterActionsColumn<InventoryStorageCondition>(),
    ],
    [],
  );

  const hsnColumns = useMemo<ColumnDef<InventoryHsnGst, unknown>[]>(
    () => [
      inventoryMasterIndexColumn<InventoryHsnGst>(),
      { accessorKey: 'hsn_code', header: 'HSN Code', meta: { label: 'HSN Code' } },
      {
        accessorKey: 'cgst_percent',
        header: 'CGST %',
        meta: { label: 'CGST %' },
        cell: ({ getValue }) => `${getValue<number>()}%`,
      },
      {
        accessorKey: 'sgst_percent',
        header: 'SGST %',
        meta: { label: 'SGST %' },
        cell: ({ getValue }) => `${getValue<number>()}%`,
      },
      {
        accessorKey: 'igst_percent',
        header: 'IGST %',
        meta: { label: 'IGST %' },
        cell: ({ getValue }) => `${getValue<number>()}%`,
      },
      {
        accessorKey: 'activation_date',
        header: 'Activation Date',
        meta: { label: 'Activation Date' },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue()} />,
      },
      inventoryMasterActionsColumn<InventoryHsnGst>(),
    ],
    [],
  );

  const manufacturerColumns = useMemo<ColumnDef<InventoryManufacturer, unknown>[]>(
    () => [
      inventoryMasterIndexColumn<InventoryManufacturer>(),
      {
        accessorKey: 'manufacturer',
        header: 'Manufacturer',
        meta: { label: 'Manufacturer' },
      },
      {
        accessorKey: 'code',
        header: 'Code',
        meta: { label: 'Code' },
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue()} />,
      },
      inventoryMasterActionsColumn<InventoryManufacturer>(),
    ],
    [],
  );

  const storeTypeColumns = useMemo<ColumnDef<InventoryStoreType, unknown>[]>(
    () => [
      inventoryMasterIndexColumn<InventoryStoreType>(),
      { accessorKey: 'code', header: 'Code', meta: { label: 'Code' } },
      { accessorKey: 'store_type', header: 'Store Type', meta: { label: 'Store Type' } },
      {
        accessorKey: 'description',
        header: 'Description',
        meta: { label: 'Description' },
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'receive_stock',
        header: 'Receive Stock',
        meta: { label: 'Receive Stock' },
        cell: ({ getValue }) => <InventoryMasterYesBadge value={getValue<boolean>()} />,
      },
      {
        accessorKey: 'dispense',
        header: 'Dispense',
        meta: { label: 'Dispense' },
        cell: ({ getValue }) => <InventoryMasterYesBadge value={getValue<boolean>()} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue()} />,
      },
      inventoryMasterActionsColumn<InventoryStoreType>(),
    ],
    [],
  );

  const itemRows = useMemo(() => {
    let rows = itemsQuery.data?.data ?? [];
    if (categoryFilter !== 'all') {
      rows = rows.filter((row) => row.product_category.includes(categoryFilter));
    }
    if (classificationFilter !== 'all') {
      rows = rows.filter((row) => row.classification === classificationFilter);
    }
    return rows;
  }, [categoryFilter, classificationFilter, itemsQuery.data?.data]);

  const itemCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of itemsQuery.data?.data ?? []) {
      const root = row.product_category.split('>')[0]?.trim();
      if (root) set.add(root);
    }
    return [...set].sort();
  }, [itemsQuery.data?.data]);

  const tableProps = {
    search,
    onSearchChange: setSearch,
    searchPlaceholder: tab.searchPlaceholder,
    status,
    onStatusChange: setStatus,
  };

  return (
    <InventoryMastersPageShell
      tabId={tabId}
      actions={
        <InventoryMastersHeaderActions
          catalogModuleSlug={tab.catalogModuleSlug}
          addLabel={tab.addLabel}
        />
      }
    >
      {tabId === 'item-master' ? (
        <InventoryMastersTableCard
          {...tableProps}
          extraFilters={
            <>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
              <Select value={classificationFilter} onValueChange={setClassificationFilter}>
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
      ) : null}

      {tabId === 'categories' ? (
        <InventoryMastersTableCard
          {...tableProps}
          columns={categoryColumns}
          data={categoriesQuery.data?.data ?? []}
          isLoading={categoriesQuery.isLoading}
          emptyTitle="No categories found"
          emptyDescription="Add a product category to get started."
        />
      ) : null}

      {tabId === 'item-types' ? (
        <InventoryMastersTableCard
          {...tableProps}
          columns={itemTypeColumns}
          data={itemTypesQuery.data?.data ?? []}
          isLoading={itemTypesQuery.isLoading}
          emptyTitle="No item types found"
          emptyDescription="Add an item type to get started."
        />
      ) : null}

      {tabId === 'uom' ? (
        <InventoryMastersTableCard
          {...tableProps}
          columns={uomColumns}
          data={uomsQuery.data?.data ?? []}
          isLoading={uomsQuery.isLoading}
          emptyTitle="No units found"
          emptyDescription="Add a unit of measure to get started."
        />
      ) : null}

      {tabId === 'storage-conditions' ? (
        <InventoryMastersTableCard
          {...tableProps}
          columns={storageColumns}
          data={storageQuery.data?.data ?? []}
          isLoading={storageQuery.isLoading}
          emptyTitle="No storage conditions found"
          emptyDescription="Add a storage condition to get started."
        />
      ) : null}

      {tabId === 'hsn-gst' ? (
        <InventoryMastersTableCard
          {...tableProps}
          columns={hsnColumns}
          data={hsnQuery.data?.data ?? []}
          isLoading={hsnQuery.isLoading}
          emptyTitle="No HSN codes found"
          emptyDescription="Add an HSN & GST entry to get started."
        />
      ) : null}

      {tabId === 'manufacturers' ? (
        <InventoryMastersTableCard
          {...tableProps}
          columns={manufacturerColumns}
          data={manufacturersQuery.data?.data ?? []}
          isLoading={manufacturersQuery.isLoading}
          emptyTitle="No manufacturers found"
          emptyDescription="Add a manufacturer to get started."
        />
      ) : null}

      {tabId === 'store-types' ? (
        <InventoryMastersTableCard
          {...tableProps}
          columns={storeTypeColumns}
          data={storeTypesQuery.data?.data ?? []}
          isLoading={storeTypesQuery.isLoading}
          emptyTitle="No store types found"
          emptyDescription="Add a store type to get started."
        />
      ) : null}
    </InventoryMastersPageShell>
  );
}
