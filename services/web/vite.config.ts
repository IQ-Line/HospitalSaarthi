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
