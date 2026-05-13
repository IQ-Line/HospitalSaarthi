import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { Toaster } from '@/components/toaster';
import type { QueryClient } from '@tanstack/react-query';
import { ensureAuthSession } from '@/lib/auth-session';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    await ensureAuthSession();
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
