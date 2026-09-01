import { test, expect } from '@playwright/test'
import { THREE_TOKEN_DECK, deckFile } from './fixtures'

test('identical creatures on the board render as a single stack with a count badge that decrements as they leave', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /^Bot deck/ }).click()
  await page.locator('input[type="file"]').setInputFiles(deckFile(THREE_TOKEN_DECK))
  await expect(page.getByRole('heading', { name: 'Bot deck (1 cards)' })).toBeVisible()

  await page.getByRole('button', { name: /^Game/ }).click()
  await page.getByRole('button', { name: 'Start game' }).click()

  await page.getByRole('button', { name: 'Play bot turn' }).click()
  await page.getByRole('button', { name: /^Resolve/ }).click()

  // 3 identical tokens from one resolution -> one raw board count, but a single visual stack.
  await expect(page.getByText('Bot board (3)')).toBeVisible()
  const stacks = page.getByTestId('battlefield-stack')
  await expect(stacks).toHaveCount(1)
  await expect(stacks.getByText('×3')).toBeVisible()

  await stacks.click()
  await expect(page.getByText('Bot board (2)')).toBeVisible()
  await expect(stacks).toHaveCount(1)
  await expect(stacks.getByText('×2')).toBeVisible()

  await stacks.click()
  await expect(page.getByText('Bot board (1)')).toBeVisible()
  await expect(stacks).toHaveCount(1)
  // Down to a single instance -> no "×N" badge, same as an ungrouped creature always looked.
  await expect(page.getByText(/^×\d/)).toHaveCount(0)

  await stacks.click()
  await expect(page.getByText('Bot board (0)')).toBeVisible()
  await expect(page.getByText('No creatures in play.')).toBeVisible()
  await expect(stacks).toHaveCount(0)
})
