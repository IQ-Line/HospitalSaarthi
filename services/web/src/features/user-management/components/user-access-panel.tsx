import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@pulse/ui/button';
import { toast } from 'sonner';
import { CapabilityGate } from '@/components/capability-gate';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useAnyCapability, useCapability } from '@/hooks/use-capability';
import { UM_ROLE_ASSIGN, UM_ROLE_READ } from '@/lib/runtime-capability-keys';
import { ApiError } from '@/lib/api-client';
import { useDetachRoleTemplate } from '../api/mutations';
import { roleListOptions, useUserCapabilities } from '../api/queries';
import type { AppliedRoleTemplate, UserCapabilityGrant } from '../types';
import { AssignRoleDialog } from './assign-role-dialog';
import { ManageRolePermissionsDialog } from './manage-role-permissions-dialog';
import { UserManagementSectionCard } from './user-management-section-card';

type UserAccessPanelProps = {
  userId: string;
  /** Hospital tenant when opened from the platform-wide user list. */
  tenantScope?: string;
};

function mutationErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body?.trim();
    if (body) return body.length > 280 ? `${body.slice(0, 280)}...` : body;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

function grantsForRole(grants: UserCapabilityGrant[], roleId: string): string[] {
  return grants
    .filter((grant) => grant.source_role_id === roleId && grant.revoked_at === null)
    .map((grant) => grant.capability_id);
}

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
    staleTime: 30_000,
  });
  const capabilitiesSnapshotQuery = useUserCapabilities(userId, true, tenantScope);
  const detachRole = useDetachRoleTemplate(userId, tenantScope);

  const [assignOpen, setAssignOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppliedRoleTemplate | null>(null);
  const [detachCandidate, setDetachCandidate] = useState<AppliedRoleTemplate | null>(null);

  const activeRoles = (rolesQuery.data ?? []).filter((role) => role.status === 'active');
  const appliedRoleIds = new Set(
    (capabilitiesSnapshotQuery.data?.role_templates ?? []).map((template) => template.role_id),
  );
  const availableRoles = activeRoles.filter((role) => !appliedRoleIds.has(role.id));
  const copiedGrants = capabilitiesSnapshotQuery.data?.copied_grants ?? [];
  const appliedRoles = capabilitiesSnapshotQuery.data?.role_templates ?? [];

  const handleDetachRole = () => {
    if (!detachCandidate) return;
    detachRole.mutate(detachCandidate.role_id, {
      onSuccess: () => {
        toast.success(`Removed ${detachCandidate.role.display_name}`);
        setDetachCandidate(null);
      },
      onError: (error) => {
        toast.error(mutationErrorMessage(error));
      },
    });
  };

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
              const grantedCount = grantsForRole(copiedGrants, applied.role_id).length;
              return (
                <li
                  key={applied.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{applied.role.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {grantedCount === 0
                        ? 'No permissions active yet'
                        : `${grantedCount} permission${grantedCount === 1 ? '' : 's'} active`}
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
                    <CapabilityGate capability={UM_ROLE_ASSIGN}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetachCandidate(applied)}
                      >
                        Remove
                      </Button>
                    </CapabilityGate>
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
        grantedCapabilityIds={
          editingRole ? grantsForRole(copiedGrants, editingRole.role_id) : []
        }
      />

      <ConfirmDialog
        open={detachCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setDetachCandidate(null);
        }}
        title="Remove this role?"
        description={
          detachCandidate
            ? `${detachCandidate.role.display_name} will be removed and its permissions will be taken away.`
            : ''
        }
        confirmLabel={detachRole.isPending ? 'Removing...' : 'Remove role'}
        destructive
        onConfirm={handleDetachRole}
      />
    </>
  );
}
