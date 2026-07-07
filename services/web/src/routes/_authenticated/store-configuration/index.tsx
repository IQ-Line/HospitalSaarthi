import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pulse/ui/breadcrumb';
import { Button } from '@pulse/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import {
  DEPARTMENT_CATALOG_FORM_PAGE,
  useDepartments,
} from '@/features/master-data/api';
import { EntityRowActions } from '@/features/master-data/components/entity-row-actions';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { useInventoryStoreTypes } from '@/features/inventory-masters/api/queries';
import { InventoryMasterStatusBadge } from '@/features/inventory-masters/components/inventory-master-status-badge';
import {
  STORE_LIST_DEFAULT_PAGE_SIZE,
  STORE_LIST_PAGE_SIZES,
  useCreateStore,
  useStores,
  useUpdateStore,
} from '@/features/store-configuration/api/stores';
import { StoreFormDialog } from '@/features/store-configuration/components/store-form-dialog';
import type { InventoryStoreRecord } from '@/features/store-configuration/types';
import {
  EMPTY_STORE_FORM_VALUES,
  storeFormSchema,
  type StoreFormInput,
} from '@/features/store-configuration/validation';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { requireStoreConfigurationAccess } from '@/lib/store-configuration-route-access';
import { useTenantStore } from '@/stores/tenant.store';

export const Route = createFileRoute('/_authenticated/store-configuration/')({
  beforeLoad: requireStoreConfigurationAccess(),
  component: StoreConfigurationPage,
});

function StoreConfigurationPage() {
  const { canCreate, canUpdate } = useCatalogModuleCrud('store-config');
  const organizationId = useTenantStore((s) => s.organizationId);
  const organizationName = useTenantStore((s) => s.organizationName);
  const tenantName = useTenantStore((s) => s.tenantName);

  const facilityLabel = organizationName ?? tenantName ?? '—';
  const facilityId = organizationId ?? '';

  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(STORE_LIST_DEFAULT_PAGE_SIZE);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<InventoryStoreRecord | null>(null);

  const listParams = useMemo(
    () => ({
      search: tableSearch || undefined,
      status: statusFilter,
      pageIndex,
      pageSize,
    }),
    [tableSearch, statusFilter, pageIndex, pageSize],
  );

  useEffect(() => {
    setPageIndex(0);
  }, [tableSearch, statusFilter]);

  const { data, isLoading, error } = useStores(listParams);
  const indentTargetStoresQuery = useStores({ status: 'active', pageSize: 200 });
  const storeTypesQuery = useInventoryStoreTypes({ pageSize: 200, status: 'active' });
  const departmentsQuery = useDepartments(undefined, {
    formCatalog: true,
    page: DEPARTMENT_CATALOG_FORM_PAGE,
  });

  const createMutation = useCreateStore();
  const updateMutation = useUpdateStore();

  const storeTypes = storeTypesQuery.data?.data ?? [];
  const departments = departmentsQuery.data?.data ?? [];
  const stores = data?.data ?? [];
  const indentTargetStores = indentTargetStoresQuery.data?.data ?? [];
  const existingCentralStore = useMemo(
    () => indentTargetStores.find((store) => store.is_central_store) ?? null,
    [indentTargetStores],
  );
  const total = data?.total ?? 0;

  const storeTypeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of storeTypes) {
      map.set(row.id, row.store_type);
    }
    return map;
  }, [storeTypes]);

  const createForm = useForm<StoreFormInput>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: EMPTY_STORE_FORM_VALUES,
  });

  const editForm = useForm<StoreFormInput>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: EMPTY_STORE_FORM_VALUES,
  });

  const resetCreateForm = useCallback(() => {
    createForm.reset(EMPTY_STORE_FORM_VALUES);
  }, [createForm]);

  useEffect(() => {
    if (!editingStore) return;
    editForm.reset({
      store_name: editingStore.store_name,
      store_type_id: editingStore.store_type_id,
      department_id: editingStore.department_id ?? '',
      physical_location: editingStore.physical_location,
      is_active: editingStore.is_active,
      can_receive_stock: editingStore.can_receive_stock,
      can_dispense: editingStore.can_dispense,
      can_issue_to_ward: editingStore.can_issue_to_ward,
      track_batch_expiry: editingStore.track_batch_expiry,
      indent_authority: editingStore.indent_authority,
      indent_target_store_id: editingStore.indent_target_store_id ?? '',
      is_central_store: editingStore.is_central_store,
    });
  }, [editingStore, editForm]);

  const submitCreate = createForm.handleSubmit(async (values) => {
    if (!facilityId) {
      toast.error('Facility is not configured for this tenant.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        store_name: values.store_name,
        store_type_id: values.store_type_id,
        facility_id: facilityId,
        department_id: values.department_id,
        physical_location: values.physical_location,
        is_active: values.is_active,
        can_receive_stock: values.can_receive_stock,
        can_dispense: values.can_dispense,
        can_issue_to_ward: values.can_issue_to_ward,
        track_batch_expiry: values.track_batch_expiry,
        indent_authority: values.indent_authority,
        indent_target_store_id: values.indent_authority
          ? (values.indent_target_store_id?.trim() || null)
          : null,
        is_central_store: values.is_central_store,
      });
      toast.success('Store created');
      setIsCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  const submitEdit = editForm.handleSubmit(async (values) => {
    if (!editingStore) return;
    if (!facilityId) {
      toast.error('Facility is not configured for this tenant.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editingStore.id,
        input: {
          store_name: values.store_name,
          store_type_id: values.store_type_id,
          facility_id: facilityId,
          department_id: values.department_id,
          physical_location: values.physical_location,
          is_active: values.is_active,
          can_receive_stock: values.can_receive_stock,
          can_dispense: values.can_dispense,
          can_issue_to_ward: values.can_issue_to_ward,
          track_batch_expiry: values.track_batch_expiry,
          indent_authority: values.indent_authority,
          indent_target_store_id: values.indent_authority
            ? (values.indent_target_store_id?.trim() || null)
            : null,
          is_central_store: values.is_central_store,
        },
      });
      toast.success('Store updated');
      setEditingStore(null);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  const columns = useMemo<ColumnDef<InventoryStoreRecord, unknown>[]>(
    () => [
      {
        id: 'index',
        header: '#',
        meta: { label: '#' },
        cell: ({ row }) => pageIndex * pageSize + row.index + 1,
      },
      {
        accessorKey: 'store_code',
        header: 'Store code',
        meta: { label: 'Store code' },
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      { accessorKey: 'store_name', header: 'Store name', meta: { label: 'Store name' } },
      {
        id: 'store_type',
        header: 'Store type',
        meta: { label: 'Store type' },
        cell: ({ row }) => storeTypeNameById.get(row.original.store_type_id) ?? '—',
      },
      {
        id: 'central_store',
        header: 'Procurement',
        meta: { label: 'Procurement' },
        cell: ({ row }) => (row.original.is_central_store ? 'Central store' : '—'),
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => (
          <InventoryMasterStatusBadge status={getValue<boolean>() ? 'active' : 'inactive'} />
        ),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        cell: ({ row }) =>
          canUpdate ? (
            <EntityRowActions
              onView={() => setEditingStore(row.original)}
              onEdit={() => setEditingStore(row.original)}
            />
          ) : null,
      },
    ],
    [canUpdate, pageIndex, pageSize, storeTypeNameById],
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Admin</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Data Masters</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Stores</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader title="Store master" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <EntityTableToolbar
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search stores"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canCreate ? (
          <Button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
          >
            + Create store
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load stores'}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        data={stores}
        isLoading={isLoading}
        showColumnMenu
        manualPagination={{
          pageIndex,
          pageSize,
          total,
          pageSizeOptions: STORE_LIST_PAGE_SIZES,
          onPageChange: setPageIndex,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPageIndex(0);
          },
        }}
      />

      <StoreFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetCreateForm();
        }}
        title="Create store"
        description="Configure an operational store for inventory workflows."
        submitLabel="Save"
        isSubmitting={createMutation.isPending}
        facilityLabel={facilityLabel}
        storeTypes={storeTypes}
        indentTargetStores={indentTargetStores}
        existingCentralStore={existingCentralStore}
        departments={departments}
        form={createForm}
        onSubmit={submitCreate}
      />

      <StoreFormDialog
        open={Boolean(editingStore)}
        onOpenChange={(open) => {
          if (!open) setEditingStore(null);
        }}
        title="Edit store"
        description={
          editingStore
            ? `Store code ${editingStore.store_code} is assigned permanently.`
            : ''
        }
        submitLabel="Save"
        isSubmitting={updateMutation.isPending}
        facilityLabel={facilityLabel}
        storeTypes={storeTypes}
        indentTargetStores={indentTargetStores}
        editingStoreId={editingStore?.id}
        existingCentralStore={existingCentralStore}
        departments={departments}
        form={editForm}
        onSubmit={submitEdit}
      />
    </div>
  );
}
