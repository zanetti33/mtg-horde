import type { DeckConfig, DeckSource, GameState } from '../types'

const DECK_KEY = 'horde-deck-config-v1'
const DECK_SOURCE_KEY = 'horde-deck-source-v1'
const GAME_KEY = 'horde-game-state-v1'

export function loadDeckConfig(): DeckConfig | null {
  try {
    const raw = localStorage.getItem(DECK_KEY)
    return raw ? (JSON.parse(raw) as DeckConfig) : null
  } catch {
    return null
  }
}

export function saveDeckConfig(deck: DeckConfig): void {
  localStorage.setItem(DECK_KEY, JSON.stringify(deck))
}

/** Separate from `DeckConfig` (which is also the export/import JSON schema, documented in docs/deck-format.md) — where the deck came from isn't part of that portable format. */
export function loadDeckSource(): DeckSource | null {
  return localStorage.getItem(DECK_SOURCE_KEY)
}

export function saveDeckSource(source: DeckSource): void {
  localStorage.setItem(DECK_SOURCE_KEY, source)
}

export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY)
    return raw ? (JSON.parse(raw) as GameState) : null
  } catch {
    return null
  }
}

export function saveGameState(state: GameState | null): void {
  if (state === null) {
    localStorage.removeItem(GAME_KEY)
  } else {
    localStorage.setItem(GAME_KEY, JSON.stringify(state))
  }
}

/** Triggers a browser download of `data` as a formatted JSON file. */
export function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Reads a user-selected JSON file (e.g. from an <input type="file"> change event) and parses it. */
export function readJSONFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string) as T)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
