import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@pulse/ui/alert';
import { Button } from '@pulse/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@pulse/ui/dialog';
import { Input } from '@pulse/ui/input';
import { CapabilityGate } from '@/components/capability-gate';
import { useCapability } from '@/hooks/use-capability';
import { isPlatformSuperAdminFromAccessToken } from '@/lib/platform-admin';
import {
  UM_CAPABILITY_READ,
  UM_ROLE_READ,
  UM_ROLES_ADMIN_ANY,
  UM_USER_CREATE,
  UM_USER_READ,
  UM_USERS_SECTION_ANY,
} from '@/lib/runtime-capability-keys';
import {
  flattenPlatformDirectoryUsers,
  platformDirectoryQueryOptions,
  platformDirectoryTenantErrors,
} from '@/features/user-management/api/platform-directory';
import {
  capabilityListOptions,
  roleListOptions,
  userListOptions,
  useUserListSuspense,
} from '@/features/user-management/api/queries';
import { CreateUserForm } from '@/features/user-management/components/create-user-form';
import { UserListTable } from '@/features/user-management/components/user-list-table';
import { UserManagementPageShell } from '@/features/user-management/components/user-management-page-shell';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';
import { globalModulesCatalogQueryOptions } from '@/features/master-data/api';

export const Route = createFileRoute('/_authenticated/user-management/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
    createUser: search.createUser === true || search.createUser === 'true',
  }),
  beforeLoad: () => {
    const p = usePermissionsStore.getState();
    if (!p.hasAnyCapability(UM_USERS_SECTION_ANY)) {
      if (p.hasAnyCapability(UM_ROLES_ADMIN_ANY)) {
        throw redirect({ to: '/user-management/roles' });
      }
      throw redirect({ to: '/dashboard' });
    }
  },
  /** Do not key the loader on `createUser` — opening Add user must not refetch the whole page. */
  loaderDeps: () => ({}),
  loader: async ({ context }) => {
    const p = usePermissionsStore.getState();
    const tenantScope = useTenantStore.getState().tenantId;
    const isSuperAdmin = isPlatformSuperAdminFromAccessToken(
      useAuthStore.getState().accessToken,
    );
    const loads: Array<Promise<unknown>> = [];
    if (p.hasCapability(UM_USER_READ)) {
      if (isSuperAdmin) {
        loads.push(context.queryClient.ensureQueryData(platformDirectoryQueryOptions()));
      } else {
        loads.push(context.queryClient.ensureQueryData(userListOptions(tenantScope)));
      }
    }
    if (p.hasCapability(UM_ROLE_READ)) {
      loads.push(context.queryClient.ensureQueryData(roleListOptions(tenantScope)));
      loads.push(context.queryClient.ensureQueryData(globalModulesCatalogQueryOptions()));
    }
    if (p.hasCapability(UM_CAPABILITY_READ)) {
      loads.push(context.queryClient.ensureQueryData(capabilityListOptions()));
    }
    await Promise.all(loads);
  },
  component: UserManagementIndexPage,
});

function UserManagementIndexPage() {
  const umUserRead = useCapability(UM_USER_READ);
  if (!umUserRead) {
    return <CreateUserOnlyPage />;
  }
  return <UserManagementListPage />;
}

function CreateUserOnlyPage() {
  const [createOpen, setCreateOpen] = useState(true);
  const canSelectTargetTenant = isPlatformSuperAdminFromAccessToken(
    useAuthStore.getState().accessToken,
  );

  return (
    <>
      <UserManagementPageShell
        section="users"
        title="Add a user"
        description="Create a new account for someone in your organization."
        actions={
          <CapabilityGate capability={UM_USER_CREATE}>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Add user
            </Button>
          </CapabilityGate>
        }
      >
        <p className="text-sm text-muted-foreground">
          You can add users but not browse the full list.
        </p>
      </UserManagementPageShell>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="flex max-h-[min(88dvh,960px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
          <div className="shrink-0 border-b p-4 pb-3">
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
              <DialogDescription>
                Enter their details and choose a role. You can pick which permissions they get.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden p-4">
            {createOpen ? (
              <CreateUserForm
                canSelectTargetTenant={canSelectTargetTenant}
                layout="dialog"
                onCancel={() => setCreateOpen(false)}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserManagementListPage() {
  const isPlatformSuperAdmin = isPlatformSuperAdminFromAccessToken(
    useAuthStore((s) => s.accessToken),
  );
  if (isPlatformSuperAdmin) {
    return <PlatformSuperAdminUserListPage />;
  }
  return <TenantScopedUserListPage />;
}

function filterUserRows<
  T extends { full_name: string; email?: string | null; username?: string | null },
>(rows: T[], q: string, extraFields?: (row: T) => (string | null | undefined)[]): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => {
    const values = [row.full_name, row.email, row.username, ...(extraFields?.(row) ?? [])];
    return values.some((v) => (v ?? '').toLowerCase().includes(needle));
  });
}

function TenantScopedUserListPage() {
  const { q, createUser: createUserSearch } = Route.useSearch();
  const navigate = useNavigate();
  const { data: users } = useUserListSuspense();
  const umUserRead = useCapability(UM_USER_READ);
  const filtered = useMemo(() => filterUserRows(users, q), [users, q]);
  const [createOpen, setCreateOpen] = useState(createUserSearch);

  useEffect(() => {
    if (createUserSearch) setCreateOpen(true);
  }, [createUserSearch]);

  const setCreateUserOpen = (open: boolean) => {
    setCreateOpen(open);
    void navigate({
      to: '/user-management',
      search: { q, ...(open ? { createUser: true } : {}) },
      replace: true,
    });
  };

  return (
    <>
      <UserManagementPageShell
        section="users"
        title="People"
        description="Find someone, open their profile, or add a new user."
        actions={
          <CapabilityGate capability={UM_USER_CREATE}>
            <Button type="button" onClick={() => setCreateUserOpen(true)}>
              Add user
            </Button>
          </CapabilityGate>
        }
      >
        <UserListPageBody
          crossTenant={false}
          q={q}
          filtered={filtered}
          onSearchChange={(value) =>
            void navigate({
              to: '/user-management',
              search: { q: value, ...(createOpen ? { createUser: true } : {}) },
            })
          }
        />
      </UserManagementPageShell>
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateUserOpen}
        canSelectTargetTenant={false}
        navigateToProfileOnSuccess={umUserRead}
      />
    </>
  );
}

function PlatformSuperAdminUserListPage() {
  const { q, createUser: createUserSearch } = Route.useSearch();
  const navigate = useNavigate();
  const { data: directorySnapshot } = useSuspenseQuery(platformDirectoryQueryOptions());
  const umUserRead = useCapability(UM_USER_READ);
  const users = flattenPlatformDirectoryUsers(directorySnapshot);
  const tenantErrors = platformDirectoryTenantErrors(directorySnapshot);
  const filtered = useMemo(
    () =>
      filterUserRows(users, q, (row) => [
        row.tenant_name,
        row.tenant_slug,
        row.organization_name,
      ]),
    [users, q],
  );
  const [createOpen, setCreateOpen] = useState(createUserSearch);

  useEffect(() => {
    if (createUserSearch) setCreateOpen(true);
  }, [createUserSearch]);

  const setCreateUserOpen = (open: boolean) => {
    setCreateOpen(open);
    void navigate({
      to: '/user-management',
      search: { q, ...(open ? { createUser: true } : {}) },
      replace: true,
    });
  };

  return (
    <>
      <UserManagementPageShell
        section="users"
        title="People"
        description="All users across hospital tenants. Open a profile or add someone to a tenant."
        actions={
          <CapabilityGate capability={UM_USER_CREATE}>
            <Button type="button" onClick={() => setCreateUserOpen(true)}>
              Add user
            </Button>
          </CapabilityGate>
        }
      >
        <UserListPageBody
          crossTenant
          q={q}
          filtered={filtered}
          tenantCount={directorySnapshot.tenants.length}
          totalUsers={users.length}
          tenantErrors={tenantErrors}
          onSearchChange={(value) =>
            void navigate({
              to: '/user-management',
              search: { q: value, ...(createOpen ? { createUser: true } : {}) },
            })
          }
        />
      </UserManagementPageShell>
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateUserOpen}
        canSelectTargetTenant
        navigateToProfileOnSuccess={umUserRead}
      />
    </>
  );
}

function UserListPageBody({
  crossTenant,
  q,
  filtered,
  tenantCount,
  totalUsers,
  tenantErrors = [],
  onSearchChange,
}: {
  crossTenant: boolean;
  q: string;
  filtered: Parameters<typeof UserListTable>[0]['data'];
  tenantCount?: number;
  totalUsers?: number;
  tenantErrors?: string[];
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex max-w-md items-center gap-2">
        <Input
          placeholder={
            crossTenant
              ? 'Search name, email, hospital, organization...'
              : 'Search by name or email...'
          }
          value={q}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
        />
      </div>
      {crossTenant && tenantCount != null && totalUsers != null ? (
        <p className="text-sm text-muted-foreground">
          {tenantCount} hospital tenant{tenantCount === 1 ? '' : 's'} · {totalUsers} users
        </p>
      ) : null}
      {tenantErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Some tenants could not be loaded</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {tenantErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      <UserListTable
        crossTenant={crossTenant}
        data={filtered}
        emptyTitle="No users"
        emptyDescription={q.trim() ? 'No one matches your search.' : 'No users to show yet.'}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  canSelectTargetTenant,
  navigateToProfileOnSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canSelectTargetTenant: boolean;
  navigateToProfileOnSuccess: boolean;
}) {
  return (
    <CapabilityGate capability={UM_USER_CREATE}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(88dvh,960px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
          <div className="shrink-0 border-b p-4 pb-3">
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
              <DialogDescription>
                Enter their details and choose a role. You can pick which permissions they get.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden p-4">
            {open ? (
              <CreateUserForm
                canSelectTargetTenant={canSelectTargetTenant}
                layout="dialog"
                navigateToProfileOnSuccess={navigateToProfileOnSuccess}
                onCancel={() => onOpenChange(false)}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </CapabilityGate>
  );
}
