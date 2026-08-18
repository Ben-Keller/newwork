import { defineConfig } from 'vitest/config';

export default defineConfig({
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
