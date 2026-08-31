# Horde Bot

Companion webapp for Magic: The Gathering games in **Horde** format: 4 real players against 1 bot. The app doesn't replace Magic's rules — players play their own turns physically, as always. Its only job is to manage the bot's turn: keep track of its deck/board/life state and decide, in a readable way, what it does each turn (creatures summoned, removal, damage, attacks).

## How it works in short

- **No backend.** Everything runs in the browser, state is saved in `localStorage`.
- **The app tracks only the bot** — life, deck, hand, board, graveyard and exile. The 4 players' life and board stay managed physically at the table (the app doesn't touch them).
- **The bot's cards are "templates", not Oracle text.** Each card in the bot's deck is mapped to a simple effect (summon a creature, remove a threat, deal damage, etc.) with a handful of parameters — there's no card text parsing. This lets you use any real card, even a complex one, by picking the effect that best approximates it.
- Card data (name, cost, image) is fetched from the [Scryfall API](https://scryfall.com/docs/api).

For design details see the [docs/](docs/) folder.

## Quick start

Prerequisites: Node.js 20.x (any patch — dependencies are pinned on purpose to avoid the Node ≥20.19 requirement of some newer tool versions).

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server (with hot reload) |
| `npm run build` | Typecheck (`tsc -b`) + production build in `dist/` |
| `npm run preview` | Serves the production build locally, for a final check |
| `npm test` | Runs the Vitest test suite |

## Quick app usage

1. **Bot deck** — review/edit the deck, search for more cards on Scryfall and assign them an effect (and optionally a custom errata/rule).
2. **Game** — choose the deck (the current one or one of the ready-made presets, Default/Zombie/Dinosaurs), set the number of players, the bot's draws per turn and starting life, then start. Once started, the bot's deck stays locked for the rest of the game.
3. **Play bot turn** — the hand drawn ahead of time (removal/damage first, then creatures and utility) is revealed **one card at a time**: for each one the table sees only that card and decides whether to let it resolve or counter it, before the bot shows the next one. Once the queue is empty, attackers are declared and the hand for the next turn is drawn (visible and editable during the players' turns — useful for getting it discarded, or to "stall" the bot by putting a card into its hand).
4. **Combat outcome** — after the table has resolved blocks physically, click on the bot's attackers that died in combat.
5. **Bot zones** — during the players' turns, `BotPanel` shows hand, board, graveyard, exile and library: clicking a creature in play = it goes to the graveyard (the most common case), clicking any other card (in any zone) opens a menu with all possible destinations — hand, board (if it has a creature effect), graveyard, exile, deck (top/bottom/position N).

## Tech stack

Vite + React + TypeScript + Tailwind CSS. No backend. Persistence in `localStorage` (plus JSON export/import). Card data from the public Scryfall API. Tests with Vitest.

## Documentation

- [docs/architecture.md](docs/architecture.md) — project structure, technical choices, state management
- [docs/game-design.md](docs/game-design.md) — game model, turn flow, effect/template system
- [docs/deck-format.md](docs/deck-format.md) — deck JSON schema, for anyone who wants to edit it by hand or build external tools
