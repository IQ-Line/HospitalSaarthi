import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '../..'), '');
  const bffOrigin = (env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

  return {
  plugins: [tanstackRouter({ target: 'react' }), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      /**
       * Must use a RegExp context so this wins over the generic `/api` proxy (both match the same URL;
       * `for...in` order is not a safe tie-breaker across environments).
       */
      '^/api/registration/v1': {
        target: process.env.REGISTRATION_PROXY_TARGET ?? 'http://localhost:3006',
        changeOrigin: true,
      },
      '/api': {
        target: bffOrigin,
        changeOrigin: true,
      },
      '/healthz': {
        target: bffOrigin,
        changeOrigin: true,
      },
    },
  },
  };
});
