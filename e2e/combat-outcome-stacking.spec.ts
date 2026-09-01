import { test, expect } from '@playwright/test'
import { THREE_HASTE_TOKEN_DECK, deckFile } from './fixtures'

test('identical attackers in combat outcome render as one stack; clicking cycles through marking casualties then revives', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /^Bot deck/ }).click()
  await page.locator('input[type="file"]').setInputFiles(deckFile(THREE_HASTE_TOKEN_DECK))

  await page.getByRole('button', { name: /^Game/ }).click()
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByRole('button', { name: 'Play bot turn' }).click()
  await page.getByRole('button', { name: /^Resolve/ }).click()

  await expect(page.getByRole('heading', { name: 'Combat outcome' })).toBeVisible()
  const stack = page.getByTestId('attack-outcome-stack')
  await expect(stack).toHaveCount(1)
  await expect(stack.getByText('×3')).toBeVisible()

  // Click marks one more casualty each time, tracked separately from the (unchanged) total badge.
  await stack.click()
  await expect(stack.getByText('1/3 DEAD')).toBeVisible()
  await expect(stack.getByText('×3')).toBeVisible()

  await stack.click()
  await expect(stack.getByText('2/3 DEAD')).toBeVisible()

  await stack.click()
  await expect(stack.getByText('3/3 DEAD')).toBeVisible()

  // Every instance is now marked dead -> one more click revives the whole stack (undo), same as a
  // lone attacker toggling back to alive.
  await stack.click()
  await expect(page.getByText(/\d\/3 DEAD/)).toHaveCount(0)

  // Mark exactly one casualty and confirm -> the board should end up with 2 survivors.
  await stack.click()
  await expect(stack.getByText('1/3 DEAD')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm outcome' }).click()

  await expect(page.getByText('Bot board (2)')).toBeVisible()
})
