/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mtg-horde/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
}))
