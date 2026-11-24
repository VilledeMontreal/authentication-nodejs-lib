import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import nPlugin from 'eslint-plugin-n';
import { createNodeResolver, importX } from 'eslint-plugin-import-x';
import jestPlugin from 'eslint-plugin-jest';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/dist/**',
      '**/output/**',
      '**/coverage/**',
      'testApp/**',
      '**/.*.js',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.prettierrc.js',
      'scripts/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  importX.flatConfigs.recommended,
  nPlugin.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      jest: jestPlugin,
    },
    settings: {
      'import-x/resolver-next': [
        createNodeResolver({
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'],
        }),
      ],
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',

      'import-x/prefer-default-export': 'off',
      'import-x/named': 'off',
      'import-x/no-unresolved': 'off',
      'no-restricted-syntax': 'off',
      'class-methods-use-this': 'off',
      'no-await-in-loop': 'off',
      'n/no-deprecated-api': ['warn'],
      'n/no-unsupported-features/es-syntax': 'off',
      'n/exports-style': ['error', 'module.exports'],
      'n/file-extension-in-import': 'off',
      'n/no-missing-import': 'off',
      'n/no-unpublished-import': 'off',
      'n/no-unpublished-require': 'off', // Lots of these in tests
      'n/prefer-global/buffer': ['error', 'always'],
      'n/prefer-global/console': ['error', 'always'],
      'n/prefer-global/process': ['error', 'always'],
      'n/prefer-global/url-search-params': ['error', 'always'],
      'n/prefer-global/url': ['error', 'always'],
      'n/prefer-promises/dns': 'error',
      'n/prefer-promises/fs': 'error',
    },
  },
  // Prettier must be last
  eslintPluginPrettierRecommended,
);
