import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import {
  useCreateTariffService,
  useTariffServices,
  useUpdateTariffService,
} from '@/features/billing/api';
import { BillingMockNotice } from '@/features/billing/components/billing-mock-notice';
import { BillingPageShell } from '@/features/billing/components/billing-page-shell';
import { TariffServiceFormFields } from '@/features/billing/components/tariff-service-form-fields';
import { formatDateTime, formatMoneyDisplay } from '@/features/billing/lib/format';
import { formToCreatePayload, formToUpdatePayload, serviceToFormValues } from '@/features/billing/lib/form-mappers';
import type { TariffService } from '@/features/billing/types';
import {
  EMPTY_TARIFF_CREATE_VALUES,
  tariffServiceCreateSchema,
  tariffServiceEditSchema,
  type TariffServiceCreateFormValues,
} from '@/features/billing/validation';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { EntityRowActions } from '@/features/master-data/components/entity-row-actions';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { TableActiveToggle } from '@/features/master-data/components/table-active-toggle';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';

export const Route = createFileRoute('/_authenticated/billing/services')({
  component: BillingServicesPage,
});

function BillingServicesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TariffService | null>(null);
  const [viewing, setViewing] = useState<TariffService | null>(null);
  const [deactivating, setDeactivating] = useState<TariffService | null>(null);

  const listParams = {
    q: search || undefined,
    category: category === 'all' ? undefined : category,
    is_active:
      activeFilter === 'all' ? undefined : activeFilter === 'active',
  };

  const { data, isLoading, error, refetch } = useTariffServices(listParams);
  const services = data?.data ?? [];

  const createMutation = useCreateTariffService();
  const updateMutation = useUpdateTariffService();

  const createForm = useForm<TariffServiceCreateFormValues>({
    resolver: zodResolver(tariffServiceCreateSchema),
    defaultValues: EMPTY_TARIFF_CREATE_VALUES,
  });

  const editForm = useForm<TariffServiceCreateFormValues>({
    resolver: zodResolver(tariffServiceEditSchema),
    defaultValues: EMPTY_TARIFF_CREATE_VALUES,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of services) {
      if (s.category) set.add(s.category);
    }
    return [...set].sort();
  }, [services]);

  const columns = useMemo<ColumnDef<TariffService, unknown>[]>(
    () => [
      {
        accessorKey: 'service_code',
        header: 'Code',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      { accessorKey: 'service_name', header: 'Name' },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          return v ? <Badge variant="secondary">{v}</Badge> : '—';
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
            disabled={updateMutation.isPending}
            onCheckedChange={(next) => {
              if (next === row.original.is_active) return;
              updateMutation.mutate(
                { id: row.original.id, input: { is_active: next } },
                {
                  onSuccess: () => toast.success(next ? 'Service activated' : 'Service deactivated'),
                  onError: (err) => toast.error(mutationErrorMessage(err)),
                },
              );
            }}
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
              editForm.reset(serviceToFormValues(row.original));
            }}
            onDelete={() => setDeactivating(row.original)}
          />
        ),
      },
    ],
    [editForm, updateMutation],
  );

  return (
    <BillingPageShell
      title="Tariff catalog"
      description="Tenant chargeable services (tariff master). Price changes apply from the effective date; historical bills keep snapshotted prices."
      actions={
        <Button
          onClick={() => {
            createForm.reset(EMPTY_TARIFF_CREATE_VALUES);
            setIsCreateOpen(true);
          }}
        >
          <Plus className="size-4 mr-1" />
          Add service
        </Button>
      }
    >
      <BillingMockNotice />

      <div className="flex flex-wrap items-center gap-3">
        <MasterDataTableToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search code or name…"
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
          onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}
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
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{mutationErrorMessage(error)}</p>
      ) : (
        <DataTable columns={columns} data={services} isLoading={isLoading} />
      )}

      <EntityFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Add service"
        description="Create a new tariff row. Rack-rate rows leave provider empty."
        submitLabel="Create"
        isSubmitting={createMutation.isPending}
        onSubmit={createForm.handleSubmit((values) => {
          createMutation.mutate(formToCreatePayload(values), {
            onSuccess: () => {
              toast.success('Service created');
              setIsCreateOpen(false);
              createForm.reset(EMPTY_TARIFF_CREATE_VALUES);
            },
            onError: (err) => toast.error(mutationErrorMessage(err)),
          });
        })}
      >
        <TariffServiceFormFields control={createForm.control} mode="create" />
      </EntityFormDialog>

      <EntityFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit service"
        description={`Update ${editing?.service_code ?? 'service'}. Code and provider cannot change.`}
        submitLabel="Save"
        isSubmitting={updateMutation.isPending}
        onSubmit={editForm.handleSubmit((values) => {
          if (!editing) return;
          updateMutation.mutate(
            { id: editing.id, input: formToUpdatePayload(values) },
            {
              onSuccess: () => {
                toast.success('Service updated');
                setEditing(null);
              },
              onError: (err) => toast.error(mutationErrorMessage(err)),
            },
          );
        })}
      >
        <TariffServiceFormFields control={editForm.control} mode="edit" />
      </EntityFormDialog>

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
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
              <dt className="text-muted-foreground">Category</dt>
              <dd>{viewing.category ?? '—'}</dd>
              <dt className="text-muted-foreground">Department</dt>
              <dd>{viewing.department ?? '—'}</dd>
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

      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate service?"
        description="Inactive services cannot be charged. You can re-activate from the table."
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => {
          if (!deactivating) return;
          updateMutation.mutate(
            { id: deactivating.id, input: { is_active: false } },
            {
              onSuccess: () => {
                toast.success('Service deactivated');
                setDeactivating(null);
              },
              onError: (err) => toast.error(mutationErrorMessage(err)),
            },
          );
        }}
      />
    </BillingPageShell>
  );
}
