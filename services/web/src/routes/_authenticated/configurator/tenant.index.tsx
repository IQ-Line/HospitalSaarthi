import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pulse/ui/select';
import { DataTable } from '@/components/data-table';
import {
  useCreateOrganization,
  useOrganizations,
} from '@/features/configurator/api';
import { provisionTenantAdmin } from '@/features/configurator/provision-tenant-admin';
import { useCreateUser } from '@/features/user-management/api/mutations';
import { CreateTenantWizard } from '@/features/configurator/components/create-tenant-wizard';
import { ConfiguratorPageShell } from '@/features/configurator/components/configurator-page-shell';
import type {
  Organization,
  OrganizationCreateInput,
  OrganizationStatus,
  OrganizationType,
  TenantWizardAdminSnapshot,
  TenantWizardRoleSnapshot,
} from '@/features/configurator/types';
import { organizationTypeOptions } from '@/features/configurator/validation';
import { MasterDataTableToolbar } from '@/features/master-data/components/master-data-table-toolbar';
import { mutationErrorMessage } from '@/features/master-data/mutation-error';
import { rowMatchesSearch } from '@/features/master-data/table-search';

export const Route = createFileRoute('/_authenticated/configurator/tenant/')({
  component: ConfiguratorTenantListPage,
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

function ConfiguratorTenantListPage() {
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrganizationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<OrganizationType | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
  const createUserMutation = useCreateUser();

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
        cell: ({ row }) => {
          const org = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon-sm" asChild aria-label="View tenant">
                <Link to="/configurator/tenant/$organizationId" params={{ organizationId: org.id }}>
                  <Eye className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon-sm" asChild aria-label="Edit tenant">
                <Link to="/configurator/tenant/$organizationId" params={{ organizationId: org.id }}>
                  <Pencil className="size-4" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                aria-label="Delete tenant"
                onClick={() =>
                  toast.info('Removing a tenant is not available from this screen.')
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const onCreateWizardComplete = async ({
    payload,
    role,
    admin,
  }: {
    payload: OrganizationCreateInput;
    role: TenantWizardRoleSnapshot;
    admin: TenantWizardAdminSnapshot;
  }) => {
    try {
      const created = await createMutation.mutateAsync(payload);
      const tenantId = created.default_tenant.iq_tenant_id;
      const orgId = created.organization.id;

      try {
        await provisionTenantAdmin({
          admin,
          role,
          tenantId,
          orgId,
          createUser: (input) => createUserMutation.mutateAsync(input),
        });
        toast.success('Tenant, admin role, and admin user created');
      } catch (adminErr) {
        toast.error(
          `Tenant created, but admin user failed: ${mutationErrorMessage(adminErr)}`,
        );
      }
      setIsCreateOpen(false);
    } catch (err) {
      toast.error(mutationErrorMessage(err));
    }
  };

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
        isSubmitting={createMutation.isPending || createUserMutation.isPending}
        onComplete={onCreateWizardComplete}
      />
    </ConfiguratorPageShell>
  );
}
