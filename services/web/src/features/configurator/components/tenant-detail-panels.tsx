import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { Textarea } from '@pulse/ui/textarea';
import { DataTable } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EntityFormDialog } from '@/components/entity-table/entity-form-dialog';
import { EntityRowActions } from '@/components/entity-table/entity-row-actions';
import { EntityTableToolbar } from '@/components/entity-table/entity-table-toolbar';
import { TableActiveToggle } from '@/components/entity-table/table-active-toggle';
import { useTenantUsers } from '@/features/configurator/api';
import {
  useCreateTariffService,
  useTariffServices,
  useUpdateTariffService,
} from '@/features/billing/api';
import { TariffServiceFormFields } from '@/features/billing/components/tariff-service-form-fields';
import { formatMoneyDisplay } from '@/features/billing/lib/format';
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
import {
  useCreateDepartment,
  useCreateSystemRole,
  useDeleteDepartment,
  useDeleteSystemRole,
  useDepartments,
  useSystemRoles,
  useUpdateDepartment,
  useUpdateSystemRole,
} from '@/features/master-data/api';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import {
  SystemRoleFormDialog,
  systemRoleToFormValues,
} from '@/features/master-data/components/system-role-form-dialog';
import type {
  Department,
  DepartmentType,
  SystemRole,
  SystemRoleCreateInput,
  SystemRoleUpdateInput,
} from '@/features/master-data/types';
import {
  EMPTY_DEPARTMENT_FORM_VALUES,
  EMPTY_SYSTEM_ROLE_FORM_VALUES,
  departmentFormSchema,
  type DepartmentFormInput,
  type DepartmentFormValues,
} from '@/features/master-data/validation';
import type { UmUser } from '@/features/user-management/types';
import { mutationErrorMessage as billingMutationError } from '@/lib/mutation-error';

const DEPARTMENT_TYPES: DepartmentType[] = [
  'clinical',
  'diagnostic',
  'administrative',
  'support',
];

const BILLING_FORCE_LIVE = { forceLive: true as const };

export function TenantUsersPanel({ iqTenantId }: { iqTenantId: string }) {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useTenantUsers(iqTenantId);

  const columns = useMemo<ColumnDef<UmUser, unknown>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: 'Name',
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'username',
        header: 'Username',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'department',
        header: 'Department',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant={getValue<string>() === 'active' ? 'default' : 'secondary'}>
            {getValue<string>()}
          </Badge>
        ),
      },
    ],
    [],
  );

  const rows = useMemo(() => {
    const list = data ?? [];
    if (!search.trim()) return list;
    return list.filter((u) =>
      rowMatchesSearch(search, u.full_name, u.email ?? '', u.username ?? '', u.department ?? ''),
    );
  }, [data, search]);

  if (error) {
    return <p className="text-sm text-destructive">Failed to load users: {error.message}</p>;
  }

  return (
    <div className="space-y-3">
      <EntityTableToolbar value={search} onChange={setSearch} placeholder="Search users…" />
      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyTitle="No users"
          emptyDescription="No directory users for this tenant yet."
        />
      </div>
    </div>
  );
}

function DepartmentFormFields({
  form,
}: {
  form: UseFormReturn<DepartmentFormInput, unknown, DepartmentFormValues>;
}) {
  const { register, setValue, watch } = form;
  const type = watch('type');
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="dept-name">Name</Label>
        <Input id="dept-name" {...register('name')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dept-code">Code</Label>
        <Input id="dept-code" {...register('code')} />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setValue('type', v as DepartmentType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dept-desc">Description</Label>
        <Textarea id="dept-desc" rows={2} {...register('description')} />
      </div>
    </div>
  );
}

export function TenantDepartmentsPanel({ iqTenantId }: { iqTenantId: string }) {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const { data, isLoading, error } = useDepartments(undefined, { iqTenantId });
  const createMutation = useCreateDepartment(iqTenantId);
  const updateMutation = useUpdateDepartment(iqTenantId);
  const deleteMutation = useDeleteDepartment(iqTenantId);

  const createForm = useForm<DepartmentFormInput, unknown, DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: EMPTY_DEPARTMENT_FORM_VALUES,
  });
  const editForm = useForm<DepartmentFormInput, unknown, DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: EMPTY_DEPARTMENT_FORM_VALUES,
  });

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    if (!search.trim()) return list;
    return list.filter((d) =>
      rowMatchesSearch(search, d.name, d.code, d.type, d.description ?? ''),
    );
  }, [data?.data, search]);

  const columns = useMemo<ColumnDef<Department, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: 'is_active',
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
                  onSuccess: () => toast.success(next ? 'Activated' : 'Deactivated'),
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
            onView={() => {
              setEditing(row.original);
              editForm.reset({
                name: row.original.name,
                code: row.original.code,
                type: row.original.type,
                description: row.original.description,
                is_active: row.original.is_active,
              });
            }}
            onEdit={() => {
              setEditing(row.original);
              editForm.reset({
                name: row.original.name,
                code: row.original.code,
                type: row.original.type,
                description: row.original.description,
                is_active: row.original.is_active,
              });
            }}
            onDelete={() => setDeleting(row.original)}
          />
        ),
      },
    ],
    [editForm, updateMutation],
  );

  if (error) {
    return (
      <p className="text-sm text-destructive">Failed to load departments: {error.message}</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          onClick={() => {
            createForm.reset(EMPTY_DEPARTMENT_FORM_VALUES);
            setIsCreateOpen(true);
          }}
        >
          <Plus className="size-4 mr-1" />
          Add department
        </Button>
      </div>
      <EntityTableToolbar value={search} onChange={setSearch} placeholder="Search departments…" />
      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyTitle="No tenant departments"
          emptyDescription="Create departments for this tenant catalog."
        />
      </div>

      <EntityFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Add department"
        description="Create a department in this tenant catalog."
        submitLabel="Create"
        isSubmitting={createMutation.isPending}
        onSubmit={createForm.handleSubmit((values) => {
          createMutation.mutate(
            {
              name: values.name,
              code: values.code,
              type: values.type,
              description: values.description,
              is_active: values.is_active,
            },
            {
              onSuccess: () => {
                toast.success('Department created');
                setIsCreateOpen(false);
                createForm.reset(EMPTY_DEPARTMENT_FORM_VALUES);
              },
              onError: (err) => toast.error(mutationErrorMessage(err)),
            },
          );
        })}
      >
        <DepartmentFormFields form={createForm} />
      </EntityFormDialog>

      <EntityFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit department"
        description={editing ? `Update ${editing.name}.` : ''}
        submitLabel="Save"
        isSubmitting={updateMutation.isPending}
        onSubmit={editForm.handleSubmit((values) => {
          if (!editing) return;
          updateMutation.mutate(
            {
              id: editing.id,
              input: {
                name: values.name,
                code: values.code,
                type: values.type,
                description: values.description,
                is_active: values.is_active,
              },
            },
            {
              onSuccess: () => {
                toast.success('Department updated');
                setEditing(null);
              },
              onError: (err) => toast.error(mutationErrorMessage(err)),
            },
          );
        })}
      >
        <DepartmentFormFields form={editForm} />
      </EntityFormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete department?"
        description={`Remove "${deleting?.name}" from the tenant catalog.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteMutation.mutateAsync(deleting.id);
            toast.success('Department deleted');
            setDeleting(null);
          } catch (err) {
            toast.error(mutationErrorMessage(err));
          }
        }}
      />
    </div>
  );
}

export function TenantRoleTemplatesPanel({ iqTenantId }: { iqTenantId: string }) {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SystemRole | null>(null);
  const [deleting, setDeleting] = useState<SystemRole | null>(null);

  const { data, isLoading, error } = useSystemRoles(true, { iqTenantId });
  const createMutation = useCreateSystemRole(iqTenantId);
  const updateMutation = useUpdateSystemRole(iqTenantId);
  const deleteMutation = useDeleteSystemRole(iqTenantId);

  const editDefaults = useMemo(
    () => (editing ? systemRoleToFormValues(editing) : EMPTY_SYSTEM_ROLE_FORM_VALUES),
    [editing],
  );

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    if (!search.trim()) return list;
    return list.filter((r) =>
      rowMatchesSearch(search, r.name, r.slug, r.description ?? '', String(r.is_template)),
    );
  }, [data?.data, search]);

  const columns = useMemo<ColumnDef<SystemRole, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'role_type',
        header: 'Role type',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'is_template',
        header: 'Template',
        cell: ({ getValue }) => (
          <Badge variant={getValue<boolean>() ? 'secondary' : 'outline'}>
            {getValue<boolean>() ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        accessorKey: 'is_active',
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
                  onSuccess: () => toast.success(next ? 'Activated' : 'Deactivated'),
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
            onView={() => setEditing(row.original)}
            onEdit={() => setEditing(row.original)}
            onDelete={() => setDeleting(row.original)}
          />
        ),
      },
    ],
    [updateMutation],
  );

  if (error) {
    return (
      <p className="text-sm text-destructive">Failed to load role templates: {error.message}</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="size-4 mr-1" />
          Create role
        </Button>
      </div>
      <EntityTableToolbar value={search} onChange={setSearch} placeholder="Search roles…" />
      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyTitle="No role templates"
          emptyDescription="Create system roles marked as templates for this tenant."
        />
      </div>

      <SystemRoleFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
        title="Create role"
        description="Define role settings and catalog permissions for this tenant."
        submitLabel="Create"
        isSubmitting={createMutation.isPending}
        configuratorTenantId={iqTenantId}
        defaultValues={EMPTY_SYSTEM_ROLE_FORM_VALUES}
        onSubmit={(payload) => {
          createMutation.mutate(payload as SystemRoleCreateInput, {
            onSuccess: () => {
              toast.success('Role created');
              setIsCreateOpen(false);
            },
            onError: (err) => toast.error(mutationErrorMessage(err)),
          });
        }}
      />

      <SystemRoleFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        mode="edit"
        title="Edit role"
        description={editing ? `Update ${editing.name}.` : ''}
        submitLabel="Save"
        isSubmitting={updateMutation.isPending}
        configuratorTenantId={iqTenantId}
        defaultValues={editDefaults}
        onSubmit={(payload) => {
          if (!editing) return;
          updateMutation.mutate(
            { id: editing.id, input: payload as SystemRoleUpdateInput },
            {
              onSuccess: () => {
                toast.success('Role updated');
                setEditing(null);
              },
              onError: (err) => toast.error(mutationErrorMessage(err)),
            },
          );
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete role?"
        description={`Remove "${deleting?.name}" from the tenant catalog.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteMutation.mutateAsync(deleting.id);
            toast.success('Role deleted');
            setDeleting(null);
          } catch (err) {
            toast.error(mutationErrorMessage(err));
          }
        }}
      />
    </div>
  );
}

export function TenantBillingPanel({ iqTenantId }: { iqTenantId: string }) {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TariffService | null>(null);

  const listParams = useMemo(
    () => ({ q: search || undefined, limit: 50 }),
    [search],
  );
  const { data, isLoading, error } = useTariffServices(listParams, {
    iqTenantId,
    ...BILLING_FORCE_LIVE,
  });
  const services = data?.data ?? [];
  const createMutation = useCreateTariffService(iqTenantId, BILLING_FORCE_LIVE);
  const updateMutation = useUpdateTariffService(iqTenantId, BILLING_FORCE_LIVE);

  const createForm = useForm<TariffServiceCreateFormValues>({
    resolver: zodResolver(tariffServiceCreateSchema),
    defaultValues: EMPTY_TARIFF_CREATE_VALUES,
  });
  const editForm = useForm<TariffServiceEditFormValues>({
    resolver: zodResolver(tariffServiceEditSchema),
    defaultValues: EMPTY_TARIFF_EDIT_VALUES,
  });

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
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'base_price',
        header: 'Price',
        cell: ({ getValue }) => formatMoneyDisplay(getValue<string>()),
      },
      {
        accessorKey: 'is_active',
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
                  onSuccess: () => toast.success(next ? 'Activated' : 'Deactivated'),
                  onError: (err) => toast.error(billingMutationError(err)),
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
            onView={() => {
              setEditing(row.original);
              editForm.reset(serviceToEditFormValues(row.original));
            }}
            onEdit={() => {
              setEditing(row.original);
              editForm.reset(serviceToEditFormValues(row.original));
            }}
            onDelete={() => {}}
            readOnly
          />
        ),
      },
    ],
    [editForm, updateMutation],
  );

  if (error) {
    return <p className="text-sm text-destructive">Failed to load billing: {error.message}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          onClick={() => {
            createForm.reset(EMPTY_TARIFF_CREATE_VALUES);
            setIsCreateOpen(true);
          }}
        >
          <Plus className="size-4 mr-1" />
          Add service
        </Button>
      </div>
      <EntityTableToolbar value={search} onChange={setSearch} placeholder="Search services…" />
      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={services}
          isLoading={isLoading}
          emptyTitle="No tariff services"
          emptyDescription="Add chargeable services for this tenant."
        />
      </div>

      <EntityFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Add tariff service"
        description="Create a chargeable service for this tenant."
        submitLabel="Create"
        isSubmitting={createMutation.isPending}
        onSubmit={createForm.handleSubmit((values) => {
          createMutation.mutate(formToCreatePayload(values), {
            onSuccess: () => {
              toast.success('Service created');
              setIsCreateOpen(false);
              createForm.reset(EMPTY_TARIFF_CREATE_VALUES);
            },
            onError: (err) => toast.error(billingMutationError(err)),
          });
        })}
      >
        <TariffServiceFormFields control={createForm.control} mode="create" />
      </EntityFormDialog>

      <EntityFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit tariff service"
        description={editing ? `Update ${editing.service_code}.` : ''}
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
              onError: (err) => toast.error(billingMutationError(err)),
            },
          );
        })}
      >
        <TariffServiceFormFields control={editForm.control} mode="edit" />
      </EntityFormDialog>
    </div>
  );
}
