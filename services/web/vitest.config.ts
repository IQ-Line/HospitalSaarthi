import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

import { baseTest } from '../../vitest.base';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@hims/dev-bootstrap': resolve(__dirname, '../../packages/dev-bootstrap/src/index.ts'),
      '@hims/ts-sdk-fhir': resolve(__dirname, '../../packages/ts-sdk-fhir/src/index.ts'),
    },
  },
  test: { ...baseTest },
});
