import { test, expect } from '@playwright/test'

test('starting a new game from a preset deck reaches the game board', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'New game' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bot deck' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Game settings' })).toBeVisible()

  // A fresh browser context (no localStorage) already defaults to the first preset (Zombie) —
  // see loadInitialState in AppContext.tsx — so Dinosaurs starts out as "Load", not active yet.
  const dinosaurPreset = page.getByTestId('preset-Dinosaurs')
  await dinosaurPreset.getByRole('button', { name: 'Load' }).click()
  await expect(dinosaurPreset.getByRole('button', { name: 'Active ✓' })).toBeVisible()

  await expect(page.getByRole('button', { name: 'Start game' })).toBeEnabled()
  await page.getByRole('button', { name: 'Start game' }).click()

  await expect(page.getByRole('button', { name: 'Play bot turn' })).toBeVisible()
  await expect(page.getByText(/^Bot board \(\d+\)/)).toBeVisible()
})
