import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireAnyCapability } from '@/lib/require-capabilities';
import { UM_USER_MANAGEMENT_ANY } from '@/lib/runtime-capability-keys';

export const Route = createFileRoute('/_authenticated/user-management')({
  beforeLoad: requireAnyCapability(UM_USER_MANAGEMENT_ANY),
  component: () => <Outlet />,
});
