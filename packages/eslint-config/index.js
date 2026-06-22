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
      // Gating policy for sonarjs (decision D22). `sonarjs.configs.recommended` is adopted
      // wholesale above; these three rules are intentionally demoted to `warn` so they stay
      // visible without breaking the build:
      //  - todo-tag: TODO/FIXME markers are deliberate signposts in actively-built code
      //    (e.g. the ABHA SDK is mid-implementation); failing CI on them just pressures
      //    devs to delete information rather than track it.
      //  - cognitive-complexity / no-nested-conditional: opinionated refactor-pressure
      //    metrics. Forcing them to zero on a young codebase invites helper-function
      //    indirection purely to satisfy a number — the opposite of our simplicity rule.
      // All security (slow-regex, sql-queries, no-clear-text-protocols, hashing) and
      // cleanliness (unused-import, redundant-type-aliases, …) sonarjs rules stay as errors.
      'sonarjs/todo-tag': 'warn',
      'sonarjs/cognitive-complexity': 'warn',
      'sonarjs/no-nested-conditional': 'warn',
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
