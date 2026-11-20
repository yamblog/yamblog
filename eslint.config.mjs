import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Node.js globals for plain .js/.mjs scripts (TypeScript files get these from
// @types/node, and typescript-eslint turns off no-undef for them).
const nodeGlobals = Object.fromEntries(
  [
    'AbortController',
    'AbortSignal',
    'Buffer',
    'TextDecoder',
    'TextEncoder',
    'URL',
    'URLSearchParams',
    'clearInterval',
    'clearTimeout',
    'console',
    'fetch',
    'global',
    'globalThis',
    'process',
    'queueMicrotask',
    'setInterval',
    'setTimeout',
    'structuredClone',
  ].map((name) => [name, 'readonly']),
);

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'website/**',
      'examples/**',
      '**/*.astro',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
  {
    // Tests may use `any` to build partial fixtures; keep it visible as a
    // warning rather than failing lint.
    files: ['packages/*/test/**', 'scripts/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Type-level tests: values exist only to be checked by the compiler.
    files: ['packages/*/test-d/**'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
);
