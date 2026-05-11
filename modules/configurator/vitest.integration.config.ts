import { defineConfig } from 'vitest/config';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    environment: 'node',
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@hims/ts-sdk-db': path.join(repoRoot, 'packages/ts-sdk-db/src/index.ts'),
      '@hims/ts-sdk-testing': path.join(repoRoot, 'packages/ts-sdk-testing/src/index.ts'),
      '@hims/ts-sdk-events': path.join(repoRoot, 'packages/ts-sdk-events/src/index.ts'),
      '@hims/ts-sdk-authz': path.join(repoRoot, 'packages/ts-sdk-authz/src/index.ts'),
      '@hims/ts-sdk-identity': path.join(repoRoot, 'packages/ts-sdk-identity/src/index.ts'),
      '@hims/ts-sdk-tenant': path.join(repoRoot, 'packages/ts-sdk-tenant/src/index.ts'),
    },
  },
});
