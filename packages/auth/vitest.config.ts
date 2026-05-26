import { defineConfig } from 'vitest/config'

/**
 * Plain-node test surface. Tests run against the access-control taxonomy
 * (pure functions over the `statement` + role definitions) without booting
 * better-auth or hitting a database — that's verified at the consumer
 * layer (menu) with PGLite, not here.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 5_000,
  },
})
