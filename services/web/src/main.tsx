import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';
import { routeTree } from './routeTree.gen';
import '@/styles/index.css';

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  /** Avoid immediate refetch after preload (0 = stale instantly → duplicate GETs on intent hover). */
  defaultPreloadStaleTime: 30_000,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('app')!;

async function rehydrateDevPersistedStores() {
  if (!import.meta.env.DEV) return;
  const stores = [useAuthStore, useTenantStore, usePermissionsStore];
  await Promise.all(
    stores.map((store) => {
      if ('persist' in store && typeof store.persist.rehydrate === 'function') {
        return store.persist.rehydrate();
      }
      return Promise.resolve();
    }),
  );
}

if (!rootElement.innerHTML) {
  void rehydrateDevPersistedStores().then(() => {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </React.StrictMode>,
    );
  });
}
