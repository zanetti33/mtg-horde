import type { DeckConfig, GameState } from '../types'

const DECK_KEY = 'horde-deck-config-v1'
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
