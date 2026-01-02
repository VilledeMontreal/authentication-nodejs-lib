import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
  recommendedConfig: js.configs.recommended,
});

const nPlugin = (await import('eslint-plugin-n')).default;

export default tseslint.config(
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
  ...compat.extends(
    'airbnb-typescript/base',
    'plugin:import/recommended',
    'plugin:n/recommended',
  ),
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      header: (await import('eslint-plugin-header')).default,
      n: nPlugin,
      node: nPlugin, // alias for compatibility
      jest: (await import('eslint-plugin-jest')).default,
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',

      // Fix airbnb-typescript incompatibility with @typescript-eslint v8
      '@typescript-eslint/lines-between-class-members': 'off',
      '@typescript-eslint/no-throw-literal': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-implied-eval': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/no-loss-of-precision': 'off',
      '@typescript-eslint/no-loop-func': 'off',

      'import/prefer-default-export': 'off',
      'import/named': 'off',
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

      /*
      'header/header': [
        'error',
        'block',
        [
          {
            pattern:
              / * Copyright (c) \d{4} Ville de Montreal. All rights reserved.\n * Licensed under the MIT license.\n * See LICENSE file in the project root for full license information.\n /gm,
            template: `\n * Copyright (c) ${new Date().getFullYear()} Ville de Montreal. All rights reserved.\n * Licensed under the MIT license.\n * See LICENSE file in the project root for full license information.\n `, 
          },
        ],
      ],
      */
    },
  },
  // Prettier must be last
  ...compat.extends('plugin:prettier/recommended', 'prettier'),
);
