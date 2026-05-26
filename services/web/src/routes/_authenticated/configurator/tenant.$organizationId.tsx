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
import { CreateBranchWizard } from '@/features/configurator/components/create-branch-wizard';
import { TenantModulesPanel } from '@/features/configurator/components/tenant-modules-panel';
import {
  TenantBillingPanel,
  TenantDepartmentsPanel,
  TenantRoleTemplatesPanel,
  TenantUsersPanel,
} from '@/features/configurator/components/tenant-detail-panels';
import { isPlatformSuperAdminFromAccessToken } from '@/lib/platform-admin';
import { useAuthStore } from '@/stores/auth.store';
import {
  buildDescendantBranchTreeRows,
  type TenantTreeRow,
} from '@/features/configurator/tenant-tree';
import type { ConfiguratorTenant } from '@/features/configurator/types';
import { useModules } from '@/features/master-data/api';
import { ReadOnlyRow } from '@/features/master-data/components/read-only-row';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@pulse/ui/empty';

export const Route = createFileRoute('/_authenticated/configurator/tenant/$organizationId')({
  validateSearch: (search: Record<string, unknown>) => ({
    tenantId:
      typeof search.tenantId === 'string' && search.tenantId.trim().length > 0
        ? search.tenantId.trim()
        : undefined,
  }),
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
  const { tenantId: tenantIdFromSearch } = Route.useSearch();
  const [tab, setTab] = useState('overview');
  const [addBranchOpen, setAddBranchOpen] = useState(false);

  const { data: org, isLoading: orgLoading, error: orgError } = useOrganization(organizationId);
  /** List all tenants for the org; detail view is scoped to one tenant (from list eye link or org root). */
  const { data: orgTenantsRes, isLoading: orgTenantsLoading } = useTenants(
    { org_id: organizationId },
    { enabled: !!organizationId },
  );
  const orgTenants = orgTenantsRes?.data ?? [];

  const rootTenant = useMemo(
    () => orgTenants.find((t) => t.parent_tenant_id == null) ?? null,
    [orgTenants],
  );

  const contextTenant = useMemo(() => {
    if (tenantIdFromSearch) {
      const selected = orgTenants.find((t) => t.iq_tenant_id === tenantIdFromSearch);
      if (selected) return selected;
    }
    return rootTenant;
  }, [orgTenants, tenantIdFromSearch, rootTenant]);

  const branchTreeRows = useMemo(() => {
    if (!contextTenant) return [];
    return buildDescendantBranchTreeRows(orgTenants, contextTenant.iq_tenant_id);
  }, [orgTenants, contextTenant]);

  const { data: modulesRes, isLoading: modulesCatalogLoading } = useModules(undefined, {
    enabled: !!contextTenant?.iq_tenant_id,
    globalCatalog: true,
    moduleKinds: ['product'],
  });
  const { data: tenantModsRes, isLoading: tenantModsLoading } = useTenantModules(
    contextTenant?.iq_tenant_id ?? '',
    {
      enabled:
        !!contextTenant?.iq_tenant_id &&
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

  const activeModuleNames = useMemo(() => {
    const rows = tenantModsRes?.data ?? [];
    return rows
      .filter((r) => r.is_active && moduleNameById.has(r.module_id))
      .map((r) => moduleNameById.get(r.module_id) ?? r.module_id.slice(0, 8));
  }, [tenantModsRes?.data, moduleNameById]);

  const planSlug = useMemo(() => {
    const meta = org?.metadata as Record<string, unknown> | null | undefined;
    const prov = meta?.provisioning as Record<string, unknown> | undefined;
    const slug = prov?.plan_slug;
    if (slug === 'professional') return 'Professional Plan';
    if (slug === 'starter') return 'Starter Plan';
    return typeof slug === 'string' ? slug : '—';
  }, [org?.metadata]);

  const branchColumns = useMemo<ColumnDef<TenantTreeRow, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const depth = row.original.depth ?? 0;
          return (
            <div style={{ paddingLeft: `${depth * 1.25}rem` }} className="min-w-0">
              <span className="font-medium">{row.original.name}</span>
            </div>
          );
        },
      },
      {
        id: 'record_kind',
        header: 'Record',
        cell: () => (
          <Badge variant="secondary" className="text-xs font-normal">
            Branch
          </Badge>
        ),
      },
      {
        accessorKey: 'branch_code',
        header: 'Code',
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          if (v) return <code className="text-xs">{v}</code>;
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

  const catalogModules = useMemo(
    () => (modulesRes?.data ?? []).filter((mod) => !mod.is_deleted),
    [modulesRes?.data],
  );

  const accessToken = useAuthStore((s) => s.accessToken);
  const canEditTenantModules = isPlatformSuperAdminFromAccessToken(accessToken);

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

  if (!contextTenant) {
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
            Provision a root tenant from the tenant list (Create tenant wizard), or add a root tenant
            row in the database for legacy organisations.
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
            <BreadcrumbPage className="max-w-[12rem] truncate">{contextTenant.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" asChild aria-label="Back to list">
              <Link to="/configurator/tenant">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">{contextTenant.name}</h1>
          </div>
          {contextTenant.parent_tenant_id ? (
            <p className="pl-10 text-xs text-muted-foreground">
              Branch under {org.name}
            </p>
          ) : null}
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
                variant={rootTenant?.provisioning_status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {provisioningLabel(rootTenant?.provisioning_status ?? '')}
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
                    {orgTenantsLoading ? '…' : orgTenants.length}
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
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{rootTenant?.iq_tenant_id.slice(0, 8)}…</code>
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
                    variant={rootTenant?.provisioning_status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {provisioningLabel(rootTenant?.provisioning_status ?? '')}
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
              data={branchTreeRows}
              isLoading={orgTenantsLoading}
              emptyTitle="No branches yet"
              emptyDescription="Use Add branch to create nested branches under this tenant."
            />
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <TenantUsersPanel
            iqTenantId={contextTenant.iq_tenant_id}
            organizationId={org.id}
          />
        </TabsContent>

        <TabsContent value="role-templates" className="mt-4">
          <TenantRoleTemplatesPanel iqTenantId={contextTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="department-templates" className="mt-4">
          <TenantDepartmentsPanel iqTenantId={contextTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <TenantBillingPanel iqTenantId={contextTenant.iq_tenant_id} />
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <TenantModulesPanel
            iqTenantId={contextTenant.iq_tenant_id}
            catalogModules={catalogModules}
            tenantModules={tenantModsRes?.data ?? []}
            isLoading={modulesCatalogLoading || tenantModsLoading}
            canEditModules={canEditTenantModules}
          />
        </TabsContent>

        <TabsContent value="audit-logs" className="mt-4">
          <TenantTabComingSoon
            title="Audit logs"
            body="Immutable audit trails for this tenant are not exposed via master-data. This will link to an audit service when available."
          />
        </TabsContent>
      </Tabs>

      <CreateBranchWizard
        open={addBranchOpen}
        onOpenChange={setAddBranchOpen}
        organizationId={organizationId}
        organizationSlug={org.slug}
        parentTenantId={contextTenant.iq_tenant_id}
        parentTenantName={contextTenant.name}
      />
    </div>
  );
}
