import { createRequire } from 'module';
import tseslint from 'typescript-eslint';
const require = createRequire(import.meta.url);

const coreWebVitals = require('eslint-config-next/core-web-vitals');

export default [
  ...coreWebVitals,
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
];
