// eslint.config.mjs
import eslint from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'next-env.d.ts',
      'jest.config.js',
      'next.config.js',
      'postcss.config.js',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...nextVitals.rules,
      // Add any custom ESLint rules here
      // Example: 'react/no-unescaped-entities': 'off',
    },
  },
  eslintPluginPrettierRecommended
);
