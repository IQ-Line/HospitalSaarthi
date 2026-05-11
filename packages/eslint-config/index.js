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
          allow: [],
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
    ignores: ['**/dist/**', '**/node_modules/**', '**/.nx/**'],
  },
];
