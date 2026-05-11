import { useState } from 'react';
import { Badge } from '@pulse/ui/badge';
import { Button } from '@pulse/ui/button';
import { Input } from '@pulse/ui/input';
import { Label } from '@pulse/ui/label';
import { useAssignRole, useRevokeRole } from '../api/mutations';
import { useAuthPrincipalSnapshot } from '../api/queries';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RoleAssignmentPanelProps = {
  userId: string;
  sessionUserId: string | null;
  canViewRoles: boolean;
  canAssignRole: boolean;
};

/**
 * Assign/revoke use `POST`/`DELETE /role-assignments` (OpenAPI). Tenant roles are keyed by UUID;
 * the service does not yet expose a list endpoint, so role id is entered explicitly. When viewing
 * your own user row, resolved Cerbos role codes from `GET /auth/principal` are shown for context.
 */
export function RoleAssignmentPanel({
  userId,
  sessionUserId,
  canViewRoles,
  canAssignRole,
}: RoleAssignmentPanelProps) {
  const [assignRoleId, setAssignRoleId] = useState('');
  const [revokeRoleId, setRevokeRoleId] = useState('');
  const assign = useAssignRole();
  const revoke = useRevokeRole();
  const isSelf = Boolean(sessionUserId && sessionUserId === userId);
  const principalQuery = useAuthPrincipalSnapshot(isSelf && canViewRoles);

  if (!canViewRoles) {
    return null;
  }

  const handleAssign = () => {
    const role_id = assignRoleId.trim();
    if (!UUID_RE.test(role_id)) return;
    assign.mutate({ user_id: userId, role_id });
    setAssignRoleId('');
  };

  const handleRevoke = () => {
    const role_id = revokeRoleId.trim();
    if (!UUID_RE.test(role_id)) return;
    revoke.mutate({ user_id: userId, role_id });
    setRevokeRoleId('');
  };

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <div>
        <h3 className="text-lg font-medium">Roles</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Assign or revoke tenant roles by id. Cerbos still enforces `role.assign` / `role.revoke` on
          each call.
        </p>
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
          <Label htmlFor="assign-role-id">Assign role (UUID)</Label>
          <div className="flex gap-2">
            <Input
              id="assign-role-id"
              placeholder="00000000-0000-4000-8000-000000000000"
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value)}
              autoComplete="off"
            />
            <Button type="button" onClick={handleAssign} disabled={assign.isPending}>
              Assign
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-w-md">
        <Label htmlFor="revoke-role-id">Revoke role (UUID)</Label>
        <div className="flex gap-2">
          <Input
            id="revoke-role-id"
            placeholder="00000000-0000-4000-8000-000000000000"
            value={revokeRoleId}
            onChange={(e) => setRevokeRoleId(e.target.value)}
            autoComplete="off"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleRevoke}
            disabled={revoke.isPending}
          >
            Revoke
          </Button>
        </div>
      </div>
    </section>
  );
}
