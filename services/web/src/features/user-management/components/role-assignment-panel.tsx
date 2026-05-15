import { UserAccessPanel } from './user-access-panel';

type RoleAssignmentPanelProps = {
  userId: string;
  sessionUserId: string | null;
  canViewRoles: boolean;
  canAssignRole: boolean;
};

export function RoleAssignmentPanel({
  userId,
  sessionUserId,
  canViewRoles,
  canAssignRole,
}: RoleAssignmentPanelProps) {
  return (
    <UserAccessPanel
      userId={userId}
      sessionUserId={sessionUserId}
      canReadRoleTemplates={canViewRoles}
      canReadCapabilities={true}
      canManageAccess={canAssignRole}
    />
  );
}
