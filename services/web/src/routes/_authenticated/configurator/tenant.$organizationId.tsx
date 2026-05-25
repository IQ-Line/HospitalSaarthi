import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  ArrowLeft,
  Building2,
  Calendar,
  GitBranch,
  Globe,
  Layers,
  Shield,
  Users,
} from 'lucide-react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pulse/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@pulse/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pulse/ui/tabs';
import { DataTable } from '@/components/data-table';
import {
  useOrganization,
  useTenantModules,
  useTenants,
} from '@/features/configurator/api';
import { AddBranchDialog } from '@/features/configurator/components/add-branch-dialog';
import {
  TenantBillingPanel,
  TenantDepartmentsPanel,
  TenantRoleTemplatesPanel,
  TenantUsersPanel,
} from '@/features/configurator/components/tenant-detail-panels';
import type { ConfiguratorTenant } from '@/features/configurator/types';
import { useModules } from '@/features/master-data/api';
import { ReadOnlyRow } from '@/features/master-data/components/read-only-row';
import type { Module } from '@/features/master-data/types';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@pulse/ui/empty';

export const Route = createFileRoute('/_authenticated/configurator/tenant/$organizationId')({
  component: TenantOrganizationDetailPage,
});

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const branchTypeLabels: Record<string, string> = {
  hub_lab: 'Hub Lab',
  hub: 'Hub',
  satellite: 'Satellite',
};

function provisioningLabel(status: string) {
  if (status === 'provisioning') return 'Pending';
  if (status === 'active') return 'Active';
  if (status === 'suspended') return 'Suspended';
  return status;
}

function TenantTabComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <Empty className="border border-dashed py-12">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{body}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function TenantOrganizationDetailPage() {
  const { organizationId } = Route.useParams();
  const [tab, setTab] = useState('overview');
  const [addBranchOpen, setAddBranchOpen] = useState(false);

  const { data: org, isLoading: orgLoading, error: orgError } = useOrganization(organizationId);
  /** List all tenants for the org, then pick root client-side (avoids brittle is_root-only queries). */
  const { data: orgTenantsRes, isLoading: orgTenantsLoading } = useTenants(
    { org_id: organizationId },
    { enabled: !!organizationId },
  );
  const rootTenant = useMemo(() => {
    const rows = orgTenantsRes?.data ?? [];
    return rows.find((t) => t.parent_tenant_id == null) ?? null;
  }, [orgTenantsRes?.data]);

  const { data: branchesRes, isLoading: branchesLoading } = useTenants(
    {
      org_id: organizationId,
      parent_tenant_id: rootTenant?.iq_tenant_id,
    },
    { enabled: !!organizationId && !!rootTenant?.iq_tenant_id },
  );

  const { data: modulesRes, isLoading: modulesCatalogLoading } = useModules(undefined, {
    enabled: !!rootTenant?.iq_tenant_id,
    globalCatalog: true,
  });
  const { data: tenantModsRes, isLoading: tenantModsLoading } = useTenantModules(
    rootTenant?.iq_tenant_id ?? '',
    {
      enabled:
        !!rootTenant?.iq_tenant_id &&
        (tab === 'overview' || tab === 'modules'),
    },
  );

  const moduleNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mod of modulesRes?.data ?? []) {
      m.set(mod.id, mod.name);
    }
    return m;
  }, [modulesRes?.data]);

  const productModuleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const mod of modulesRes?.data ?? []) {
      if (mod.module_kind === 'product') {
        ids.add(mod.id);
      }
    }
    return ids;
  }, [modulesRes?.data]);

  const activeModuleNames = useMemo(() => {
    const rows = tenantModsRes?.data ?? [];
    return rows
      .filter((r) => r.is_active && productModuleIds.has(r.module_id))
      .map((r) => moduleNameById.get(r.module_id) ?? r.module_id.slice(0, 8));
  }, [tenantModsRes?.data, moduleNameById, productModuleIds]);

  const planSlug = useMemo(() => {
    const meta = org?.metadata as Record<string, unknown> | null | undefined;
    const prov = meta?.provisioning as Record<string, unknown> | undefined;
    const slug = prov?.plan_slug;
    if (slug === 'professional') return 'Professional Plan';
    if (slug === 'starter') return 'Starter Plan';
    return typeof slug === 'string' ? slug : '—';
  }, [org?.metadata]);

  const branchColumns = useMemo<ColumnDef<ConfiguratorTenant, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      {
        id: 'record_kind',
        header: 'Record',
        cell: ({ row }) =>
          row.original.parent_tenant_id == null ? (
            <Badge variant="default" className="text-xs font-normal">
              Default environment
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs font-normal">
              Branch
            </Badge>
          ),
      },
      {
        accessorKey: 'branch_code',
        header: 'Code',
        cell: ({ row, getValue }) => {
          const v = getValue<string | null>();
          if (v) return <code className="text-xs">{v}</code>;
          if (row.original.parent_tenant_id == null) {
            return <span className="text-muted-foreground text-xs">— (org root)</span>;
          }
          return <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'branch_type',
        header: 'Type',
        cell: ({ row }) => {
          const v = row.original.branch_type;
          if (v) {
            return <Badge variant="secondary">{branchTypeLabels[v] ?? v}</Badge>;
          }
          if (row.original.parent_tenant_id == null) {
            const t = row.original.type.replace(/_/g, ' ');
            return <Badge variant="outline" className="text-xs font-normal capitalize">{t}</Badge>;
          }
          return <span className="text-muted-foreground">—</span>;
        },
      },
      {
        id: 'parent_hub',
        header: 'Parent hub',
        cell: ({ row }) => {
          if (row.original.parent_tenant_id == null) {
            return <span className="text-muted-foreground">—</span>;
          }
          const meta = row.original.metadata as Record<string, unknown> | null;
          const hub = meta?.parent_hub;
          return typeof hub === 'string' ? hub : '—';
        },
      },
      {
        accessorKey: 'city',
        header: 'City',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'provisioning_status',
        header: 'Status',
        cell: ({ getValue }) => {
          const s = getValue<string>();
          const active = s === 'active';
          return (
            <Badge variant={active ? 'default' : 'secondary'}>{provisioningLabel(s)}</Badge>
          );
        },
      },
      {
        accessorKey: 'updated_at',
        header: 'Last updated',
        cell: ({ getValue }) => formatShortDate(getValue<string>()),
      },
    ],
    [],
  );

  const tenantModuleActiveById = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const r of tenantModsRes?.data ?? []) {
      m.set(r.module_id, r.is_active);
    }
    return m;
  }, [tenantModsRes?.data]);

  const catalogModules = useMemo(
    () => (modulesRes?.data ?? []).filter((mod) => !mod.is_deleted),
    [modulesRes?.data],
  );

  const moduleColumns = useMemo<ColumnDef<Module, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Module',
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ getValue }) => <code className="text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        id: 'for_tenant',
        header: () => <div className="text-right">Enabled for tenant</div>,
        cell: ({ row }) => {
          const on = tenantModuleActiveById.get(row.original.id) === true;
          return (
            <div className="text-right">
              <Badge variant={on ? 'default' : 'secondary'}>{on ? 'Yes' : 'No'}</Badge>
            </div>
          );
        },
      },
    ],
    [tenantModuleActiveById],
  );

  const branches = branchesRes?.data ?? [];
  /** Root tenant is created with the org; show it first so Branches is never empty for a healthy tenant. */
  const branchTableRows = useMemo(
    () => (rootTenant ? [rootTenant, ...branches] : branches),
    [rootTenant, branches],
  );
  if (orgError) {
    return (
      <div className="p-6 text-destructive">
        Failed to load organization: {orgError.message}
      </div>
    );
  }

  if (orgLoading || !org) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (orgTenantsLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading tenant…</div>;
  }

  if (!rootTenant) {
    const tenantCount = orgTenantsRes?.data?.length ?? 0;
    return (
      <div className="p-6 max-w-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="icon-sm" asChild aria-label="Back to list">
            <Link to="/configurator/tenant">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">{org.name}</h1>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            This organization has no default (root) environment in the configurator database
            {tenantCount > 0
              ? ` — ${tenantCount} tenant row(s) exist but every row has a parent tenant, so none is treated as the org root.`
              : ' — there are no tenant rows for this organization yet.'}
          </p>
          <p className="text-muted-foreground">
            New tenants created from this app get a default environment automatically. Older or
            manually inserted organizations may need a root tenant row added in the database, or
            you can create another organization from the tenant list.
          </p>
          <ReadOnlyRow label="Slug" value={org.slug} />
          <ReadOnlyRow label="Organization ID" value={org.id} />
        </div>
        <Button variant="outline" asChild>
          <Link to="/configurator/tenant">Back to tenants</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Configurator</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/configurator/tenant">Tenant</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[12rem] truncate">{org.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild aria-label="Back to list">
            <Link to="/configurator/tenant">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">{org.name}</h1>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <div className="w-full overflow-x-auto pb-1">
          <TabsList
            variant="line"
            className="inline-flex h-auto min-w-max flex-nowrap justify-start gap-1 bg-transparent p-0"
          >
            <TabsTrigger value="overview" className="shrink-0 text-xs sm:text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="branches" className="shrink-0 text-xs sm:text-sm">
              Branches
            </TabsTrigger>
            <TabsTrigger value="users" className="shrink-0 text-xs sm:text-sm">
              Users
            </TabsTrigger>
            <TabsTrigger value="role-templates" className="shrink-0 text-xs sm:text-sm">
              Role Templates
            </TabsTrigger>
            <TabsTrigger value="department-templates" className="shrink-0 text-xs sm:text-sm">
              Department templates
            </TabsTrigger>
            <TabsTrigger value="billing" className="shrink-0 text-xs sm:text-sm">
              Billing
            </TabsTrigger>
            <TabsTrigger value="modules" className="shrink-0 text-xs sm:text-sm">
              Modules
            </TabsTrigger>
            <TabsTrigger value="audit-logs" className="shrink-0 text-xs sm:text-sm">
              Audit logs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Status banner */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-5 py-4 shadow-sm">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold truncate">{org.name}</h2>
              <p className="text-sm text-muted-foreground truncate">
                {org.slug}.iqhealth.app
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={rootTenant.provisioning_status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {provisioningLabel(rootTenant.provisioning_status)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {planSlug}
              </Badge>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <GitBranch className="size-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums leading-none">
                    {branchesLoading ? '…' : branches.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Active branches</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Layers className="size-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums leading-none">
                    {tenantModsLoading ? '…' : activeModuleNames.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Modules enabled</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <Users className="size-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums leading-none">—</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total users</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <Shield className="size-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums leading-none">—</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Monthly volume</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details cards */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Organization details */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="size-4 text-muted-foreground" />
                  Organization details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Organization ID</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{org.id.slice(0, 8)}…</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tenant ID</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{rootTenant.iq_tenant_id.slice(0, 8)}…</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="font-medium">{org.slug}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{planSlug}</span>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="size-4 text-muted-foreground" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium tabular-nums">{formatShortDate(org.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last updated</span>
                  <span className="font-medium tabular-nums">{formatShortDate(org.updated_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Provisioning status</span>
                  <Badge
                    variant={rootTenant.provisioning_status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {provisioningLabel(rootTenant.provisioning_status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Modules enabled */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Layers className="size-4 text-muted-foreground" />
                Enabled modules
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeModuleNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">No modules enabled yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeModuleNames.map((name) => (
                    <Badge
                      key={name}
                      variant="secondary"
                      className="px-2.5 py-1 text-xs font-normal"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              className="bg-[#008C9E] text-white hover:bg-[#00798a]"
              onClick={() => setAddBranchOpen(true)}
            >
              + Add branch
            </Button>
          </div>
          <div className="rounded-lg border">
            <DataTable
              columns={branchColumns}
              data={branchTableRows}
              isLoading={branchesLoading}
              emptyTitle="No environments"
              emptyDescription="No tenant rows returned for this organization."
            />
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <TenantUsersPanel iqTenantId={rootTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="role-templates" className="mt-4">
          <TenantRoleTemplatesPanel iqTenantId={rootTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="department-templates" className="mt-4">
          <TenantDepartmentsPanel iqTenantId={rootTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <TenantBillingPanel iqTenantId={rootTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <div className="rounded-lg border">
            <DataTable
              columns={moduleColumns}
              data={catalogModules}
              isLoading={modulesCatalogLoading || tenantModsLoading}
              emptyTitle="No modules in catalog"
              emptyDescription="Add modules under Master data → Modules."
            />
          </div>
        </TabsContent>

        <TabsContent value="audit-logs" className="mt-4">
          <TenantTabComingSoon
            title="Audit logs"
            body="Immutable audit trails for this tenant are not exposed via master-data. This will link to an audit service when available."
          />
        </TabsContent>
      </Tabs>

      <AddBranchDialog
        open={addBranchOpen}
        onOpenChange={setAddBranchOpen}
        organizationId={organizationId}
        organizationSlug={org.slug}
        parentTenantId={rootTenant.iq_tenant_id}
      />
    </div>
  );
}
