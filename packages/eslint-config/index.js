import nx from '@nx/eslint-plugin';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';

export const base = [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  sonarjs.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: ['@hims/registration-reports'],
          depConstraints: [
            {
              sourceTag: 'type:module',
              onlyDependOnLibsWithTags: ['type:sdk', 'type:client'],
            },
            {
              sourceTag: 'type:service',
              onlyDependOnLibsWithTags: ['type:module', 'type:sdk', 'type:client'],
            },
            {
              sourceTag: 'type:sdk',
              onlyDependOnLibsWithTags: ['type:sdk'],
            },
            {
              sourceTag: 'type:client',
              onlyDependOnLibsWithTags: [],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:sdk',
                'type:client',
                'type:module',
                'type:ui',
                'npm:private',
              ],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:sdk', 'type:client'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['services/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/um-permissions', '**/permissions-map', '**/capability-resolution'],
              message:
                'Legacy UX permission maps are removed. Use runtime capability keys from @/lib/runtime-capability-keys.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="hasFeaturePermission"]',
          message: 'Use useCapability, CapabilityGate, requireCapability, or requireAnyCapability.',
        },
        {
          selector:
            'VariableDeclarator[id.name=/^can(Read|Write|Create|Update|Delete|Manage|Access|View)/]',
          message:
            'Avoid can* permission booleans. Use useCapability("module:resource:action") or CapabilityGate.',
        },
        {
          selector:
            'FunctionDeclaration[id.name=/^can(Read|Write|Create|Update|Delete|Manage|Access|View)/], FunctionDeclaration[id.name=/^can[A-Z]/]',
          message: 'Avoid can* helper functions. Use runtime capability keys directly.',
        },
      ],
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.nx/**'],
  },
];
