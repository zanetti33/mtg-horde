# Architecture

## Why no backend

The app is meant to be used from a single shared device at the table (a laptop or tablet everyone looks at). There's no need to sync state across multiple devices, so all the state lives in the browser and is saved to `localStorage`. The only network call the app makes at runtime is to the [public Scryfall API](https://scryfall.com/docs/api) (Scryfall supports CORS for direct browser use), and only for cards added through the deck builder — the two preset decks' card data/images are bundled into the app itself (see "Local card bundle" below), so a fresh session never needs it just to start a game.

## Stack

- **Vite + React 19 + TypeScript** — SPA, no router (navigation between "Deck" and "Game" is local state in [App.tsx](../src/App.tsx)).
- **Tailwind CSS** — styling.
- **Vitest** — unit tests on the engine logic (there are no tests on the React components: the surface at risk of bugs is almost entirely in the pure logic of `src/engine`).
- `vite`/`@vitejs/plugin-react`/`vitest` versions are pinned explicitly in `package.json` to stay compatible with a generic Node 20.x (newer versions of these tools require Node ≥20.19).

## Folder structure

```
src/
  types.ts                    All domain types (see game-design.md and deck-format.md)
  App.tsx                     Shell: Deck/Game navigation
  main.tsx                    Entry point

  scryfall/
    api.ts                    Scryfall client: autocomplete, search by name, localStorage cache,
                               serialized request queue to respect Scryfall's rate limit
    CREDITS.md                Required Scryfall/Wizards of the Coast attribution

  engine/                     Pure logic, no React — tested with Vitest
    templates.ts               Resolution of the effects that modify bot state (CreateCreature,
                                PumpBotBoard, ...) — every numeric parameter is a plain fixed number
    instructionText.ts         Generates the instruction text shown to the table (removal, damage, ...)
    effectSummary.ts           Readable summary of an effect for the deck builder UI
    effectDefaults.ts          Default values for each template, used when creating a new one
    botTurnEngine.ts            Orchestrator: draws, resolves the turn, declares attackers

  state/
    gameReducer.ts              Pure reducer (AppState = { deck, game }) + all actions
    AppContext.tsx               React provider: wires up the reducer, persists to localStorage,
                                 hydrates any missing Scryfall data on startup
    persistence.ts               localStorage read/write, JSON export/import

  data/
    zombieDeck.ts / dinosaurDeck.ts  The two prebuilt decks (see game-design.md)
    presets.ts                   DECK_PRESETS list shown in SetupScreen
    attachLocalScryfallData.ts   Attaches bundled Scryfall data to a preset deck's cards
    scryfallCache.ts             Generated — see "Local card bundle" below
    scryfallCache.store.json     Generated — persistent source of truth for scryfallCache.ts

  components/                  UI (see below)

scripts/
  fetch-card-assets.mjs        Node script that builds the local card bundle (see below)

public/
  cards/                       Generated — bundled card images (see below)
```

### UI components

| Component | Responsibility |
|---|---|
| `SetupScreen` | Configuring and starting a new game |
| `DeckBuilder` / `AddCardForm` (in `DeckBuilder.tsx`) | Deck list, Scryfall search, add/edit/remove cards |
| `EffectForm` | Form to set an effect's template + parameters |
| `NumberField` | Labeled number input, reused across `EffectForm`'s numeric parameters |
| `KeywordPicker` | Keyword picker (flying, trample, ...) |
| `ColorPicker` | Editable WUBRG color picker (used for `tokenColors` and `AddTokenModal`) |
| `ColorDots` | Read-only color pips rendering a creature's `colors` (`BotPanel`/`AttackOutcome`) |
| `AddTokenModal` | Form to hand the bot a player-granted custom token (name, P/T, keywords, type, colors) |
| `GameBoard` | Main view of a game in progress: "Play bot turn" button, coordinates the reveal log/outcome |
| `BotPanel` | Life, zone counters, bot board + permanents (click/right-click to move creatures/permanents between zones, "+ Add token") |
| `CardContextMenu` | Generic context menu positioned at the cursor (used by `BotPanel`) |
| `TurnLog` | Readable log of the bot's last turn, with the image of every card played |
| `AttackOutcome` | Confirms which of the bot's attackers survived combat |

## State management

A single `useReducer` in [AppContext.tsx](../src/state/AppContext.tsx) with state `{ deck: DeckCardConfig[], game: GameState | null }` (see [gameReducer.ts](../src/state/gameReducer.ts) for the full list of actions). The Context exposes `{ state, dispatch }` via the `useAppState()` hook.

Deliberate design points worth calling out:

- **The turn-resolution engine is pure.** `drawForTurn` and `resolveSingleCard` (in `botTurnEngine.ts`) don't touch React or global state: they take a `BotState` and return a new `BotState`. The reducer calls them and applies the result. This is what makes them easy to test with Vitest without mounting components.

## Persistence

`localStorage` with two keys (see `persistence.ts`):

- `horde-deck-config-v1` — the bot's deck
- `horde-game-state-v1` — the game in progress (absent if no game is active)

Plus a separate cache of already-resolved Scryfall data: `horde-scryfall-cache-v1` (in `scryfall/api.ts`), so the same card isn't requested twice.

The deck builder also offers JSON export/import (`downloadJSON` / `readJSONFile` in `persistence.ts`) for manual backups or moving the configuration to another device.

## Scryfall integration: a lesson learned

The first version hydrated missing Scryfall data with a `useEffect` reacting to `state.deck`: every time a card was successfully hydrated, `state.deck` changed reference, which re-triggered the effect for the cards still missing data. The problem: the "old" (superseded) pass kept fetching in the background regardless — only its final `dispatch` was skipped — so each new pass piled on top of the previous one instead of replacing it. The result was dozens of duplicate requests to Scryfall within a few seconds, enough to trip their rate limit and leave some cards permanently without an image for the session.

The fix adopted: startup hydration runs **exactly once** (`useEffect` with an empty dependency array, see `AppContext.tsx`), over a fixed snapshot of the deck loaded at startup — it no longer reacts to its own side effects. Cards added later from the deck builder are instead resolved **before** being added to state (`AddCardForm.addCard` in `DeckBuilder.tsx` calls `getCardByName` and waits for the result before dispatching), so no extra reactivity is needed there. On top of that, the Scryfall client (`scryfall/api.ts`) uses a real request queue (a promise chain), not just a "time elapsed since last call" check — the latter isn't enough to serialize concurrent calls (e.g. React StrictMode's double-invoke of effects in development).

## Local card bundle

The two preset decks (`zombieDeck.ts`, `dinosaurDeck.ts`) use a fixed, known set of real cards, so their Scryfall data/images are fetched once ahead of time and committed to the repo instead of being requested at runtime:

- `scripts/fetch-card-assets.mjs` extracts every `scryfallName` referenced in the two deck files, resolves each against the Scryfall API (same fuzzy-name lookup as `scryfall/api.ts`), and writes:
  - `public/cards/<scryfallId>.jpg` — the card image, unmodified, served as a static asset.
  - `src/data/scryfallCache.store.json` — the persistent source of truth (queried name → resolved data), so re-running the script only fetches names not already in the store instead of re-downloading everything.
  - `src/data/scryfallCache.ts` — regenerated from the store on every run; exports `LOCAL_SCRYFALL_CACHE`, keyed by the same lowercased/trimmed name used by `cacheKeyFor` in `scryfall/api.ts`. Image URLs are resolved through `import.meta.env.BASE_URL` so they work both in dev (`/`) and on the GitHub Pages build (`/mtg-horde/`).
- `src/data/attachLocalScryfallData.ts` attaches a matching `LOCAL_SCRYFALL_CACHE` entry to each card when a preset deck module loads. Since the card already has `.scryfall` populated by the time `hydrateMissingScryfallData` / the `AppContext` startup effect run, neither one issues a network request for it — they only ever hit the live API for cards missing from the bundle (e.g. a card just added to a preset before the next `fetch-cards` run) or added through the deck builder.
- Run `npm run fetch-cards` after adding a new card to a preset deck. It's safe to re-run any time — already-cached names are skipped; pass `--force` to refresh everything (e.g. if Scryfall updates an image).

Card data/images are cached and redistributed under Scryfall's data usage guidelines and the Wizards of the Coast Fan Content Policy — see `scryfall/CREDITS.md` for the attribution text (also shown in the app footer).
