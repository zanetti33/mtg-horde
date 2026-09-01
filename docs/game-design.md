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
| `permanents` | The bot's artifacts/enchantments currently in play — non-creature permanents that keep buffing the board persistently (see `CreatePermanent` below), separate from `battlefield` since they never attack/block. |
| `graveyard` | The bot's cards that ended up in the graveyard. |
| `exile` | The bot's exiled cards. |

Players' board is **not** represented in any data structure of the app: it stays on the physical table (cards in play). Their life total, however, does get a single shared counter, `GameState.playersLife` — a plain number set at game start (`GameConfig.startingPlayersLife`) and edited manually from `GameBoard`, exactly like `bot.life`. It's tracked purely so the table has one place to see it alongside the bot's life; no engine logic ever reads or writes it.

## Game loop

Turns alternate physically as in a normal game (player 1 → 2 → 3 → 4 → bot → back to 1...). The app comes into play at two points:

- **During the players' turns**: if something happens involving the bot (players attack the bot, destroy one of its creatures, heal it, etc.), the operator manually updates `BotPanel` — edits the life field, or clicks/right-clicks a card in any zone to move it to another (see [Bot zones](#bot-zones-and-moving-cards)). This is also when the bot's hand — already drawn for the next turn — is exposed to player interaction: discarding it, forcing the bot to replay a specific card, etc.
- **On the bot's turn**: the operator clicks "Play bot turn" and the app resolves the whole turn automatically (see below), pausing only to have the combat outcome confirmed.

## Bot turn flow

Implemented in [`botTurnEngine.ts`](../src/engine/botTurnEngine.ts) (the pure single-step functions) and orchestrated by the reducer ([`gameReducer.ts`](../src/state/gameReducer.ts)) plus `GameBoard`.

**Drawing happens one turn ahead.** The bot doesn't draw the hand it's about to play — it draws it **at the end** of the previous turn's resolution (and, for the very first turn, at game start: see `startGame`), so it's already ready and visible in `BotPanel` for the whole span of the preceding players' turns. This is what makes it possible for players to interact with the bot's hand *before* it's played: getting it discarded (by removing cards, see [Bot zones](#bot-zones-and-moving-cards)), or forcing a card into it that the bot will replay next turn (useful, for example, to stall its development).

**The turn is revealed one card at a time, not all at once.** The table needs to be able to decide whether to respond to a specific bot card (e.g. counter it) before knowing what else the bot will play that turn — exactly like in a normal game, where cards are seen one at a time as they're cast. That's why the turn is a small state machine rather than a function that immediately produces the final result:

1. **Turn start** (`BEGIN_BOT_TURN`). Summoning sickness is cleared from creatures already in play (they've been under the bot's control since the start of its previous turn), and the hand is reordered for resolution: first the `TableInstruction`s (removal, damage, sacrifice, discard) — so the table "clears" the threat before the bot develops more creatures — then the `BotStateEffect`s (creatures, pump, life gain, extra draws), in the order they were drawn. This reordered hand **is** the turn's reveal queue: the phase switches to `resolvingTurn` and the first card is shown (`CurrentCardReveal`).
2. **Card-by-card reveal** (`RESOLVE_TURN_CARD`). At each step the table sees only the card at the front of the queue (name, image, effect) and decides:
   - **Resolve** — the effect applies normally (`resolveSingleCard`) and the card goes to the graveyard (creatures stay in play instead).
   - **Countered** — the card still goes to the graveyard (a countered card was cast anyway), but **no effect** applies: no creature enters play, no damage, no bonus draw (`counterSingleCard`).

   Either way the card leaves the queue (`bot.hand` shrinks by one card) and a row is added to the log (`TurnLogEntry`). This repeats until the queue is empty. If the hand is already empty at the start of the turn, it skips straight to step 3.
3. **End of turn** (automatic as soon as the queue empties). Attackers are declared — every bot creature without summoning sickness, including ones just summoned if they have `haste` — and the hand for the next turn is drawn: `config.drawPerTurn` cards (plus any extra draws, see below). `drawPerTurn` remains the main lever for making the bot more or less challenging against 4 players.
4. **Combat outcome.** If there are attackers, the app waits (`phase: 'awaitingAttackOutcome'`): once the table has resolved blocks physically, the operator clicks on the bot's attackers that died in `AttackOutcome`. Non-token creatures that died go to the bot's graveyard; tokens simply cease to exist. Otherwise it goes straight back to `idle`.
5. Life/library are recomputed (library already updated by step 3's draw) to determine the game's status (see below).

The state of the turn in progress (`GameState.pendingTurn`: the total extra draws accumulated so far) lives in the persisted `GameState`, not in local component state — refreshing the page mid-turn resumes exactly where it left off.

### Cards drawn by `DrawExtraBot`

If a card has a `DrawExtraBot` effect, the extra cards drawn are **not** resolved in the same turn: resolving them immediately would mean a turn that keeps growing while it's being revealed, instead of a fixed queue the table sees through card by card. They simply add to the draw count for the next turn (point 3): the resulting hand has `drawPerTurn + extraDraws` cards instead of just `drawPerTurn`. A countered `DrawExtraBot` card contributes nothing, like any other countered card.

## Bot zones and moving cards

`BotPanel` displays all 6 of the bot's tracked zones — board, permanents, hand, graveyard, exile, library — and lets you move **any card, from any zone, to any other zone** (`MOVE_CARD` in [`gameReducer.ts`](../src/state/gameReducer.ts)). This is meant to mirror any physical zone change involving the bot: mill, bounce, reanimation, correcting an operator mistake, etc. — not just "a bot creature dies in combat". Only the board and the permanents section stay always visible: they're what the operator checks every turn, while hand, graveyard, exile and library start out **collapsed** (a toggle for each, with the count always visible in the header) to keep the screen uncluttered.

On the board and in the permanents section, left-clicking = it goes to the graveyard (the default action, the most common case: the creature died / the permanent was destroyed). Right-click opens the menu with all the other destinations. In the other zones (hand, library, graveyard, exile) there's no equally obvious default action, so every card opens the move menu directly on click (left or right).

The destinations offered by the menu (`destinationOptions` in `BotPanel.tsx`) are always every zone except the starting one, with two exceptions:

| Destination | When it's available |
|---|---|
| Hand / Graveyard / Exile | Always (except from that same zone). |
| Library (top / bottom / position N) | Always (except from the library itself). |
| Board (in play) | Only if the card has a `CreateCreature` effect — only those have a body to put into play. The creature is rebuilt from scratch with the template's base stats (`buildBattlefieldCreatureFromCard` in `templates.ts`). |
| Permanents (in play) | Only if the card has a `CreatePermanent` effect — the `bot.permanents` equivalent of the row above (`buildPermanentFromCard` in `templates.ts`). |

### Stacking identical creatures/permanents

A Horde deck routinely puts many identical copies on the board at once (e.g. *Army of the Damned*'s 13 Zombie tokens) — rendering one full tile per instance would flood the grid with repeats carrying no extra information. `groupCreatures`/`groupPermanents` (`engine/battlefieldGrouping.ts`) group visually-indistinguishable entries (same name, stats, keywords, image) into a single stack, rendered by `CardStack` as one tile with a "×N" count badge in the corner. Grouping is by *base* stats, not the derived ones from `getEffectiveStats` — every creature on the board shares the same `bot.permanents`, so identical base stats always mean identical effective stats too. `summoningSick` is part of the grouping key on purpose: two otherwise-identical creatures with different sickness (one just summoned, one from a previous turn) render as two separate stacks, so the "summoning sickness" note on a stack is never ambiguous.

The same grouping is used in `AttackOutcome` (the combat-outcome screen — see below): identical attackers render as one stack too, and a click marks **one more** of its instances dead (badge text becomes "M/N DEAD"); once every instance is marked, one more click revives the whole stack, mirroring the plain toggle a lone (ungrouped) attacker already had.

Interaction is otherwise unchanged for a board/permanents stack: click/right-click acts on **one** instance from it (arbitrarily the first), exactly as it would for a single ungrouped tile — the stack just shrinks by one and its badge count updates as instances leave, with no new bulk-action semantics introduced.

**Tokens ignore the chosen destination**: by Magic's rules, a token ceases to exist if it would change zones, so whatever option is picked for a token the result is always "removed permanently" (the menu for tokens in fact shows a single entry).

### Player-granted tokens

Some players' own cards give the bot a token directly (e.g. "create a 1/1 Fish for an opponent"),
outside of anything in the bot's own deck. The "+ Add token" button next to the board header opens
`AddTokenModal`, where the operator fills in a name, power/toughness, keywords, and optionally a
type line and colors, then dispatches `ADD_CUSTOM_TOKEN` — a `BattlefieldCreature` built the same
way as any other token (`isToken: true`, no `sourceDeckCardId`, summoning sick unless `haste` is
picked), just without a `DeckCardConfig` behind it. It follows the same zone rules as every other
token above: once it leaves the battlefield, it ceases to exist regardless of destination.

### Tokens: real Scryfall art, and the type/colors fallback

A `count > 1` `CreateCreature` card can carry `tokenScryfall` — the real Scryfall *token* card
(not the spell that creates it) matching the token's name/power/toughness/keywords, e.g. the
actual printed "Zombie" token, not *Army of the Damned*'s own card (see
[deck-format.md](deck-format.md#createcreature)). When present, every token from that card gets a
real image and its `typeLine`/`colors` straight from that token card, exactly like a `count === 1`
card gets its own image from `DeckCardConfig.scryfall`. Both preset decks have this bundled locally
the same way regular cards do — see "Local card bundle" in `architecture.md`.

`tokenTypeLine`/`tokenColors` (plain text, no image) are the fallback for tokens without a bundled
`tokenScryfall` — mainly custom decks, since there's no deck-builder UI yet to attach real token art
by hand. `BattlefieldCreature.typeLine`/`colors` end up set one way or another regardless of the
source (`tokenScryfall`, the plain-text fields, the operator's input in `AddTokenModal` for
player-granted tokens, or copied from a real card's own Scryfall data for a `count === 1`
`CreateCreature`/a card rebuilt via `buildBattlefieldCreatureFromCard`). Consistent with the rest of
the app's philosophy (see "What the app tracks" above), the engine **never reads any of these
fields for logic** — no template or instruction is conditioned on them. `typeLine`/`colors` exist
purely so the table has something to check when a token has no card image to look at: whether a
players' anthem effect applies to it, or whether it's a valid target for a color- or type-restricted
removal spell. `BotPanel`/`AttackOutcome` only render that fallback line for creatures without an
image (a real image already shows its own type/colors), as small color pips (`ColorDots`) plus the
type text.

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
| `PumpBotBoard` | `powerBonus`, `toughnessBonus`, `grantKeywords[]` | One-shot buff, baked directly into stats, applied only to bot creatures in play **at the time of resolution** — a deliberate simplification, see below. |
| `CreatePermanent` | `permanentType` (`artifact` \| `enchantment`), `powerBonus`, `toughnessBonus`, `grantKeywords[]` | Puts a `BotPermanent` into `bot.permanents` — a genuinely **persistent** anthem: the buff is derived (`getEffectiveStats`, see below) everywhere a creature's stats are read, so it also reaches creatures that enter play *after* this one resolves, and disappears again if the permanent is later destroyed/exiled like any other card. |
| `GainLifeBot` | `amount` | The bot gains life. |
| `DrawExtraBot` | `amount` | The bot draws extra cards (resolved next turn, see above). |

#### `PumpBotBoard` vs. `CreatePermanent`: two different anthem trade-offs

`PumpBotBoard` predates `CreatePermanent` and stays deliberately simple: it mutates `BattlefieldCreature.power`/`toughness`/`keywords` directly, once, for whatever's on the board at that instant. It's used today to represent creature-based "lords" (e.g. *Death Baron*, *Regal Imperiosaur*) — the trade-off there is losing the lord's own body as a separate threat in exchange for an accurate team-wide buff, since the engine has no way to keep a creature *and* a continuous effect tied to it. It's a fine reading for a card whose lord ability *is* its whole identity, but it does mean a creature the bot draws after the lord resolves gets no benefit from it, and there's no way to "kill" the anthem short of the whole board being wiped.

`CreatePermanent` exists for real, standalone artifacts/enchantments (an anthem, a keyword-granter — see `docs/roadmap.md` item 4), where that trade-off doesn't hold: the card has no creature body to give up, and destroying the permanent should visibly turn the anthem off. It resolves into a `BotPermanent` (its own zone, `bot.permanents`) instead of touching any creature's stats directly. Every place a creature's stats are *shown* — `BotPanel`'s board grid, `AttackOutcome`, the attackers line in the turn log — calls `getEffectiveStats(creature, bot.permanents)` (`engine/templates.ts`) instead of reading `power`/`toughness`/`keywords` off the creature directly: base stats plus the sum of every active permanent's bonus, recomputed on every read rather than baked in once. This is also why a `grantKeywords: ['haste']` permanent is more than cosmetic: `declareAttackers` checks the *effective* keyword set, so a creature that's still summoning-sick can attack anyway while such a permanent is in play, same as a real haste anthem.

`bot.permanents` is a card's own zone, parallel to `battlefield`: a `CreatePermanent` card leaving play (destroyed, exiled, bounced) follows the same "move any card to any zone" path as everything else (see [Bot zones](#bot-zones-and-moving-cards)) — it just isn't a creature, so it never attacks/blocks and isn't offered as a combat-outcome casualty.

### `TableInstruction` — generate text only, don't touch tracked state

| Template | Parameters | Effect |
|---|---|---|
| `RemovalInstruction` | `mode` (`highestPower` \| `highestToughness` \| `highestManaValue` \| `random` \| `all`), `count`, `destroyOrExile` | Instruction like "Destroy/Exile [the creature / the N creatures / all creatures] [with highest power / ... / at random]". |
| `DamageInstruction` | `amount`, `target` (`eachPlayer` \| `creatureHighestPower` \| `creatureHighestToughness` \| `creatureRandom` \| `allCreatures`) | Instruction like "Deal N damage to ..." or "Each player loses N life". |
| `SacrificeInstruction` | `perPlayer` (bool), `count` | "Each player sacrifices N creatures" or "Players jointly choose N creatures to sacrifice in total". |
| `DiscardInstruction` | `perPlayer` (bool), `count` | Same pattern, for discarding cards. |

The exact text is generated by [`instructionText.ts`](../src/engine/instructionText.ts).

For `TableInstruction`s, the rule is **no arbitrary choice made by the bot**, not "no single target." Two families satisfy it: symmetric modes/targets applied the same way to every player (`all`, `allCreatures`, `eachPlayer`, the two sacrifice/discard `*Instruction`s — real wraths and edicts), and single-target modes with an **objective criterion** the table applies to its own board (`highestPower`/`highestToughness`/`highestManaValue`/`random` — real single-target removal like "Doom Blade" reinterpreted this way). Both are equally valid; the bot never picks a target either way. The [zombie](../src/data/zombieDeck.ts) and [dinosaur](../src/data/dinosaurDeck.ts) decks currently only use the symmetric family — the `highestPower`/etc. modes are supported and tested (see `botTurnEngine.test.ts`) but not yet used by either preset deck.

### `errata`: custom rules for cards no template can express on its own

A `DeckCardConfig` can have an optional `errata: string` field that **replaces** the text generated by the template for that card (see [deck-format.md](deck-format.md#errata--custom-rules)). Use it sparingly, only when the real card has a modal resolution that depends on the players' board (which the bot can't see) and no existing `mode`/`target` captures it — e.g. *Extinction Event*, which asks you to pick the option (mana value ≤3 or ≥4) that would hit more of the players' creatures. It shouldn't be used for a card whose only variable is a **number**: those are curated as several deck entries with a fixed number each (see below), not an errata.

### Numeric parameters: always a fixed number

Every numeric parameter of a template (`count`, `power`, `amount`, ...) is a plain fixed number, decided by the deck curator — the app never asks the operator a question mid-turn. A real card whose printed effect scales with a variable X (an artifact count, devotion, "-X/-X" with X chosen) is represented as **several deck entries, one per fixed X**, spread across the `impact` tiers — e.g. *Toxic Deluge* (real text: "-X/-X to all creatures") appears three times in both preset decks, at X=1/3/5 for impact 1/2/3, instead of one entry that asks the operator to look at the board and type a number. See *Toxic Deluge*, *Triceraton Commander*, and *Debt to the Deathless* in the [zombie](../src/data/zombieDeck.ts)/[dinosaur](../src/data/dinosaurDeck.ts) decks for real examples.

## Deck curation criteria

The app ships with two prebuilt decks, listed in [`src/data/presets.ts`](../src/data/presets.ts) and loadable from the "New game" screen (`SetupScreen`, before starting the game — once a game is in progress the bot's deck stays the one locked into `deckSnapshot`, see below): [zombie](../src/data/zombieDeck.ts) and [dinosaur](../src/data/dinosaurDeck.ts), each a themed deck with many copies of the same cards (as a real Horde deck needs, to last several turns). The cards chosen for these decks — and the ones added by hand from the deck builder — must have a real effect that maps cleanly and directly onto one of the templates above: vanilla creatures or ones with simple keywords, unconditional removal, flat damage, flat buffs, single-variable scaling effects. Cards with complex Oracle text, multiple conditions, replacement effects, or stack interactions are deliberately avoided — not because the system couldn't support them in theory, but because forcing them into a template would distort their effect. When a real card has more nuance than can be represented (e.g. "destroy target non-black creature" simply becomes "destroy a creature"), the simplest reading is always chosen, even if that makes it slightly stronger or weaker than the original — an accepted trade-off, balanced out by the difficulty levers (see below).

Every card in both prebuilt decks also carries `DeckCardConfig.category` (`CardCategory`, see [deck-format.md](deck-format.md#card-category)) — the official tactical role (`horde`, `bigBad`, `grunt`, `specificRemoval`, `aoe`, `boardClear`, `lord`, `teamPump`, `draw`, `lifeGain`, `faceDamage`, `discard`), assigned by hand and independent of `effect.kind`.

### Creature accuracy: real stats, and when to swap the card instead of the number

A `CreateCreature` card's own body (`count: 1`) always uses the real card's **printed power,
toughness, and keywords** — never a number picked to "feel right" for the curve. Verify against
Scryfall, don't estimate from memory or reuse a neighboring card's stats.

Every creature loses *some* text in this mapping — that's the whole premise of the template system
(see "What the app tracks" above). A **single** minor or narrow ability (an Enrage trigger, a
one-shot sacrifice-to-destroy-an-artifact clause, an upkeep drawback) is dropped silently, same as
any other simplification, and the card stays. But when a real creature's text carries **two or
more** abilities beyond its keywords — or a single ability that's really a second template in
disguise (a lord's team-wide buff, an ETB token-maker, a keyword this engine has no `Keyword` for,
like protection or swampwalk) — showing it as a plain body misrepresents what the card actually
does, not just trims it. In that case, don't curve the numbers to compensate and keep the card:
swap it for a **different real card** that actually is vanilla, vanilla-plus-keywords, or an
unconditional token-maker, so what's on screen is what the table would expect from the name and
image. (A card whose dropped ability *is* cleanly another template — e.g. a real lord — can instead
be remapped to that template, own body traded away, same as the existing lords below; that's a
judgment call between "swap the card" and "remap the same card," not a rule to automate.)

A conditional keyword that's true almost the entire game in context (e.g. "has vigilance as long as
you control another Dinosaur," in a ~80-card mostly-Dinosaur deck) is simplified to unconditional,
consistent with the general "simplest reading, even if slightly stronger/weaker" principle above —
that's not the same as inventing a keyword the real card never had.

## Difficulty levers

Set in `SetupScreen` when starting a game (`GameConfig`):

- **`drawPerTurn`** — how many cards the bot draws each turn. The main lever: more cards drawn means more threats/removal per turn.
- **`startingLife`** — the bot's starting life, to absorb the fact that it's facing 4 players at once.
- **`playerCount`** — number of players at the table; saved for reference but not used in any engine calculation (since players are treated collectively, not individually).
- **`startingPlayersLife`** — initial value of the shared players' life counter (`GameState.playersLife`). Not a difficulty lever in any engine sense — it's not read by any effect — just the starting point for the convenience counter shown in `GameBoard`.
