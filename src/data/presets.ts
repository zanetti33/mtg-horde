import type { DeckCardConfig } from '../types'
import { defaultDeck } from './defaultDeck'
import { zombieDeck } from './zombieDeck'
import { dinosaurDeck } from './dinosaurDeck'

export interface DeckPreset {
  label: string
  deck: DeckCardConfig[]
}

/** Precompiled decks selectable at match setup (see SetupScreen). */
export const DECK_PRESETS: DeckPreset[] = [
  { label: 'Default', deck: defaultDeck },
  { label: 'Zombie', deck: zombieDeck },
  { label: 'Dinosaurs', deck: dinosaurDeck },
]
