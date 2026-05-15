import { createFileRoute, redirect } from '@tanstack/react-router';
import { usePermissionsStore } from '@/stores/permissions.store';

const UM = 'user-management';

export const Route = createFileRoute('/_authenticated/user-management/create')({
  beforeLoad: () => {
    if (!usePermissionsStore.getState().hasFeaturePermission(UM, 'users', 'write')) {
      throw redirect({ to: '/dashboard' });
    }
    throw redirect({
      to: '/user-management',
      search: { q: '', createUser: true },
    });
  },
});
