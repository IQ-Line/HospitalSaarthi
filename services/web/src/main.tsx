import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { queryClient } from '@/lib/query-client';
import { AppProviders } from '@/app/providers';
import { bootstrapHimsRendererHost } from '@/lib/renderer-host-bootstrap';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';
import { useTenantStore } from '@/stores/tenant.store';
import { registerBuiltinModuleManifests } from '@/platform/modules';
import { routeTree } from './routeTree.gen';
import '@/styles/index.css';

registerBuiltinModuleManifests();

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
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
    bootstrapHimsRendererHost();
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <AppProviders>
          <RouterProvider router={router} />
        </AppProviders>
      </React.StrictMode>,
    );
  });
}
