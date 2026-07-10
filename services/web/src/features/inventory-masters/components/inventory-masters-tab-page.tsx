import { useEffect, useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  useInventoryCategories,
  useInventoryHsnGst,
  useInventoryItemTypes,
  useInventoryManufacturers,
  useInventoryStorageConditions,
  useInventoryStoreTypes,
  useInventoryUoms,
} from '@/features/inventory-masters/api/queries';
import {
  InventoryItemMasterTab,
  InventoryItemMasterTabShell,
} from '@/features/inventory-masters/components/inventory-item-master-tab';
import { InventoryMasterCrudDialogs } from '@/features/inventory-masters/components/inventory-master-crud-dialogs';
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
import { inventoryMasterApiBasePath } from '@/features/inventory-masters/lib/inventory-master-api-paths';
import type {
  InventoryCategory,
  InventoryHsnGst,
  InventoryItemType,
  InventoryManufacturer,
  InventoryMasterListParams,
  InventoryMasterStatus,
  InventoryMasterTabId,
  InventoryStorageCondition,
  InventoryStoreType,
  InventoryUom,
} from '@/features/inventory-masters/types';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';

interface InventoryMastersTabPageProps {
  tabId: InventoryMasterTabId;
}

type InventoryMasterCrudRow =
  | InventoryCategory
  | InventoryItemType
  | InventoryUom
  | InventoryStorageCondition
  | InventoryHsnGst
  | InventoryStoreType
  | InventoryManufacturer;

type DeleteTarget = { id: string; label: string };

export function InventoryMastersTabPage({ tabId }: InventoryMastersTabPageProps) {
  const tab = getInventoryMasterTabConfig(tabId);
  const crudEnabled = inventoryMasterApiBasePath(tabId) !== null;
  const { canUpdate, canDelete } = useCatalogModuleCrud(tab.catalogModuleSlug, {
    productModuleSlug: 'inventory-master',
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InventoryMasterListParams['status']>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [itemMasterCreateOpen, setItemMasterCreateOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryMasterCrudRow | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);

  const listParams = useMemo<InventoryMasterListParams>(
    () => ({ search: search || undefined, status }),
    [search, status],
  );

  const categoriesQuery = useInventoryCategories(listParams);
  const itemTypesQuery = useInventoryItemTypes(listParams);
  const uomsQuery = useInventoryUoms(listParams);
  const storageQuery = useInventoryStorageConditions(listParams);
  const hsnQuery = useInventoryHsnGst(listParams);
  const manufacturersQuery = useInventoryManufacturers(listParams);
  const storeTypesQuery = useInventoryStoreTypes(listParams);

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
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue<InventoryMasterStatus>()} />,
      },
      inventoryMasterActionsColumn<InventoryCategory>({
        canEdit: canUpdate,
        canDelete,
        onEdit: (row) => setEditing(row),
        onDelete: (row) => setDeleting({ id: row.id, label: row.category_name }),
      }),
    ],
    [canDelete, canUpdate],
  );

  const itemTypeColumns = useMemo<ColumnDef<InventoryItemType, unknown>[]>(
    () => [
      inventoryMasterIndexColumn<InventoryItemType>(),
      { accessorKey: 'item_type', header: 'Item Type', meta: { label: 'Item Type' } },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue<InventoryMasterStatus>()} />,
      },
      inventoryMasterActionsColumn<InventoryItemType>({
        canEdit: canUpdate,
        canDelete,
        onEdit: (row) => setEditing(row),
        onDelete: (row) => setDeleting({ id: row.id, label: row.item_type }),
      }),
    ],
    [canDelete, canUpdate],
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
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue<InventoryMasterStatus>()} />,
      },
      inventoryMasterActionsColumn<InventoryUom>({
        canEdit: canUpdate,
        canDelete,
        onEdit: (row) => setEditing(row),
        onDelete: (row) => setDeleting({ id: row.id, label: row.name }),
      }),
    ],
    [canDelete, canUpdate],
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
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue<InventoryMasterStatus>()} />,
      },
      inventoryMasterActionsColumn<InventoryStorageCondition>({
        canEdit: canUpdate,
        canDelete,
        onEdit: (row) => setEditing(row),
        onDelete: (row) => setDeleting({ id: row.id, label: row.storage_condition }),
      }),
    ],
    [canDelete, canUpdate],
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
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue<InventoryMasterStatus>()} />,
      },
      inventoryMasterActionsColumn<InventoryHsnGst>({
        canEdit: canUpdate,
        canDelete,
        onEdit: (row) => setEditing(row),
        onDelete: (row) => setDeleting({ id: row.id, label: row.hsn_code }),
      }),
    ],
    [canDelete, canUpdate],
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
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue<InventoryMasterStatus>()} />,
      },
      inventoryMasterActionsColumn<InventoryManufacturer>({
        canEdit: canUpdate,
        canDelete,
        onEdit: (row) => setEditing(row),
        onDelete: (row) => setDeleting({ id: row.id, label: row.manufacturer }),
      }),
    ],
    [canDelete, canUpdate],
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
        accessorKey: 'can_receive_stock',
        header: 'Receive Stock',
        meta: { label: 'Receive Stock' },
        cell: ({ getValue }) => <InventoryMasterYesBadge value={getValue<boolean>()} />,
      },
      {
        accessorKey: 'can_dispense',
        header: 'Dispense',
        meta: { label: 'Dispense' },
        cell: ({ getValue }) => <InventoryMasterYesBadge value={getValue<boolean>()} />,
      },
      {
        accessorKey: 'can_issue_to_ward',
        header: 'Ward Issue',
        meta: { label: 'Ward Issue' },
        cell: ({ getValue }) => <InventoryMasterYesBadge value={getValue<boolean>()} />,
      },
      {
        accessorKey: 'track_batch_expiry',
        header: 'Batch/Expiry',
        meta: { label: 'Batch/Expiry' },
        cell: ({ getValue }) => <InventoryMasterYesBadge value={getValue<boolean>()} />,
      },
      {
        accessorKey: 'indent_authority',
        header: 'Indent',
        meta: { label: 'Indent' },
        cell: ({ getValue }) => <InventoryMasterYesBadge value={getValue<boolean>()} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <InventoryMasterStatusBadge status={getValue<InventoryMasterStatus>()} />,
      },
      inventoryMasterActionsColumn<InventoryStoreType>({
        canEdit: canUpdate,
        canDelete,
        onEdit: (row) => setEditing(row),
        onDelete: (row) => setDeleting({ id: row.id, label: row.store_type }),
      }),
    ],
    [canDelete, canUpdate],
  );

  useEffect(() => {
    if (tabId !== 'item-master') {
      setItemMasterCreateOpen(false);
    }
  }, [tabId]);

  const handleAddClick = useMemo(() => {
    if (!crudEnabled) return undefined;
    if (tabId === 'item-master') return () => setItemMasterCreateOpen(true);
    return () => setCreateOpen(true);
  }, [crudEnabled, tabId]);

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
          onAddClick={handleAddClick}
        />
      }
    >
      {tabId === 'item-master' ? (
        <InventoryItemMasterTabShell>
          <InventoryItemMasterTab
            createOpen={itemMasterCreateOpen}
            onCreateOpenChange={setItemMasterCreateOpen}
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            classificationFilter={classificationFilter}
            onClassificationFilterChange={setClassificationFilter}
          />
        </InventoryItemMasterTabShell>
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

      <InventoryMasterCrudDialogs
        tabId={tabId}
        createOpen={tabId === 'item-master' ? false : createOpen}
        onCreateOpenChange={setCreateOpen}
        editing={editing}
        onEditingChange={setEditing}
        deleting={deleting}
        onDeletingChange={setDeleting}
        categories={categoriesQuery.data?.data ?? []}
      />
    </InventoryMastersPageShell>
  );
}
