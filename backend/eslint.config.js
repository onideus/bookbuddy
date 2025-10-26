export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        exports: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      // Possible Errors
      'no-console': 'off', // Allow console in Node.js
      'no-debugger': 'warn',
      'no-extra-semi': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // Best Practices
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',

      // Style
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'arrow-parens': ['error', 'always'],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        // Vitest globals
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
  },
];
