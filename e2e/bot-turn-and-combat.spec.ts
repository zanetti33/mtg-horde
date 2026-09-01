import { test, expect } from '@playwright/test'
import { computeBaseDrawCount } from '../src/engine/difficulty'
import { HASTE_CREATURE_DECK, deckFile } from './fixtures'

// Matches SetupScreen's own defaults (playerCount=4, difficulty='normal') — see that component.
const OPENING_HAND_SIZE = computeBaseDrawCount(1, 4, 'normal')

test('playing a bot turn summons creatures, and a haste creature can be sent into combat outcome', async ({ page }) => {
  await page.goto('/')

  // Import a deterministic single-card deck (see fixtures.ts) instead of a real preset: every draw
  // is guaranteed to be the same haste creature, so the turn's outcome isn't left to chance.
  await page.getByRole('button', { name: /^Bot deck/ }).click()
  await page.locator('input[type="file"]').setInputFiles(deckFile(HASTE_CREATURE_DECK))
  await expect(page.getByRole('heading', { name: 'Bot deck (1 cards)' })).toBeVisible()

  await page.getByRole('button', { name: /^Game/ }).click()
  await page.getByRole('button', { name: 'Start game' }).click()

  await page.getByRole('button', { name: 'Play bot turn' }).click()

  for (let i = 0; i < OPENING_HAND_SIZE; i++) {
    await page.getByRole('button', { name: /^Resolve/ }).click()
  }

  // Every copy of the fixture card has haste, so none of them are summoning-sick -> all of them
  // attack, and the app should go straight to the combat-outcome screen instead of back to idle.
  await expect(page.getByText(`Bot board (${OPENING_HAND_SIZE})`)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Combat outcome' })).toBeVisible()

  // Scoped to the combat-outcome panel: the same creature also has a (separate) button on the
  // board itself, which would otherwise make this locator match twice.
  const attackers = page.getByTestId('attack-outcome').getByRole('button', { name: /E2E Haste Creature/ })
  await expect(attackers).toHaveCount(OPENING_HAND_SIZE)
  await attackers.first().click()
  await page.getByRole('button', { name: 'Confirm outcome' }).click()

  await expect(page.getByText(`Bot board (${OPENING_HAND_SIZE - 1})`)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Combat outcome' })).toHaveCount(0)
})
