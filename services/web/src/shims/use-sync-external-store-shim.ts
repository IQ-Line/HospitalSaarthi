/**
 * Radix `react-use-is-hydrated` imports a named export from `use-sync-external-store/shim`,
 * which is CJS-only (`module.exports`). Vite cannot load that as ESM.
 * React 19 includes `useSyncExternalStore` — re-export it for the alias in vite.config.ts.
 */
export { useSyncExternalStore } from 'react';
