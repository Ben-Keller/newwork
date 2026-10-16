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
      exclude: [
        'src/lib/groq.ts',
        // The WebGL runtime is exercised by Playwright in a real browser, while
        // the asset module is a declarative media catalog with no unit behavior.
        'src/lib/reel/engine.ts',
        'src/lib/reel/reel-assets.ts',
      ],
      thresholds: {
        branches: 55,
        functions: 80,
        lines: 70,
        statements: 65,
      },
    },
  },
});
