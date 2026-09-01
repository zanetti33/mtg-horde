/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mtg-horde/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    // Playwright owns *.spec.ts under e2e/ — without this, Vitest's default glob picks them up
    // too and chokes on Playwright's async test() (see @playwright/test's own single-worker model).
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
}))
