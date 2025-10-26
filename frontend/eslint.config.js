export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'playwright-report/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        HTMLElement: 'readonly',
        CustomEvent: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
      },
    },
    rules: {
      // Possible Errors
      'no-console': 'warn', // Warn on console in browser code
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
