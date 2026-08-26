import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      'sanity:client': fileURLToPath(new URL('./tests/mocks/sanity-client.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      reporter: ['text', 'json-summary'],
      include: ['src/lib/**/*.ts', 'shared/**/*.ts'],
      exclude: ['src/lib/groq.ts'],
      thresholds: {
        branches: 55,
        functions: 80,
        lines: 70,
        statements: 65,
      },
    },
  },
});
