import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setupTests.js'],
    include: ['tests/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8', // use v8 provider via @vitest/coverage-v8 (match vitest version)
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      all: true,
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/main.jsx', 'src/index.css', 'tests/**', 'node_modules/**']
    }
  }
})
