import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCapability } from '@/lib/require-capabilities';
import { MD_SHELL_ACCESS } from '@/lib/runtime-capability-keys';

export const Route = createFileRoute('/_authenticated/master-data')({
  beforeLoad: requireCapability(MD_SHELL_ACCESS),
  component: () => <Outlet />,
});
