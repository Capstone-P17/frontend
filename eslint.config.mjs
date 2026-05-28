import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

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
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
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
    files: ['next-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    files: ['src/components/**/*.tsx', 'src/app/**/client*.tsx', 'src/app/**/*Client.tsx'],
    ...serverImportBoundary,
  },
];

export default config;
