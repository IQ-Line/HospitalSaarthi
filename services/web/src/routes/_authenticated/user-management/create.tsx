import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { Button } from '@pulse/ui/button';
import { PageHeader } from '@/components/page-header';
import { CreateUserForm } from '@/features/user-management/components/create-user-form';
import { usePermissionsStore } from '@/stores/permissions.store';

const UM = 'user-management';

export const Route = createFileRoute('/_authenticated/user-management/create')({
  beforeLoad: () => {
    if (!usePermissionsStore.getState().hasFeaturePermission(UM, 'users', 'write')) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: CreateUserPage,
});

function CreateUserPage() {
  const canReadRoles = usePermissionsStore((s) => s.hasFeaturePermission(UM, 'roles', 'read'));
  const canAssignRoles = usePermissionsStore(
    (s) =>
      s.hasFeaturePermission(UM, 'roles', 'read') &&
      s.hasFeaturePermission(UM, 'roleAssignments', 'write'),
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Create user"
        description="Creates the tenant-scoped user, provisions the current login account, and assigns initial access roles."
        actions={
          <Button variant="outline" asChild>
            <Link to="/user-management" search={{ q: '' }}>
              Back to list
            </Link>
          </Button>
        }
      />
      <CreateUserForm canReadRoles={canReadRoles} canAssignRoles={canAssignRoles} />
    </div>
  );
}
