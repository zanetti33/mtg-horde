import type { Dispatch } from 'react'
import type { AppAction } from '../state/gameReducer'
import type { DeckCardConfig } from '../types'
import { getCardByName } from './api'

/**
 * Fetches Scryfall data for any card missing it and dispatches the result
 * one card at a time. Needed whenever a deck is loaded outside of app
 * startup (import, preset load): the app-wide hydration pass in
 * AppContext only runs once at startup (see the comment there), so a deck
 * loaded afterwards would otherwise keep showing blank thumbnails/mana
 * costs until the next full page reload.
 */
export async function hydrateMissingScryfallData(cards: DeckCardConfig[], dispatch: Dispatch<AppAction>) {
  for (const card of cards) {
    if (card.scryfall) continue
    const data = await getCardByName(card.scryfallName)
    if (data) dispatch({ type: 'UPDATE_DECK_CARD_SCRYFALL', id: card.id, scryfall: data })
  }
}
