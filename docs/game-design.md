# Game design

## Philosophy

The app is **not** a Magic rules engine. It doesn't handle mana, priority, the stack, players' turn phases, blocking, or combat rules in general. The 4 players play their own turns physically, exactly as they would without the app.

The app only comes into play during the bot's turn: it keeps the bot's state and, when asked to play a turn, decides and displays in a readable way the bot's sequence of actions (removal, creatures summoned, attacks).

Two deliberate choices follow from this:

1. **The app doesn't track players' board, and only offers a single shared life counter as a convenience.** Tracking each player's board individually would require the operator to keep the app in sync with the real state of the table on every single move by the 4 players — too much overhead for a marginal benefit. Bot effects that would act on players therefore become **generic text instructions** that the table carries out itself (e.g. "Destroy the creature with the highest power among the players' creatures"), instead of targets chosen by the app. The one exception is `GameState.playersLife`: a single shared life total the operator can edit like a physical life pad, purely for convenience — no template or instruction ever reads or writes it, so it never becomes a point where the app makes a decision on the players' behalf.
2. **The bot's cards don't have Oracle text interpreted by the app.** Instead, each card in the bot's deck is mapped to an **effect template** with a handful of simple parameters. This is what makes it possible to include any real card, even one with complex abilities, without having to write a full rules engine: you just pick the template closest to the card's effect.

## What the app tracks

Only the **bot's** state ([`BotState`](../src/types.ts)):

| Field | What it represents |
|---|---|
| `life` | The bot's life. At 0 or below, the bot is defeated. |
| `library` | The bot's deck, shuffled at the start of the game. |
| `hand` | The cards the bot will play on its **next** turn — drawn ahead of time, at the end of the previous turn's resolution (see [Bot turn flow](#bot-turn-flow)), as soon as they're needed. This is why it's never "empty between turns": it stays full and visible throughout the players' turns, specifically so the table can interact with it (discard, add cards, etc.) before it gets resolved. |
| `battlefield` | The bot's creatures/tokens currently in play. |
| `graveyard` | The bot's cards that ended up in the graveyard. |
| `exile` | The bot's exiled cards. |

Players' board is **not** represented in any data structure of the app: it stays on the physical table (cards in play). Their life total, however, does get a single shared counter, `GameState.playersLife` — a plain number set at game start (`GameConfig.startingPlayersLife`) and edited manually from `GameBoard`, exactly like `bot.life`. It's tracked purely so the table has one place to see it alongside the bot's life; no engine logic ever reads or writes it.

## Game loop

Turns alternate physically as in a normal game (player 1 → 2 → 3 → 4 → bot → back to 1...). The app comes into play at two points:

- **During the players' turns**: if something happens involving the bot (players attack the bot, destroy one of its creatures, heal it, etc.), the operator manually updates `BotPanel` — edits the life field, or clicks/right-clicks a card in any zone to move it to another (see [Bot zones](#bot-zones-and-moving-cards)). This is also when the bot's hand — already drawn for the next turn — is exposed to player interaction: discarding it, forcing the bot to replay a specific card, etc.
- **On the bot's turn**: the operator clicks "Play bot turn" and the app resolves the whole turn automatically (see below), pausing only to collect any numeric input and to have the combat outcome confirmed.

## Bot turn flow

Implemented in [`botTurnEngine.ts`](../src/engine/botTurnEngine.ts) (the pure single-step functions) and orchestrated by the reducer ([`gameReducer.ts`](../src/state/gameReducer.ts)) plus `GameBoard`.

**Drawing happens one turn ahead.** The bot doesn't draw the hand it's about to play — it draws it **at the end** of the previous turn's resolution (and, for the very first turn, at game start: see `startGame`), so it's already ready and visible in `BotPanel` for the whole span of the preceding players' turns. This is what makes it possible for players to interact with the bot's hand *before* it's played: getting it discarded (by removing cards, see [Bot zones](#bot-zones-and-moving-cards)), or forcing a card into it that the bot will replay next turn (useful, for example, to stall its development).

**The turn is revealed one card at a time, not all at once.** The table needs to be able to decide whether to respond to a specific bot card (e.g. counter it) before knowing what else the bot will play that turn — exactly like in a normal game, where cards are seen one at a time as they're cast. That's why the turn is a small state machine rather than a function that immediately produces the final result:

1. **Collecting questions.** When the operator clicks "Play bot turn", the app scans the **already-drawn** hand and gathers all the "query" questions needed (see [NumericValue](#numericvalue-fixed-values-or-questions)) into a single screen (`QueryInputModal`), so the operator answers once while looking at the table, instead of being interrupted card by card. Answers stay valid for the whole turn.
2. **Turn start** (`BEGIN_BOT_TURN`). Summoning sickness is cleared from creatures already in play (they've been under the bot's control since the start of its previous turn), and the hand is reordered for resolution: first the `TableInstruction`s (removal, damage, sacrifice, discard) — so the table "clears" the threat before the bot develops more creatures — then the `BotStateEffect`s (creatures, pump, life gain, extra draws), in the order they were drawn. This reordered hand **is** the turn's reveal queue: the phase switches to `resolvingTurn` and the first card is shown (`CurrentCardReveal`).
3. **Card-by-card reveal** (`RESOLVE_TURN_CARD`). At each step the table sees only the card at the front of the queue (name, image, effect) and decides:
   - **Resolve** — the effect applies normally (`resolveSingleCard`) and the card goes to the graveyard (creatures stay in play instead).
   - **Countered** — the card still goes to the graveyard (a countered card was cast anyway), but **no effect** applies: no creature enters play, no damage, no bonus draw (`counterSingleCard`).

   Either way the card leaves the queue (`bot.hand` shrinks by one card) and a row is added to the log (`TurnLogEntry`). This repeats until the queue is empty. If the hand is already empty at the start of the turn, it skips straight to step 4.
4. **End of turn** (automatic as soon as the queue empties). Attackers are declared — every bot creature without summoning sickness, including ones just summoned if they have `haste` — and the hand for the next turn is drawn: `config.drawPerTurn` cards (plus any extra draws, see below). `drawPerTurn` remains the main lever for making the bot more or less challenging against 4 players.
5. **Combat outcome.** If there are attackers, the app waits (`phase: 'awaitingAttackOutcome'`): once the table has resolved blocks physically, the operator clicks on the bot's attackers that died in `AttackOutcome`. Non-token creatures that died go to the bot's graveyard; tokens simply cease to exist. Otherwise it goes straight back to `idle`.
6. Life/library are recomputed (library already updated by step 4's draw) to determine the game's status (see below).

The state of the turn in progress (`GameState.pendingTurn`: the query answers and the total extra draws accumulated so far) lives in the persisted `GameState`, not in local component state — refreshing the page mid-turn resumes exactly where it left off.

### Cards drawn by `DrawExtraBot`

If a card has a `DrawExtraBot` effect, the extra cards drawn are **not** resolved in the same turn: resolving them would require collecting any of their "mid-turn" questions, which the app deliberately avoids (point 1 above). They simply add to the draw count for the next turn (point 4): the resulting hand has `drawPerTurn + extraDraws` cards instead of just `drawPerTurn`. A countered `DrawExtraBot` card contributes nothing, like any other countered card.

## Bot zones and moving cards

`BotPanel` displays all 5 of the bot's tracked zones — board, hand, graveyard, exile, library — and lets you move **any card, from any zone, to any other zone** (`MOVE_CARD` in [`gameReducer.ts`](../src/state/gameReducer.ts)). This is meant to mirror any physical zone change involving the bot: mill, bounce, reanimation, correcting an operator mistake, etc. — not just "a bot creature dies in combat". Only the board stays always visible: it's the one zone the operator checks every turn, while hand, graveyard, exile and library start out **collapsed** (a toggle for each, with the count always visible in the header) to keep the screen uncluttered.

On the board, left-clicking a creature = it goes to the graveyard (the default action, the most common case: the creature died). Right-click opens the menu with all the other destinations. In the other zones (hand, library, graveyard, exile) there's no equally obvious default action, so every card opens the move menu directly on click (left or right).

The destinations offered by the menu (`destinationOptions` in `BotPanel.tsx`) are always every zone except the starting one, with one exception:

| Destination | When it's available |
|---|---|
| Hand / Graveyard / Exile | Always (except from that same zone). |
| Library (top / bottom / position N) | Always (except from the library itself). |
| Board (in play) | Only if the card has a `CreateCreature` effect — only those have a body to put into play. The creature is rebuilt from scratch with the template's base stats (`buildBattlefieldCreatureFromCard` in `templates.ts`); any "query" values use the no-answer fallback (`offset`/`min`), since this restoration happens outside the turn-resolution flow that collects questions. |

**Tokens ignore the chosen destination**: by Magic's rules, a token ceases to exist if it would change zones, so whatever option is picked for a token the result is always "removed permanently" (the menu for tokens in fact shows a single entry).

## Win/loss conditions

The app only detects the **bot's** defeat (`recomputeStatus` in `botTurnEngine.ts`), since that's the only state it tracks:

- **Bot life ≤ 0** → bot defeated.
- **Bot library empty** → bot defeated (consistent with the official Horde format: if the horde deck runs out of cards, the team wins).

The players' defeat (team life at 0) is instead decided by the table itself with its own physical counters — the app doesn't track it.

## Template-based effect system

Every card in the bot's deck ([`DeckCardConfig`](../src/types.ts)) has an `effect` field with a `kind` that determines its behavior. There are two families:

### `BotStateEffect` — modify the bot's tracked state

| Template | Parameters | Effect |
|---|---|---|
| `CreateCreature` | `count`, `power`, `toughness`, `keywords[]`, `tokenName?` | Puts `count` creatures on the bot's board. If `count` resolves to 1, it's the card itself (non-token, with its image); if >1, they're tokens (no image, name = `tokenName` or the card's name). Summoning sickness unless they have `haste`. |
| `PumpBotBoard` | `powerBonus`, `toughnessBonus`, `grantKeywords[]` | **Permanent** buff (not "until end of turn" — a deliberate simplification, see below) to all bot creatures in play at the time of resolution. |
| `GainLifeBot` | `amount` | The bot gains life. |
| `DrawExtraBot` | `amount` | The bot draws extra cards (resolved next turn, see above). |

### `TableInstruction` — generate text only, don't touch tracked state

| Template | Parameters | Effect |
|---|---|---|
| `RemovalInstruction` | `mode` (`highestPower` \| `highestToughness` \| `highestManaValue` \| `random` \| `all`), `count`, `destroyOrExile` | Instruction like "Destroy/Exile [the creature / the N creatures / all creatures] [with highest power / ... / at random]". |
| `DamageInstruction` | `amount`, `target` (`eachPlayer` \| `creatureHighestPower` \| `creatureHighestToughness` \| `creatureRandom` \| `allCreatures`) | Instruction like "Deal N damage to ..." or "Each player loses N life". |
| `SacrificeInstruction` | `perPlayer` (bool), `count` | "Each player sacrifices N creatures" or "Players jointly choose N creatures to sacrifice in total". |
| `DiscardInstruction` | `perPlayer` (bool), `count` | Same pattern, for discarding cards. |

The exact text is generated by [`instructionText.ts`](../src/engine/instructionText.ts).

For `TableInstruction`s, always prefer modes/targets that are **symmetric or chosen by the table without the bot exercising judgment** (`all`, `allCreatures`, `eachPlayer`, the two sacrifice/discard `*Instruction`s) over `highestPower`/`highestToughness`/`highestManaValue`/`random`: the former correspond to real non-targeted cards (wraths, edicts), the latter are a fallback for reinterpreting single-target cards (e.g. "Doom Blade") that the bot, not seeing the board, couldn't otherwise aim sensibly. The [zombie](../src/data/zombieDeck.ts) and [dinosaur](../src/data/dinosaurDeck.ts) decks follow this criterion strictly.

### `errata`: custom rules for cards no template can express on its own

A `DeckCardConfig` can have an optional `errata: string` field that **replaces** the text generated by the template for that card (see [deck-format.md](deck-format.md#errata--custom-rules)). Use it sparingly, only when the real card has a modal resolution that depends on the players' board (which the bot can't see) and no existing `mode`/`target` captures it — e.g. *Extinction Event*, which asks you to pick the option (mana value ≤3 or ≥4) that would hit more of the players' creatures. It shouldn't be used for scalar values that can be eyeballed: those stay `NumericValue` with `query` (see above).

### `NumericValue`: fixed values or questions

Any numeric parameter of a template (`count`, `power`, `amount`, ...) can be:

- **a fixed number**, or
- **a question** (Archenemy-style): `{ query: string, multiplier: number, offset: number, min?: number, max?: number }`. At resolution time, the app asks the operator for a number (e.g. "How many artifacts do the players control?") and computes `result = answer × multiplier + offset`, then clamps it to `[min, max]` if specified.

Real example from the prebuilt deck — *Bane of Progress*, which becomes a 4/4 creature +1/+1 for each artifact/enchantment the players control:

```json
{
  "power": { "query": "How many artifacts and enchantments do the players control?", "multiplier": 1, "offset": 4, "min": 4 },
  "toughness": { "query": "How many artifacts and enchantments do the players control?", "multiplier": 1, "offset": 4, "min": 4 }
}
```

If two fields on the same card share the exact same question (as above), the app asks it **only once** and reuses the answer for both (dedup by question text, not by field — see `collectQueriesForCard` in `templates.ts`).

## Deck curation criteria

The app ships with two prebuilt decks, listed in [`src/data/presets.ts`](../src/data/presets.ts) and loadable from the "New game" screen (`SetupScreen`, before starting the game — once a game is in progress the bot's deck stays the one locked into `deckSnapshot`, see below): [zombie](../src/data/zombieDeck.ts) and [dinosaur](../src/data/dinosaurDeck.ts), each a themed deck with many copies of the same cards (as a real Horde deck needs, to last several turns). The cards chosen for these decks — and the ones added by hand from the deck builder — must have a real effect that maps cleanly and directly onto one of the templates above: vanilla creatures or ones with simple keywords, unconditional removal, flat damage, flat buffs, single-variable scaling effects. Cards with complex Oracle text, multiple conditions, replacement effects, or stack interactions are deliberately avoided — not because the system couldn't support them in theory, but because forcing them into a template would distort their effect. When a real card has more nuance than can be represented (e.g. "destroy target non-black creature" simply becomes "destroy a creature"), the simplest reading is always chosen, even if that makes it slightly stronger or weaker than the original — an accepted trade-off, balanced out by the difficulty levers (see below).

## Difficulty levers

Set in `SetupScreen` when starting a game (`GameConfig`):

- **`drawPerTurn`** — how many cards the bot draws each turn. The main lever: more cards drawn means more threats/removal per turn.
- **`startingLife`** — the bot's starting life, to absorb the fact that it's facing 4 players at once.
- **`playerCount`** — number of players at the table; saved for reference but not used in any engine calculation (since players are treated collectively, not individually).
- **`startingPlayersLife`** — initial value of the shared players' life counter (`GameState.playersLife`). Not a difficulty lever in any engine sense — it's not read by any effect — just the starting point for the convenience counter shown in `GameBoard`.
