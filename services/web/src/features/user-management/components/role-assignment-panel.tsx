import { useState } from 'react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Label } from '@pulse/ui/label';
import { useAssignRole, useRevokeRole } from '../api/mutations';
import { useAuthPrincipalSnapshot, useRoleAssignments, useRolesSuspense } from '../api/queries';

type RoleAssignmentPanelProps = {
  userId: string;
  sessionUserId: string | null;
  canViewRoles: boolean;
  canAssignRole: boolean;
};

/**
 * Assign/revoke use `POST`/`DELETE /role-assignments` (OpenAPI). The available tenant roles come from
 * `GET /roles`, and assigned role ids come from `GET /role-assignments?user_id=...`.
 */
export function RoleAssignmentPanel({
  userId,
  sessionUserId,
  canViewRoles,
  canAssignRole,
}: RoleAssignmentPanelProps) {
  const { data: roles } = useRolesSuspense();
  const assignmentsQuery = useRoleAssignments({ userId });
  const [assignRoleId, setAssignRoleId] = useState('');
  const assign = useAssignRole();
  const revoke = useRevokeRole();
  const isSelf = Boolean(sessionUserId && sessionUserId === userId);
  const principalQuery = useAuthPrincipalSnapshot(isSelf && canViewRoles);
  const assignedRoleIds = new Set((assignmentsQuery.data ?? []).map((assignment) => assignment.role_id));
  const assignedRoles = roles.filter((role) => assignedRoleIds.has(role.id));
  const availableRoles = roles.filter((role) => role.status === 'active');

  if (!canViewRoles) {
    return null;
  }

  const handleAssign = () => {
    const role_id = assignRoleId.trim();
    if (!role_id) return;
    assign.mutate({ user_id: userId, role_id });
    setAssignRoleId('');
  };

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <div>
        <h3 className="text-lg font-medium">Roles</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Assign or revoke tenant roles. Cerbos still enforces role and capability administration on
          each call.
        </p>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Assigned roles</p>
        {assignedRoles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assignedRoles.map((role) => (
              <div key={role.id} className="flex items-center gap-2 rounded-md border px-2 py-1">
                <Badge variant="secondary">{role.display_name}</Badge>
                <code className="text-xs">{role.code}</code>
                {canAssignRole ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke.mutate({ user_id: userId, role_id: role.id })}
                    disabled={revoke.isPending}
                  >
                    Revoke
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No roles are currently assigned.</p>
        )}
      </div>

      {isSelf && principalQuery.data?.roles && principalQuery.data.roles.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Your resolved role codes (this session)</p>
          <div className="flex flex-wrap gap-2">
            {principalQuery.data.roles.map((code) => (
              <Badge key={code} variant="secondary">
                {code}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {canAssignRole && (
        <div className="space-y-2 max-w-md">
          <Label htmlFor="assign-role-id">Assign role</Label>
          <div className="flex gap-2">
            <select
              id="assign-role-id"
              className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value)}
            >
              <option value="">Select a role</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.display_name} ({role.code})
                </option>
              ))}
            </select>
            <Button type="button" onClick={handleAssign} disabled={assign.isPending}>
              Assign
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
