import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const serverImportBoundary = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/lib/server/*', '../lib/server/*', '../../lib/server/*'],
            message: 'Client-facing modules must not import server-only backend code. Use Route Handlers or Server Components.',
          },
        ],
      },
    ],
  },
};

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: ['.next/**', 'node_modules/**', 'venv/**', '.venv/**', 'uv.lock'],
  },
  {
    files: ['src/**/*.tsx', 'src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/components/**/*.tsx', 'src/app/**/client*.tsx', 'src/app/**/*Client.tsx'],
    ...serverImportBoundary,
  },
];

export default config;
