import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@prokom-dev/config': path.resolve(__dirname, 'packages/config/src/index.ts'),
      '@prokom-dev/status': path.resolve(__dirname, 'packages/status/src/index.ts'),
      '@prokom-dev/plugins': path.resolve(__dirname, 'packages/plugins/src/index.ts'),
      '@prokom-dev/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
    },
  },
});
