import { test, expect } from '@playwright/test'

test('unlocking a locked preset and editing a card persists the change', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('/')
  // Dinosaurs, not Zombie: a fresh context already defaults to the Zombie preset (see
  // loadInitialState in AppContext.tsx), which would already show "Active ✓" instead of "Load".
  await page.getByTestId('preset-Dinosaurs').getByRole('button', { name: 'Load' }).click()

  await page.getByRole('button', { name: /^Bot deck/ }).click()
  await expect(page.getByRole('button', { name: 'Customize this deck' })).toBeVisible()

  await page.getByRole('button', { name: 'Customize this deck' }).click()
  await expect(page.getByRole('heading', { name: 'Add card to deck' })).toBeVisible()

  const firstCard = page.getByTestId('deck-card-row').first()
  await firstCard.getByRole('button', { name: 'Edit' }).click()
  await firstCard.getByLabel('Impact').selectOption('3')

  await expect(firstCard.getByText(/Impact 3/)).toBeVisible()
})
