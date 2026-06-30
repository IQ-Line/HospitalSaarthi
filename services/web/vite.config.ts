import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { resolve } from 'node:path';

function parseFormWorkflowBuilderOrigin(env: Record<string, string>): string | null {
  const raw = (env.VITE_FORM_WORKFLOW_BUILDER_URL || '').trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export default defineConfig(({ mode }) => {
  const workspaceRoot = resolve(__dirname, '../..');
  const env = loadEnv(mode, workspaceRoot, '');
  const bffOrigin = (env.VITE_API_BASE_URL ?? 'http://localhost:3100').replace(/\/+$/, '');
  const webPort = Number(env.WEB_DEV_PORT ?? '5180');
  const workflowBackendProxyTarget =
    parseFormWorkflowBuilderOrigin(env) ?? 'http://localhost:5000';

  return {
  envDir: workspaceRoot,
  plugins: [tanstackRouter({ target: 'react' }), react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, './src') },
      // react-router (iq-line-form-builder-renderer) imports { parse } from "cookie";
      // cookie@1.x is CJS-only — Vite cannot re-export named bindings in the browser.
      { find: /^cookie$/, replacement: 'cookie-es' },
      // react-router imports { splitCookiesString } from "set-cookie-parser" (also CJS-only).
      {
        find: /^set-cookie-parser$/,
        replacement: resolve(__dirname, './src/shims/set-cookie-parser.ts'),
      },
      // Exact match only — do not prefix-match `.../shim/with-selector` (TanStack Store).
      {
        find: /^use-sync-external-store\/shim\/index\.js$/,
        replacement: resolve(__dirname, './src/shims/use-sync-external-store-shim.ts'),
      },
      {
        find: /^use-sync-external-store\/shim$/,
        replacement: resolve(__dirname, './src/shims/use-sync-external-store-shim.ts'),
      },
    ],
  },
  optimizeDeps: {
    exclude: ['iq-line-form-builder-renderer'],
    include: ['cookie-es', 'use-sync-external-store/shim/with-selector.js'],
    needsInterop: [
      'use-sync-external-store',
      'use-sync-external-store/shim/with-selector.js',
    ],
  },
  server: {
    fs: {
      allow: [resolve(__dirname, '../..')],
    },
    port: webPort,
    strictPort: true,
    proxy: {
      /**
       * Must use a RegExp context so this wins over the generic `/api` proxy (both match the same URL;
       * `for...in` order is not a safe tie-breaker across environments).
       */
      '^/api/registration/v1': {
        target: process.env.REGISTRATION_PROXY_TARGET ?? 'http://localhost:3006',
        changeOrigin: true,
      },
      '^/api/abdm/v1': {
        target: process.env.ABDM_ADAPTER_PROXY_TARGET ?? 'http://localhost:3007',
        changeOrigin: true,
      },
      '/api': {
        target: bffOrigin,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const browserHost = req.headers.host;
            if (typeof browserHost === 'string' && browserHost.length > 0) {
              proxyReq.setHeader('x-forwarded-host', browserHost);
              proxyReq.setHeader('x-forwarded-proto', 'http');
            }
          });
        },
      },
      '/healthz': {
        target: bffOrigin,
        changeOrigin: true,
      },
      '^/workflow-backend': {
        target: workflowBackendProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  };
});
