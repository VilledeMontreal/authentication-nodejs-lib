module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  plugins: ['@typescript-eslint', 'header', 'node', 'jest'],
  extends: [
    'airbnb-typescript/base',
    'prettier/@typescript-eslint', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
    'plugin:node/recommended',
    // 'plugin:jest/recommended',
  ],
  env: {
    'jest/globals': true,
  },
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    // e.g. "@typescript-eslint/explicit-function-return-type": "off",
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': 'off', // Triggered with function parameters not used. Note that typescript compiler will take care of this when local vars are not used.
    '@typescript-eslint/no-use-before-define': 'off',
    'import/prefer-default-export': 'off',
    'no-restricted-syntax': 'off',
    'class-methods-use-this': 'off',
    'no-await-in-loop': 'off',
    'node/no-deprecated-api': ['warn'],
    'node/no-unsupported-features/es-syntax': 'off',
    'node/exports-style': ['error', 'module.exports'],
    'node/file-extension-in-import': 'off',
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': 'off',
    'node/prefer-global/buffer': ['error', 'always'],
    'node/prefer-global/console': ['error', 'always'],
    'node/prefer-global/process': ['error', 'always'],
    'node/prefer-global/url-search-params': ['error', 'always'],
    'node/prefer-global/url': ['error', 'always'],
    'node/prefer-promises/dns': 'error',
    'node/prefer-promises/fs': 'error',
    'header/header': [
      2,
      'block',
      [
        {
          pattern: / \* Copyright \(c\) \d{4} Ville de Montreal\. All rights reserved\.[\r\n]+ \* Licensed under the MIT license\.[\r\n]+ \* See LICENSE file in the project root for full license information\.[\r\n]+/gm,
          template: `\n * Copyright (c) ${new Date().getFullYear()} Ville de Montreal. All rights reserved.\n * Licensed under the MIT license.\n * See LICENSE file in the project root for full license information.\n `,
        },
      ],
    ],
  },
};
