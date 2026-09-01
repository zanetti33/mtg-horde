import type { DeckCardConfig } from '../types'
import { zombieDeck } from './zombieDeck'
import { dinosaurDeck } from './dinosaurDeck'

export interface DeckPreset {
  label: string
  deck: DeckCardConfig[]
  /**
   * Short, hand-written summary of the deck's tactical profile, meant to help pick a preset before
   * starting a game (see SetupScreen). Grounded in the real `category` distribution of `deck` (see
   * `CardCategory` in types.ts) as of the date below — re-check it against the deck's actual
   * category counts if the deck's cards change materially, since this text doesn't update itself.
   */
  description: string
}

/** Precompiled decks selectable at match setup (see SetupScreen). Fixed/read-only in the deck builder until explicitly unlocked (see CUSTOM_DECK_SOURCE in types.ts). */
export const DECK_PRESETS: DeckPreset[] = [
  {
    label: 'Zombie',
    deck: zombieDeck,
    // As of 2026-09-01: lord 11.0% vs Dinosaurs' 4.5% (more than double), horde 12.3% vs 7.5% — plus
    // this is the only preset with any faceDamage (4.1%) or discard (2.7%) cards.
    description:
      "By far the highest lord density of the two presets — permanent team-wide buffs stack fast. Also leans harder into token generation (Army of the Damned alone can drop 13 Zombies from one card), and it's the only preset with direct damage to the players or forced discard.",
  },
  {
    label: 'Dinosaurs',
    deck: dinosaurDeck,
    // As of 2026-09-01: bigBad 26.9% vs Zombie's 6.8% (4x), aoe 13.4% vs 6.8% (2x) — while lord (4.5%)
    // and horde (7.5%) both sit below the Zombie preset's.
    description:
      'About a quarter of the deck is a big keyword creature (trample, flying, first strike...) — the plan is winning with individually bigger bodies, not a wider board. It also leans harder into AOE damage to clear the board than the Zombie preset, but tokens and lords are scarce here.',
  },
]
