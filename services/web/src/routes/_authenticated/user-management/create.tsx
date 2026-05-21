import { createFileRoute, redirect } from '@tanstack/react-router';
import { requireAnyCapability } from '@/lib/require-capabilities';
import { UM_USER_WRITE_ANY } from '@/lib/runtime-capability-keys';

export const Route = createFileRoute('/_authenticated/user-management/create')({
  beforeLoad: () => {
    requireAnyCapability(UM_USER_WRITE_ANY)();
    throw redirect({
      to: '/user-management',
      search: { q: '', createUser: true },
    });
  },
});
