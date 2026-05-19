import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCapability } from '@/lib/require-capabilities';
import { CFG_SHELL_ACCESS } from '@/lib/runtime-capability-keys';

export const Route = createFileRoute('/_authenticated/configurator')({
  beforeLoad: requireCapability(CFG_SHELL_ACCESS),
  component: () => <Outlet />,
});
