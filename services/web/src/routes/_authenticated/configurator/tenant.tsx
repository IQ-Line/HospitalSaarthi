import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
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
import {
  useCreateOrganization,
  useOrganizations,
  useUpdateOrganization,
} from '@/features/configurator/api';
import { setPendingAdminProvisioning } from '@/features/configurator/pending-admin-provisioning';
import { CreateTenantWizard } from '@/features/configurator/components/create-tenant-wizard';
import { ConfiguratorPageShell } from '@/features/configurator/components/configurator-page-shell';
import type {
  Organization,
  OrganizationCreateInput,
  OrganizationStatus,
  OrganizationType,
  TenantWizardAdminSnapshot,
} from '@/features/configurator/types';
import {
  EMPTY_ORGANIZATION_FORM_VALUES,
  organizationFormSchema,
  organizationTypeOptions,
  type OrganizationFormValues,
} from '@/features/configurator/validation';
import { EntityFormDialog } from '@/features/master-data/components/entity-form-dialog';
import { EntityRowActions } from '@/features/master-data/components/entity-row-actions';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { ReadOnlyRow } from '@/features/master-data/components/read-only-row';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';
import { toSlug } from '@/features/master-data/utils';

export const Route = createFileRoute('/_authenticated/configurator/tenant')({
  component: ConfiguratorTenantPage,
});

const statusFilterOptions: Array<{ value: OrganizationStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All status' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const organizationStatusLabels: Record<OrganizationStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  decommissioned: 'Decommissioned',
};

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadgeVariant(
  status: OrganizationStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'active') return 'default';
  if (status === 'suspended') return 'secondary';
  return 'outline';
}

function ConfiguratorTenantPage() {
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrganizationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<OrganizationType | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null);

  const listFilters = useMemo(
    () => ({
      status: statusFilter === 'all' ? undefined : statusFilter,
      type: typeFilter === 'all' ? undefined : typeFilter,
    }),
    [statusFilter, typeFilter],
  );

  const { data, isLoading, error } = useOrganizations(listFilters);
  const organizations = data?.data ?? [];

  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();

  const editForm = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: EMPTY_ORGANIZATION_FORM_VALUES,
  });

  const filteredOrgs = useMemo(() => {
    return organizations.filter((o) =>
      rowMatchesSearch(
        tableSearch,
        o.name,
        o.slug,
        o.type,
        o.status,
        o.contact_email ?? '',
        o.contact_phone ?? '',
        o.address ?? '',
      ),
    );
  }, [organizations, tableSearch]);

  const columns = useMemo<ColumnDef<Organization, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tenant',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.slug}</div>
          </div>
        ),
      },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => {
          const t = getValue<OrganizationType>();
          const label = organizationTypeOptions.find((o) => o.value === t)?.label ?? t;
          return <Badge variant="secondary">{label}</Badge>;
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const s = getValue<OrganizationStatus>();
          return (
            <Badge variant={statusBadgeVariant(s)}>{organizationStatusLabels[s]}</Badge>
          );
        },
      },
      {
        accessorKey: 'contact_email',
        header: 'Contact',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.contact_email ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        cell: ({ getValue }) => (
          <span className="text-sm">{formatShortDate(getValue<string>())}</span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ getValue }) => (
          <span className="text-sm">{formatShortDate(getValue<string>())}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <EntityRowActions
            onView={() => setViewingOrg(row.original)}
            onEdit={() => {
              setEditingOrg(row.original);
              editForm.reset({
                name: row.original.name,
                slug: row.original.slug,
                type: row.original.type,
                status: row.original.status,
                contact_email: row.original.contact_email ?? '',
                contact_phone: row.original.contact_phone ?? '',
                address: row.original.address ?? '',
              });
            }}
            onDelete={() =>
              toast.info('Removing a tenant is not available from this screen.')
            }
            disabled={updateMutation.isPending}
          />
        ),
      },
    ],
    [editForm, updateMutation.isPending],
  );

  const toPatchPayload = (values: OrganizationFormValues) => {
    const email = values.contact_email?.trim();
    const phone = values.contact_phone?.trim();
    const addr = values.address?.trim();
    return {
      name: values.name.trim(),
      slug: values.slug.trim(),
      type: values.type,
      ...(values.status ? { status: values.status } : {}),
      contact_email: email && email.length > 0 ? email : null,
      contact_phone: phone && phone.length > 0 ? phone : null,
      address: addr && addr.length > 0 ? addr : null,
    };
  };

  const onCreateWizardComplete = async ({
    payload,
    admin,
  }: {
    payload: OrganizationCreateInput;
    admin: TenantWizardAdminSnapshot;
  }) => {
    try {
      await createMutation.mutateAsync(payload);
      setPendingAdminProvisioning(admin);
      toast.success('Tenant created with default environment');
      setIsCreateOpen(false);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  };

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    if (!editingOrg) return;
    try {
      await updateMutation.mutateAsync({
        id: editingOrg.id,
        input: toPatchPayload(values),
      });
      toast.success('Tenant updated');
      setEditingOrg(null);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  });

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load tenants: {error.message}
      </div>
    );
  }

  return (
    <ConfiguratorPageShell
      section="tenant"
      title="Tenant"
      description="Tenants and their default environment (configurator)."
      actions={
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as OrganizationStatus | 'all')}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as OrganizationType | 'all')}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {organizationTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateOpen(true)}>+ Create Tenant</Button>
        </div>
      }
    >
      <div className="rounded-lg border">
        <div className="p-3 border-b">
          <MasterDataTableToolbar
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search name, slug, type, status, contact…"
          />
        </div>
        <DataTable
          columns={columns}
          data={filteredOrgs}
          isLoading={isLoading}
          emptyTitle="No tenants found"
          emptyDescription="Create a tenant to register a new tenant record and default environment."
        />
      </div>

      <CreateTenantWizard
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        isSubmitting={createMutation.isPending}
        onComplete={onCreateWizardComplete}
      />

      <EntityFormDialog
        open={!!editingOrg}
        onOpenChange={(open) => {
          if (!open) {
            setEditingOrg(null);
          }
        }}
        title="Edit tenant"
        description="Update tenant details. Default environment linkage is unchanged."
        submitLabel="Save changes"
        isSubmitting={updateMutation.isPending}
        onSubmit={onEditSubmit}
      >
        <OrganizationFormFields form={editForm} />
      </EntityFormDialog>

      <Dialog open={!!viewingOrg} onOpenChange={(open) => !open && setViewingOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tenant details</DialogTitle>
            <DialogDescription>Tenant record from configurator.</DialogDescription>
          </DialogHeader>
          {viewingOrg && (
            <div className="space-y-2 text-sm">
              <ReadOnlyRow label="Name" value={viewingOrg.name} />
              <ReadOnlyRow label="Slug" value={viewingOrg.slug} />
              <ReadOnlyRow
                label="Type"
                value={
                  organizationTypeOptions.find((o) => o.value === viewingOrg.type)?.label ??
                  viewingOrg.type
                }
              />
              <ReadOnlyRow
                label="Status"
                value={organizationStatusLabels[viewingOrg.status]}
              />
              <ReadOnlyRow label="Contact email" value={viewingOrg.contact_email ?? '—'} />
              <ReadOnlyRow label="Contact phone" value={viewingOrg.contact_phone ?? '—'} />
              <ReadOnlyRow label="Address" value={viewingOrg.address ?? '—'} />
              <ReadOnlyRow label="Created" value={formatShortDate(viewingOrg.created_at)} />
              <ReadOnlyRow label="Updated" value={formatShortDate(viewingOrg.updated_at)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ConfiguratorPageShell>
  );
}

function OrganizationFormFields({
  form,
}: {
  form: ReturnType<typeof useForm<OrganizationFormValues>>;
}) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const watchedName = watch('name');
  const slugSuggestion = toSlug(watchedName);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Name</Label>
          <Input id="org-name" placeholder="e.g. City General Hospital" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-slug">Slug</Label>
          <Input
            id="org-slug"
            placeholder={slugSuggestion || 'city-general'}
            {...register('slug')}
          />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Tenant type" />
                </SelectTrigger>
                <SelectContent>
                  {organizationTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? 'active'}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(organizationStatusLabels) as OrganizationStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {organizationStatusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-email">Contact email (optional)</Label>
        <Input
          id="org-email"
          type="email"
          placeholder="ops@hospital.example"
          {...register('contact_email')}
        />
        {errors.contact_email && (
          <p className="text-xs text-destructive">{errors.contact_email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-phone">Contact phone (optional)</Label>
        <Input id="org-phone" {...register('contact_phone')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-address">Address (optional)</Label>
        <Textarea id="org-address" rows={2} {...register('address')} />
      </div>
    </div>
  );
}
