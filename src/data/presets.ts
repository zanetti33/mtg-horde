import type { DeckCardConfig } from '../types'
import { zombieDeck } from './zombieDeck'
import { dinosaurDeck } from './dinosaurDeck'

export interface DeckPreset {
  label: string
  deck: DeckCardConfig[]
}

/** Precompiled decks selectable at match setup (see SetupScreen). Fixed/read-only in the deck builder until explicitly unlocked (see CUSTOM_DECK_SOURCE in types.ts). */
export const DECK_PRESETS: DeckPreset[] = [
  { label: 'Zombie', deck: zombieDeck },
  { label: 'Dinosaurs', deck: dinosaurDeck },
]
