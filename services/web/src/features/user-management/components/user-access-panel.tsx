import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@pulse/ui/button';
import { CapabilityGate } from '@/components/capability-gate';
import { useAnyCapability, useCapability } from '@/hooks/use-capability';
import { UM_ROLE_ASSIGN, UM_ROLE_READ } from '@/lib/runtime-capability-keys';
import { roleListOptions, useUserCapabilities } from '../api/queries';
import type { AppliedRoleTemplate } from '../types';
import { AssignRoleDialog } from './assign-role-dialog';
import { ManageRolePermissionsDialog } from './manage-role-permissions-dialog';
import { UserManagementSectionCard } from './user-management-section-card';

type UserAccessPanelProps = {
  userId: string;
  /** Hospital tenant when opened from the platform-wide user list. */
  tenantScope?: string;
};

// ADR-0037: role capabilities are resolved live from the role's composition — they are no longer
// copied per-user, so there is no per-user "granted subset" to read back from the capabilities
// snapshot. The permission picker below reflects the role's own composition; narrowing a single
// user below their role (deny overrides via PUT /users/{id}/capabilities) is a follow-up UI.

export function UserAccessPanel({ userId, tenantScope }: UserAccessPanelProps) {
  const umRoleRead = useCapability(UM_ROLE_READ);
  const umRoleAssign = useCapability(UM_ROLE_ASSIGN);
  const showPanel = useAnyCapability([UM_ROLE_READ, UM_ROLE_ASSIGN]);

  if (!showPanel) {
    return null;
  }

  const rolesQuery = useQuery({
    ...roleListOptions(tenantScope),
    enabled: umRoleRead,
  });
  const capabilitiesSnapshotQuery = useUserCapabilities(userId, true, tenantScope);

  const [assignOpen, setAssignOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppliedRoleTemplate | null>(null);

  const activeRoles = (rolesQuery.data ?? []).filter((role) => role.status === 'active');
  const appliedRoleIds = new Set(
    (capabilitiesSnapshotQuery.data?.role_templates ?? []).map((template) => template.role_id),
  );
  const availableRoles = activeRoles.filter((role) => !appliedRoleIds.has(role.id));
  const appliedRoles = capabilitiesSnapshotQuery.data?.role_templates ?? [];

  return (
    <>
      <UserManagementSectionCard
        title="Roles & access"
        description="What this person can do in the system, based on their assigned roles."
        contentClassName="space-y-4"
        actions={
          <CapabilityGate capability={UM_ROLE_READ}>
            <CapabilityGate capability={UM_ROLE_ASSIGN}>
              <Button type="button" size="sm" onClick={() => setAssignOpen(true)}>
                Add role
              </Button>
            </CapabilityGate>
          </CapabilityGate>
        }
      >
        {capabilitiesSnapshotQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : capabilitiesSnapshotQuery.isError ? (
          <p className="text-sm text-destructive">Could not load roles. Try again.</p>
        ) : appliedRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No roles assigned yet.
            <CapabilityGate capability={UM_ROLE_ASSIGN}>
              <span> Use Add role to get started.</span>
            </CapabilityGate>
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {appliedRoles.map((applied) => {
              return (
                <li
                  key={applied.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{applied.role.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Grants this role&apos;s permissions.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingRole(applied)}
                    >
                      {umRoleAssign ? 'Change access' : 'View access'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </UserManagementSectionCard>

      <AssignRoleDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        userId={userId}
        availableRoles={availableRoles}
        tenantScope={tenantScope}
      />

      <ManageRolePermissionsDialog
        open={editingRole !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRole(null);
        }}
        userId={userId}
        tenantScope={tenantScope}
        applied={editingRole}
        grantedCapabilityIds={[]}
      />
    </>
  );
}
