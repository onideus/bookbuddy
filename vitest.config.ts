import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/e2e/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,playwright}.config.*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '.next/',
        'tests/',
        '*.config.ts',
        '*.config.js',
        'types/',
        'ios/',
        'docs/',
      ],
      thresholds: {
        // Domain layer should have high coverage (critical business logic)
        'domain/**/*.{ts,tsx}': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        // Application layer should have high coverage (use cases)
        'application/**/*.{ts,tsx}': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Infrastructure layer should have good coverage
        'infrastructure/**/*.{ts,tsx}': {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75
        },
        // Components should have reasonable coverage
        'components/**/*.{ts,tsx}': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    globals: true,
    css: true,
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/domain': path.resolve(__dirname, './domain'),
      '@/application': path.resolve(__dirname, './application'),
      '@/infrastructure': path.resolve(__dirname, './infrastructure'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/app': path.resolve(__dirname, './app'),
      '@/types': path.resolve(__dirname, './types'),
    },
  },
});
