# Deck format (JSON)

Reference for anyone who wants to hand-edit a file exported from the deck builder, write an external script to generate a deck, or simply understand what gets saved in `localStorage`. The source types are in [`src/types.ts`](../src/types.ts).

## General structure

A deck file (the one downloaded via "Export" in the deck builder, `localStorage` key `horde-deck-config-v1`) is a `DeckConfig` object:

```json
{
  "cards": [ /* DeckCardConfig[] */ ]
}
```

Each card is a `DeckCardConfig`:

```ts
{
  id: string            // unique identifier of the deck entry (not the Scryfall id — allows multiple copies of the same card)
  scryfallName: string  // exact (or nearly: the search is "fuzzy") name of the card on Scryfall
  scryfall?: {           // optional: data fetched from Scryfall, auto-populated by the app if missing
    scryfallId: string
    name: string
    manaCost: string
    cmc: number
    typeLine: string
    imageUrl?: string
    colors: string[]
  }
  effect: EffectParams  // see below — determines what the card does when the bot plays it
  impact?: number        // 1 (low) / 2 (medium) / 3 (high) — draw-weighting, see game-design.md. Missing -> 1
  category?: CardCategory // optional — official tactical category, see "Card category" below. Missing -> uncategorized
  errata?: string        // optional — see "Errata / custom rules" below
}
```

If you write a deck by hand, you can omit `scryfall` — the app fetches it on its own on first load (or on first use, for cards added from the deck builder) and caches it.

## `EffectParams`

The `kind` field selects the template (see [game-design.md](game-design.md) for the semantics of each). Every numeric parameter (`count`, `power`, `amount`, ...) is a plain fixed number, decided by whoever curates the deck — not resolved at play time. A real card whose printed effect has a variable X (e.g. *Toxic Deluge*'s "-X/-X to all creatures") is represented as several deck entries, one per fixed X, spread across `impact` tiers (low/medium/high — see `DeckCardConfig.impact` in [`types.ts`](../src/types.ts)) — see *Toxic Deluge* in [`zombieDeck.ts`](../src/data/zombieDeck.ts)/[`dinosaurDeck.ts`](../src/data/dinosaurDeck.ts) for a real example.

### `CreateCreature`

```json
{
  "kind": "CreateCreature",
  "count": 1,
  "power": 5,
  "toughness": 5,
  "keywords": ["flying", "trample"],
  "tokenName": "Dragon",
  "tokenTypeLine": "Dragon",
  "tokenColors": ["R"],
  "tokenScryfall": {
    "scryfallId": "...",
    "name": "Dragon",
    "manaCost": "",
    "cmc": 0,
    "typeLine": "Token Creature — Dragon",
    "imageUrl": "...",
    "colors": ["R"]
  }
}
```

`keywords` is a subset of: `flying, trample, deathtouch, lifelink, firststrike, doublestrike, menace, vigilance, reach, haste`. `tokenName`, `tokenTypeLine`, `tokenColors` and `tokenScryfall` are all optional, used only when `count` is more than 1 (otherwise the creature is the card itself, already showing its own type/colors/image on its Scryfall image). `tokenColors` is a subset of `W, U, B, R, G` — omit or leave empty for a colorless token.

`tokenScryfall` is the real Scryfall **token** card matching this token (not the spell that makes it) — same shape as the top-level `scryfall` field (see below), and when present it's what actually gives a token an image, superseding `tokenTypeLine`/`tokenColors` for display. The two preset decks populate it via `scripts/fetch-card-assets.mjs` (matched by token name + power/toughness/keywords, since e.g. more than one distinct "Zombie" token can exist under the same name); there's no deck-builder UI to set it by hand yet, so a custom deck's tokens fall back to the plain-text `tokenTypeLine`/`tokenColors` (no image) unless you set `tokenScryfall` directly in an imported JSON file. None of `tokenName`/`tokenTypeLine`/`tokenColors`/`tokenScryfall` are read by the engine's logic (see [game-design.md](game-design.md#tokens-real-scryfall-art-and-the-typecolors-fallback)) — they just give the table something to check (or look at) when a token would otherwise have no card image.

### `PumpBotBoard`

```json
{
  "kind": "PumpBotBoard",
  "powerBonus": 3,
  "toughnessBonus": 3,
  "grantKeywords": ["trample"]
}
```

### `CreatePermanent`

```json
{
  "kind": "CreatePermanent",
  "permanentType": "enchantment",
  "powerBonus": 1,
  "toughnessBonus": 1,
  "grantKeywords": ["vigilance"]
}
```

`permanentType`: `artifact | enchantment` — purely a display label (the "Artifact"/"Enchantment" badge shown on the card in `BotPanel`'s "Bot permanents" section), the engine treats both identically. Puts a standalone permanent into play (`BotState.permanents`) instead of touching any creature's stats directly: it buffs every bot creature — including ones summoned *after* it resolves — for as long as it stays in play, and stops the moment it's destroyed/exiled like any other card. See [game-design.md](game-design.md#pumpbotboard-vs-createpermanent-two-different-anthem-trade-offs) for how this differs from `PumpBotBoard`.

### `GainLifeBot`

```json
{ "kind": "GainLifeBot", "amount": 8 }
```

### `DrawExtraBot`

```json
{ "kind": "DrawExtraBot", "amount": 2 }
```

### `RemovalInstruction`

```json
{
  "kind": "RemovalInstruction",
  "mode": "highestPower",
  "count": 1,
  "destroyOrExile": "destroy"
}
```

`mode`: `highestPower | highestToughness | highestManaValue | random | all` (with `all`, `count` is ignored). `destroyOrExile`: `destroy | exile`.

### `DamageInstruction`

```json
{
  "kind": "DamageInstruction",
  "amount": 3,
  "target": "eachPlayer"
}
```

`target`: `eachPlayer | creatureHighestPower | creatureHighestToughness | creatureRandom | allCreatures`.

### `SacrificeInstruction` / `DiscardInstruction`

```json
{ "kind": "SacrificeInstruction", "perPlayer": true, "count": 2 }
```

```json
{ "kind": "DiscardInstruction", "perPlayer": false, "count": 3 }
```

`perPlayer: true` → "each player ×N"; `perPlayer: false` → "players jointly choose N in total".

## Card category

`category` is the card's official tactical role — orthogonal to `effect.kind` (how the engine resolves it): the same `kind` can serve different roles (`PumpBotBoard` covers both a permanent `lord` and a one-shot `teamPump`), and it's assigned by hand, not derived. It's `CardCategory`, a string:

| Value | Meaning |
|---|---|
| `horde` | 2+ creatures/tokens from one card, few or no keywords — a swarm play |
| `bigBad` | a single creature with at least one keyword — a named threat |
| `grunt` | a single creature with no keyword — plain filler body |
| `specificRemoval` | each player loses/sacrifices one creature of their own (edict, or an objective criterion like highest power) |
| `aoe` | damage or "-X/-X" to all of the players' creatures — doesn't guarantee a full wipe |
| `boardClear` | unconditionally destroys/exiles all of the players' creatures |
| `lord` | permanent team-wide buff to the bot's board (anthem) |
| `teamPump` | one-shot team-wide buff (a combat trick, not a permanent anthem) |
| `draw` | the bot draws extra cards |
| `lifeGain` | the bot gains life |
| `faceDamage` | damage/life loss straight to the players, bypassing creatures |
| `discard` | forces the players to discard |

Omit it (or leave it `undefined`) for an uncategorized card — the deck builder shows it as "— Uncategorized —". See [`src/data/zombieDeck.ts`](../src/data/zombieDeck.ts)/[`dinosaurDeck.ts`](../src/data/dinosaurDeck.ts) for every category assigned across a full deck.

## Errata / custom rules

The optional `errata` field on `DeckCardConfig` is free text that **entirely replaces** the instruction generated by `effect` for that card when the turn is resolved (see `resolveBotTurn` in [`botTurnEngine.ts`](../src/engine/botTurnEngine.ts)).

It's meant for the few cases where the real card has a resolution that depends on the players' board — which the bot can't see — and no single template expresses it on its own. The main example is a modal card like *Extinction Event* ("destroy creatures with mana value 3 or less, OR those with mana value 4 or greater"): no existing `RemovalMode` can say "the table picks whichever option hits more creatures", so it's written as an explicit rule instead:

```json
{
  "kind": "RemovalInstruction",
  "mode": "all",
  "count": 1,
  "destroyOrExile": "destroy"
}
```
```json
"errata": "Choose whichever option would hit more of the players' creatures: destroy all their creatures with mana value 3 or less, or destroy all their creatures with mana value 4 or greater."
```

`mode`/`count`/`destroyOrExile` stay populated for schema validity but are ignored in favor of the `errata` text when it's present.

`errata` is for **modal** choices (between qualitatively different options) that no template mode can express — not for a card whose only variable is a **number** (e.g. *Toxic Deluge*'s X): those are curated as several fixed-number copies instead (see the note on `EffectParams` above), no `errata` needed.

See [`src/data/zombieDeck.ts`](../src/data/zombieDeck.ts) and [`src/data/dinosaurDeck.ts`](../src/data/dinosaurDeck.ts) for a real example.

## Full example

A mini deck with one template per family:

```json
{
  "cards": [
    {
      "id": "d1",
      "scryfallName": "Colossal Dreadmaw",
      "category": "bigBad",
      "effect": { "kind": "CreateCreature", "count": 1, "power": 6, "toughness": 6, "keywords": ["trample"] }
    },
    {
      "id": "d2",
      "scryfallName": "Wrath of God",
      "category": "boardClear",
      "effect": { "kind": "RemovalInstruction", "mode": "all", "count": 1, "destroyOrExile": "destroy" }
    },
    {
      "id": "d3",
      "scryfallName": "Bane of Progress",
      "effect": { "kind": "CreateCreature", "count": 1, "power": 5, "toughness": 5, "keywords": [] }
    }
  ]
}
```

## Import/export from the app

On the **Bot deck** tab:

- **Export** — downloads the current deck as a `horde-deck.json` file (uses `downloadJSON` in [`persistence.ts`](../src/state/persistence.ts)).
- **Import** — loads a `DeckConfig` file and fully replaces the current deck (`SET_DECK`). There's no merge: importing replaces all existing cards.

The bot's deck lives separately from the game in progress: editing it doesn't alter an already-started game, because the app saves a snapshot of it at game start (`GameState.deckSnapshot`, see [game-design.md](game-design.md)).
