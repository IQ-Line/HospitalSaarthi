import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireAnyCapability } from '@/lib/require-capabilities';
import { IH_CONTROL_PLANE_ANY } from '@/lib/runtime-capability-keys';

export const Route = createFileRoute('/_authenticated/integration-hub')({
  beforeLoad: requireAnyCapability(IH_CONTROL_PLANE_ANY),
  component: () => <Outlet />,
});
