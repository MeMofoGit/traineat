import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Evitar cargar firebase-admin / firebase-functions en tests de helpers puros
    // — no inicializamos Admin SDK en los tests.
    globals: false,
  },
});
