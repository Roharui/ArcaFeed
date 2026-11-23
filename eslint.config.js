import { createRequire } from 'node:module';

const requireFromApp = createRequire(
  new URL('./ArcaFeed/package.json', import.meta.url),
);
const tseslint = requireFromApp('typescript-eslint');
const eslintConfigPrettier = requireFromApp('eslint-config-prettier');

export default tseslint.config(
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      semi: 'error',
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: [
      'webpack.config.js',
      '**/dist/**',
      '**/.cache/**',
      '**/.playwright-mcp/**',
      '**/node_modules/**',
    ],
  },
);
