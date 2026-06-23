import { createFileRoute } from '@tanstack/react-router';
import { type Dispatch, type SetStateAction, useCallback, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormReturn, useForm } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { DataTable } from '@/components/data-table';
import {
  useCreateTariffService,
  useTariffServices,
  useUpdateTariffService,
} from '@/features/billing/api';
import { useDepartments } from '@/features/master-data/api';
import { useProviderList } from '@/features/user-management/api/queries';
import { BillingPageShell } from '@/features/billing/components/billing-page-shell';
import {
  TariffServiceCreateFormFields,
  TariffServiceEditFormFields,
} from '@/features/billing/components/tariff-service-form-fields';
import { useCatalogModuleCrud } from '@/hooks/use-catalog-module-crud';
import { formatDateTime, formatMoneyDisplay } from '@/features/billing/lib/format';
import {
  formToCreatePayload,
  formToUpdatePayload,
  serviceToEditFormValues,
} from '@/features/billing/lib/form-mappers';
import type { TariffService } from '@/features/billing/types';
import {
  EMPTY_TARIFF_CREATE_VALUES,
  EMPTY_TARIFF_EDIT_VALUES,
  tariffServiceCreateSchema,
  tariffServiceEditSchema,
  type TariffServiceCreateFormValues,
  type TariffServiceEditFormValues,
} from '@/features/billing/validation';
import { EntityFormDialog } from '@/components/entity-table/entity-form-dialog';
import { EntityRowActions } from '@/components/entity-table/entity-row-actions';
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import { TableActiveToggle } from '@/components/entity-table/table-active-toggle';
import { ApiError } from '@/lib/api-client';
import { mutationErrorMessage } from '@/lib/mutation-error';

const EMPTY_SERVICES: TariffService[] = [];

type TariffColumnDeps = {
  departmentNameById: Map<string, string>;
  providerNameById: Map<string, string>;
  isUpdatePending: boolean;
  canUpdate: boolean;
  handleActiveChange: (service: TariffService, next: boolean) => Promise<void>;
  editForm: UseFormReturn<TariffServiceEditFormValues>;
  setEditing: Dispatch<SetStateAction<TariffService | null>>;
  setViewing: Dispatch<SetStateAction<TariffService | null>>;
};

function buildTariffColumns({
  departmentNameById,
  providerNameById,
  isUpdatePending,
  canUpdate,
  handleActiveChange,
  editForm,
  setEditing,
  setViewing,
}: TariffColumnDeps): ColumnDef<TariffService, unknown>[] {
  return [
    {
      accessorKey: 'service_code',
      header: 'Code',
      cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
    },
    { accessorKey: 'service_name', header: 'Name' },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => {
        const id = row.original.department_id;
        if (!id) return '—';
        return departmentNameById.get(id) ?? '—';
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? <Badge variant="secondary">{v}</Badge> : '—';
      },
    },
    {
      id: 'doctor',
      header: 'Doctor',
      cell: ({ row }) => {
        const providerId = row.original.provider_id;
        if (!providerId) return '—';
        return providerNameById.get(providerId) ?? '—';
      },
    },
    {
      accessorKey: 'base_price',
      header: 'Price',
      cell: ({ getValue }) => formatMoneyDisplay(getValue<string>()),
    },
    {
      accessorKey: 'tax_type',
      header: 'Tax type',
      cell: ({ getValue }) => getValue<string | null>() ?? '—',
    },
    {
      accessorKey: 'effective_from',
      header: 'Effective from',
      cell: ({ getValue }) => formatDateTime(getValue<string>()),
    },
    {
      id: 'is_active',
      header: 'Active',
      cell: ({ row }) => (
        <TableActiveToggle
          active={row.original.is_active}
          disabled={isUpdatePending || !canUpdate}
          onCheckedChange={(next) => void handleActiveChange(row.original, next)}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <EntityRowActions
          onView={() => setViewing(row.original)}
          onEdit={() => {
            setEditing(row.original);
            editForm.reset(serviceToEditFormValues(row.original));
          }}
          onDelete={() => {}}
          canEdit={canUpdate}
          canDelete={false}
        />
      ),
    },
  ];
}

type TariffServiceViewDialogProps = {
  viewing: TariffService | null;
  departmentNameById: Map<string, string>;
  onOpenChange: (open: boolean) => void;
};

function TariffServiceViewDialog({
  viewing,
  departmentNameById,
  onOpenChange,
}: TariffServiceViewDialogProps) {
  return (
    <Dialog open={viewing !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{viewing?.service_name}</DialogTitle>
          <DialogDescription>{viewing?.service_code}</DialogDescription>
        </DialogHeader>
        {viewing && (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Price</dt>
            <dd>{formatMoneyDisplay(viewing.base_price)}</dd>
            <dt className="text-muted-foreground">Tax</dt>
            <dd>
              {formatMoneyDisplay(viewing.tax_percentage)}% · {viewing.tax_type ?? '—'}
            </dd>
            <dt className="text-muted-foreground">Tariff type</dt>
            <dd>{viewing.category ?? '—'}</dd>
            <dt className="text-muted-foreground">Department</dt>
            <dd>
              {viewing.department_id
                ? (departmentNameById.get(viewing.department_id) ?? '—')
                : '—'}
            </dd>
            <dt className="text-muted-foreground">Effective</dt>
            <dd>
              {formatDateTime(viewing.effective_from)}
              {viewing.effective_to ? ` → ${formatDateTime(viewing.effective_to)}` : ''}
            </dd>
            <dt className="text-muted-foreground">Provider</dt>
            <dd className="col-span-1 font-mono text-xs">{viewing.provider_id ?? 'Rack rate'}</dd>
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}

type TariffCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createForm: UseFormReturn<TariffServiceCreateFormValues>;
  createMutation: ReturnType<typeof useCreateTariffService>;
};

function TariffCreateDialog({
  open,
  onOpenChange,
  createForm,
  createMutation,
}: TariffCreateDialogProps) {
  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add tariff"
      description="Registration fees use frontdesk rack rates. OPD tariffs require a department and doctor."
      submitLabel="Create"
      isSubmitting={createMutation.isPending}
      onSubmit={createForm.handleSubmit((values) => {
        createMutation.mutate(formToCreatePayload(values), {
          onSuccess: () => {
            toast.success('Tariff created');
            onOpenChange(false);
            createForm.reset(EMPTY_TARIFF_CREATE_VALUES);
          },
          onError: (err) => toast.error(mutationErrorMessage(err)),
        });
      })}
    >
      <TariffServiceCreateFormFields
        control={createForm.control}
        setValue={createForm.setValue}
        lookupsEnabled={open}
      />
    </EntityFormDialog>
  );
}

type TariffEditDialogProps = {
  editing: TariffService | null;
  onClose: () => void;
  editForm: UseFormReturn<TariffServiceEditFormValues>;
  updateMutation: ReturnType<typeof useUpdateTariffService>;
};

function TariffEditDialog({
  editing,
  onClose,
  editForm,
  updateMutation,
}: TariffEditDialogProps) {
  return (
    <EntityFormDialog
      open={editing !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Edit service"
      description={`Update ${editing?.service_code ?? 'service'}. Code and provider cannot change.`}
      submitLabel="Save"
      isSubmitting={updateMutation.isPending}
      onSubmit={editForm.handleSubmit((values) => {
        if (!editing) return;
        updateMutation.mutate(
          { id: editing.id, input: formToUpdatePayload(values, editing) },
          {
            onSuccess: () => {
              toast.success('Service updated');
              onClose();
            },
            onError: (err) => toast.error(mutationErrorMessage(err)),
          },
        );
      })}
    >
      {editing ? (
        <TariffServiceEditFormFields
          control={editForm.control}
          service={editing}
          lookupsEnabled={editing !== null}
        />
      ) : null}
    </EntityFormDialog>
  );
}

type ActiveFilter = 'all' | 'active' | 'inactive';

type TariffFiltersProps = {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
  categories: string[];
  activeFilter: ActiveFilter;
  setActiveFilter: Dispatch<SetStateAction<ActiveFilter>>;
  isFetching: boolean;
  refetch: () => void;
};

function TariffFilters({
  search,
  setSearch,
  category,
  setCategory,
  categories,
  activeFilter,
  setActiveFilter,
  isFetching,
  refetch,
}: TariffFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <EntityTableToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search code or name…"
        debounceMs={0}
      />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={activeFilter}
        onValueChange={(v) => setActiveFilter(v as ActiveFilter)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        disabled={isFetching}
        onClick={() => void refetch()}
      >
        Refresh
      </Button>
    </div>
  );
}

type TariffResultsProps = {
  error: Error | null;
  columns: ColumnDef<TariffService, unknown>[];
  services: TariffService[];
  isLoading: boolean;
  canCreate: boolean;
};

function TariffResults({ error, columns, services, isLoading, canCreate }: TariffResultsProps) {
  if (error) {
    return error instanceof ApiError && error.status === 403 ? null : (
      <p className="text-sm text-destructive">{mutationErrorMessage(error)}</p>
    );
  }
  return (
    <DataTable
      columns={columns}
      data={services}
      isLoading={isLoading}
      emptyTitle="No tariff services yet"
      emptyDescription={
        canCreate
          ? 'Add service to create your first chargeable tariff row.'
          : 'No services match your filters.'
      }
    />
  );
}

export const Route = createFileRoute('/_authenticated/billing-and-finance/tariff-master')({
  component: BillingServicesPage,
});

function BillingServicesPage() {
  const { canCreate, canRead, canUpdate } = useCatalogModuleCrud('tariff-master', {
    productModuleSlug: 'billing-and-finance',
  });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TariffService | null>(null);
  const [viewing, setViewing] = useState<TariffService | null>(null);
  const listParams = useMemo(
    () => ({
      q: search || undefined,
      category: category === 'all' ? undefined : category,
      is_active:
        activeFilter === 'all' ? undefined : activeFilter === 'active',
    }),
    [search, category, activeFilter],
  );

  const { data, isLoading, isFetching, error, refetch } = useTariffServices(listParams, { enabled: canRead });
  const services = data?.data ?? EMPTY_SERVICES;
  const providersQuery = useProviderList(null, { enabled: canRead });
  const providerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const provider of providersQuery.data ?? []) {
      map.set(provider.id, provider.full_name);
    }
    return map;
  }, [providersQuery.data]);

  const departmentsQuery = useDepartments(undefined, { enabled: canRead, formCatalog: true });
  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const dept of departmentsQuery.data?.data ?? []) {
      map.set(dept.id, dept.name);
    }
    return map;
  }, [departmentsQuery.data]);

  const createMutation = useCreateTariffService();
  const updateMutation = useUpdateTariffService();

  const createForm = useForm<TariffServiceCreateFormValues>({
    resolver: zodResolver(tariffServiceCreateSchema),
    defaultValues: EMPTY_TARIFF_CREATE_VALUES,
  });

  const editForm = useForm<TariffServiceEditFormValues>({
    resolver: zodResolver(tariffServiceEditSchema),
    defaultValues: EMPTY_TARIFF_EDIT_VALUES,
  });

  const handleActiveChange = useCallback(
    async (service: TariffService, next: boolean) => {
      if (!canUpdate || next === service.is_active) return;
      try {
        await updateMutation.mutateAsync({ id: service.id, input: { is_active: next } });
        toast.success(next ? 'Service activated' : 'Service deactivated');
      } catch (err) {
        toast.error(mutationErrorMessage(err));
      }
    },
    [canUpdate, updateMutation],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of services) {
      if (s.category) set.add(s.category);
    }
    return [...set].sort();
  }, [services]);

  const columns = useMemo<ColumnDef<TariffService, unknown>[]>(
    () =>
      buildTariffColumns({
        departmentNameById,
        providerNameById,
        isUpdatePending: updateMutation.isPending,
        canUpdate,
        handleActiveChange,
        editForm,
        setEditing,
        setViewing,
      }),
    [canUpdate, departmentNameById, editForm, handleActiveChange, providerNameById, updateMutation.isPending],
  );

  return (
    <BillingPageShell
      title="Tariff catalog"
      description="Tenant chargeable services (tariff master). Price changes apply from the effective date; historical bills keep snapshotted prices."
      actions={
        canCreate ? (
          <Button
            onClick={() => {
              createForm.reset(EMPTY_TARIFF_CREATE_VALUES);
              setIsCreateOpen(true);
            }}
          >
            <Plus className="size-4 mr-1" />
            Add service
          </Button>
        ) : undefined
      }
    >
      {canRead ? (
      <>
      <TariffFilters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        categories={categories}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        isFetching={isFetching}
        refetch={refetch}
      />

      <TariffResults
        error={error}
        columns={columns}
        services={services}
        isLoading={isLoading}
        canCreate={canCreate}
      />

      {canCreate ? (
        <TariffCreateDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          createForm={createForm}
          createMutation={createMutation}
        />
      ) : null}

      {canUpdate ? (
        <TariffEditDialog
          editing={editing}
          onClose={() => setEditing(null)}
          editForm={editForm}
          updateMutation={updateMutation}
        />
      ) : null}

      <TariffServiceViewDialog
        viewing={viewing}
        departmentNameById={departmentNameById}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      />
      </>
      ) : null}
    </BillingPageShell>
  );
}
