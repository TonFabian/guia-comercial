import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // A config do app estende `expo/tsconfig.base`, que o transformador do
  // Vite não resolve. Os testes usam uma config própria e equivalente.
  tsconfig: './tsconfig.vitest.json',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
