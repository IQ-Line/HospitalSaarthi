import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireCapability } from '@/lib/require-capabilities';
import { MD_VISITPAD_VIEW } from '@/lib/runtime-capability-keys';

export const Route = createFileRoute('/_authenticated/visitpad')({
  beforeLoad: requireCapability(MD_VISITPAD_VIEW),
  component: () => <Outlet />,
});
