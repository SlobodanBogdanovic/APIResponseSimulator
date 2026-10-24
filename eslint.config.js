import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'blob-report/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/content/interceptor.ts'],
    rules: {
      // Method and URL are stored on the native XHR instance. A typed subclass
      // fights Chrome's XHR property descriptors. See AGENTS.md.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        console: 'readonly',
      },
    },
  },
  {
    files: ['e2e/**/*.ts'],
    rules: {
      // Playwright fixtures use an empty first argument when they replace context.
      'no-empty-pattern': 'off',
    },
  },
)
