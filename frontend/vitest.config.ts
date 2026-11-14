import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'e2e/',
        'src/test/',
        'src/mocks/',
        'src/components/ui/',
        'src/types/',
        'src/main.tsx',
        'src/routeTree.gen.tsx',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.mock.ts',
        '**/*.test.{ts,tsx}',
      ],
      // Piso de cobertura medido en noviembre de 2026. Subir solo cuando
      // la cobertura real mejore; nunca bajar para destrabar un PR.
      thresholds: {
        statements: 41,
        branches: 39,
        functions: 40,
        lines: 42,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
