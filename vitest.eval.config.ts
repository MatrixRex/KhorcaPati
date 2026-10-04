import { defineConfig } from 'vitest/config';
import path from 'path';

/** Slow, model-backed evaluations (`pnpm offline:eval`); kept out of the normal `pnpm test` run. */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    include: ['scripts/**/*.eval.ts'],
    environment: 'node',
    testTimeout: 600_000,
  },
});
