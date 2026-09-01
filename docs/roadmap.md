# Roadmap — planned evolutions

A living backlog of improvements to discuss/prioritize before implementing. Unlike the other docs
(which describe what the app *is*), this one describes what it *could become* — nothing here is
built yet. Each item below elaborates on a starting idea into concrete options, trade-offs, and the
open questions worth resolving before writing code.

- [~] 1. [Bigger, more frequent bot swarms](#1-bigger-more-frequent-bot-swarms) — option B (more swarm cards) partly done alongside item 3; option A (draw-pacing tuning) still open
- [x] 2. [Wider desktop layout](#2-wider-desktop-layout) — options 1 & 2 done (option 3, the two-column rework, still open)
- [x] 3. [Player-granted tokens for the bot](#3-player-granted-tokens-for-the-bot)
- [x] 4. [Artifacts & enchantments in the bot's deck](#4-artifacts--enchantments-in-the-bots-deck)

## 1. Bigger, more frequent bot swarms

**Goal:** the horde should feel like more bodies on board — smaller creatures, fewer keywords, but
more of them — rather than a handful of individually strong threats.

**What already supports this.** Two independent levers already exist and don't need new code:

- `CreateCreature.count` ([types.ts](../src/types.ts)) already accepts any fixed number >1 — a
  single card can create several tokens at once (`tokenName` covers the shared name). Nothing
  requires count to stay at 1.
- `computeBaseDrawCount` and `computeCardWeight` ([difficulty.ts](../src/engine/difficulty.ts))
  are already two *separate* dials — "how many cards per turn" and "how strong a card drawn is" —
  driven by the same turn/player/difficulty inputs. They were deliberately kept decoupled instead
  of one deriving the other, which is exactly the split the question below is about.

**The open design question, spelled out:**

| Approach | Mechanism | Pros | Cons |
|---|---|---|---|
| **A. More cards per turn, weaker each** | Raise `computeBaseDrawCount`'s ramp (or the `impact` distribution skews toward 1/2) so the bot's hand is bigger but individually less threatening | Reuses 100% of the existing pipeline (draw → weight → resolve); no new template code | Card weighting already biases low-impact cards to be "always available" — pushing further just means less *variety* per turn, not necessarily a "swarm" feel, since each low-impact card is still typically a single creature |
| **B. Fewer cards, but each creates N tokens** | Curate more `CreateCreature` cards with `count` set to a fixed N (e.g. 3), small `power`/`toughness`, `keywords: []` | Directly produces the "swarm" visual/tactical effect (many bodies from one draw); no engine change, just deck content | Token count is fixed per deck entry, decided by the curator — it can't scale with turn number on its own; a card meant to feel bigger later needs its own higher-`impact` copy with a bigger fixed N, same pattern as *Toxic Deluge*'s fixed-X tiers |

**Recommendation:** start with **B** — it's pure deck curation (add swarm-style cards to
`zombieDeck.ts`/`dinosaurDeck.ts` and any new preset, weighted `impact: 1`) and directly targets
the "more, smaller bodies" feel the request describes. Treat **A** as a secondary tuning pass on
`difficulty.ts` only if B alone doesn't ramp fast enough — the two dials can be adjusted
independently without touching each other's code.

**Open question for the next session:** do we want a dedicated "token swarm" preset deck (all small
X/X vanilla tokens, e.g. a literal Zombie/Squirrel horde), or should existing presets just get a
handful of swarm cards mixed in? Affects how much deck-authoring work this is.

**Status: option B started.** While implementing item 3 (below), `zombieDeck.ts` gained two new
real swarm cards — *Moan of the Unhallowed* (2× 2/2 Zombie, impact 1) and *Stir the Sands* (3× 2/2
Zombie, impact 2) — plus an extra copy each of the existing token-makers (*Army of the Damned*,
*Grave Titan*); `dinosaurDeck.ts` got an extra copy of *Crested Herdcaller*. Real Dinosaur-typed
multi-token cards are scarce (Scryfall search turned up essentially none besides what was already
in the deck), so that deck leans more on duplicate copies than new cards. Option A (tuning
`difficulty.ts`'s draw pacing) is still untouched — worth revisiting only if the deck-curation pass
above doesn't ramp the swarm feel fast enough on its own.

## 2. Wider desktop layout

**Current state.** [App.tsx](../src/App.tsx) wraps the header and `<main>` in a fixed
`max-w-5xl` (~64rem/1024px), regardless of viewport — on a desktop/laptop screen (the primary
use case per the request) this leaves a lot of unused horizontal space on both sides. Grids that
depend on that width — the bot board and every `RefZoneSection` in
[BotPanel.tsx](../src/components/BotPanel.tsx) — cap at `lg:grid-cols-4`, so even a wide monitor
never shows more than 4 cards per row.

**Options, roughly in increasing effort:**

1. **Raise the width cap.** `max-w-5xl` → `max-w-7xl` or `max-w-screen-2xl` on the Game view
   (keep Deck/Weigh views narrower if dense text works better there). Pure Tailwind class change.
2. **Add wider breakpoints to the grids.** `BotPanel`'s board/zone grids stop at `lg:grid-cols-4`
   — add `xl:grid-cols-5`/`2xl:grid-cols-6` so a wide screen actually shows more cards per row
   instead of just more whitespace around the same 4 columns.
3. **Rework `GameBoard` into a two-column desktop layout** (e.g. left column = bot board/life,
   right column = current card reveal/turn log), collapsing to today's single stacked column below
   some breakpoint. Bigger change — worth a quick before/after mock before committing, since it
   changes where the operator's eyes go during turn resolution, not just how much fits on screen.

**Recommendation:** do 1+2 first (low-risk, immediate improvement, no behavior change). Treat 3 as
a separate follow-up once we see how much 1+2 alone helps — it changes interaction flow, not just
sizing, so it deserves its own look before implementing.

**Status: 1 & 2 implemented.** `App.tsx` now sizes the header/`<main>` per view
(`CONTENT_MAX_W`) — `max-w-7xl` (1280px) on the Game view, `max-w-5xl` (1024px, unchanged) on
Deck/Weigh; the footer stays at its own fixed width regardless of view, since it's a dense legal
paragraph rather than game data. The bot board grid, the four zone grids (hand/graveyard/exile/
library), and the attack-outcome grid (`BotPanel.tsx`, `AttackOutcome.tsx`) all gained
`xl:grid-cols-5 2xl:grid-cols-6` on top of the existing `sm:grid-cols-3 lg:grid-cols-4`. Verified
with a Playwright pass at a 1920px viewport: Game view's `<main>` measures 1280px vs. Deck view's
1024px as expected, the library zone renders a clean 6-per-row grid with no overflow, and no
console errors surfaced through a full setup → play turns → expand zones → switch tabs flow.

## 3. Player-granted tokens for the bot

**The ask:** players' own cards might give the *bot* tokens (e.g. "create a 1/1 Fish for an
opponent", "the Horde gets a 3/3 Beast") — the operator needs a way to drop an arbitrary creature
onto the bot's board on the spot, outside of the normal turn-resolution flow.

**Current gap.** Every `BattlefieldCreature` today traces back to a `DeckCardConfig` with a
`CreateCreature` effect — either resolved during a turn, or reconstructed from one when an operator
moves a card back to the board via `BotPanel`'s context menu
(`buildBattlefieldCreatureFromCard` in [templates.ts](../src/engine/templates.ts)). There is no
path to add a creature that isn't backed by a deck card at all.

**Design sketch** (matches the "generic form" idea from the request):

- A new reducer action, e.g. `ADD_CUSTOM_TOKEN`, taking `{ name, power, toughness, keywords }` and
  pushing a new `BattlefieldCreature` onto `bot.battlefield` — `isToken: true`, no
  `sourceDeckCardId`, `summoningSick: true` unless `haste` is among the chosen keywords (consistent
  with how tokens behave everywhere else in the app).
- A small "+ Add token" control in `BotPanel`, near the board header, opening a form that reuses
  existing building blocks: a name field, two number inputs (power/toughness), and the existing
  `KeywordPicker` component — no new input widgets needed.
- **Type line / color:** the engine doesn't read creature type or color anywhere today (per
  `game-design.md`'s "no Oracle text interpretation" philosophy — the app only ever needs
  power/toughness/keywords to function). So type ("Fish", "Beast") is just free text folded into
  `name` (e.g. "Fish" as the token's name, same as `tokenName` works for deck-based tokens), and
  color would be **purely cosmetic** if added at all — worth confirming it's wanted before adding a
  field the engine will never use for anything beyond display.

**Open question for the next session:** should the token form allow re-using it as a shortcut for
*curated* deck tokens too (i.e. merge with `CreateCreature`'s existing token path), or keep it
fully separate as an "ad-hoc, not tracked in any deck" mechanism? Keeping it separate is simpler
and matches the actual use case (a one-off token from a player's card, not a repeatable deck entry).

**Status: implemented**, kept separate from deck-based tokens as suggested above (`ADD_CUSTOM_TOKEN`
in `gameReducer.ts`, no `sourceDeckCardId`). Went a bit further than the original sketch: type line
and colors weren't just added to the custom-token form (`AddTokenModal` + `ColorPicker`) — they were
threaded through `CreateCreature` too (`tokenTypeLine`/`tokenColors`, exposed in `EffectForm` for
Custom decks, and set by hand on every token-making card in both preset decks), and real single-body
cards now carry their own Scryfall `typeLine`/`colors` onto their `BattlefieldCreature` as well. So
any bot creature without a card image (any token, custom or deck-drawn) shows a small color-pip +
type line (`ColorDots`, rendered in `BotPanel` and `AttackOutcome`) for the table to check against
buffs/removal — the scenario named in the original ask, not just the player-granted-token case.

## 4. Artifacts & enchantments in the bot's deck

**The ask:** give the bot's deck static/global effects beyond creatures — generic ones like
"+1/+1 to all creatures", "double damage dealt by bot creatures", "all bot creatures have double
strike".

**Why this is the biggest item here.** `PumpBotBoard` already exists, but by design it's a
**one-shot** permanent stat change applied only to creatures in play *at the moment it resolves*
(explicitly called out as "a deliberate simplification" in
[game-design.md](game-design.md#botstateeffect--modify-the-bots-tracked-state)) — a creature that
enters afterward is unaffected. There is no concept today of a persistent object in play that keeps
affecting the board, including creatures that show up *later* — which is exactly what a real
artifact/enchantment does. Introducing that changes how creature stats are computed at all: today
`BattlefieldCreature.power`/`toughness` are concrete numbers written once (at creation or at
`PumpBotBoard` resolution); a real "static anthem" effect needs stats to become **derived** (base +
sum of active continuous effects) wherever they're read — board rendering, combat.

**Two tiers of solution, different scope:**

- **Cheap, incremental (no new persistent zone):** add more one-shot `BotStateEffect` templates
  that fire at resolution time only, e.g. `DoubleBotDamageThisTurn` (or "for the rest of the game"
  as a global flag rather than a full continuous-effect object). Cheaper to build, reuses today's
  data model, but doesn't behave like a real, destroy-able artifact/enchantment — it's closer to
  another instant-speed effect than a permanent.
- **Faithful, bigger change:** introduce a `ContinuousEffect` concept —
  `{ id, sourceDeckCardId, kind: 'staticBuff' | 'doubleDamage' | 'grantKeyword', params }` — tracked
  in a new `BotState` field (e.g. `permanents`), plus a `getEffectiveStats(creature, activeEffects)`
  helper used everywhere stats are shown/used instead of reading `power`/`toughness` directly.
  Artifacts/enchantments become a new kind of permanent with their own place in `BotPanel` (they're
  not creatures, so they don't belong in the board grid as-is) and their own destroy/exile path
  (`destinationOptions` in `BotPanel.tsx` would need a case for a permanent that isn't a creature).

**Recommendation:** don't start here. This is the one item that touches the core data model
(how creature stats are computed, not just what a card can say), so it deserves its own focused
design pass — likely after items 1–3 are done and validated at the table, since a couple of
sessions of actual play may reshape which specific effects (anthem? double strike? double damage?)
are actually worth building first.

**Status: implemented**, going with the "faithful" tier above rather than the cheap one-shot-flag
route: a new `CreatePermanent` effect (`types.ts`) puts a `BotPermanent` into a new `BotState.permanents`
zone instead of touching any creature directly. Creature stats became derived everywhere they're
*shown* — `getEffectiveStats(creature, bot.permanents)` in `engine/templates.ts`, called from
`BotPanel`'s board grid and from `declareAttackers` (`botTurnEngine.ts`) — instead of being read off
`BattlefieldCreature.power`/`toughness`/`keywords` directly, so a permanent's buff reaches creatures
summoned *after* it resolves and disappears again once the permanent is destroyed/exiled. A
`grantKeywords: ['haste']` permanent is more than cosmetic too: `declareAttackers` checks the
*effective* keyword set, so an otherwise summoning-sick creature can attack while such a permanent
is in play. `bot.permanents` follows the same "move any card to any zone" path as every other zone
(`MOVE_CARD`, a new `permanents` destination gated on `CreatePermanent`), with its own "Bot
permanents" section in `BotPanel` (left-click = destroy, right-click = other destinations, same UX
as the board). The existing creature-based `lord` cards (`PumpBotBoard`, own body traded away) were
deliberately left untouched — this item was scoped to real, standalone artifacts/enchantments, which
have no body to trade away in the first place. Both preset decks gained 8 new real, Scryfall-verified
cards (2 copies each of the 6 lower-impact ones, 1 each of the 2 impact-3 ones): *Glorious Anthem*,
*Shared Triumph*, *Concordant Crossroads* (haste), *Spear of Heliod*, *Intangible Virtue*
(+1/+1 + vigilance), *Dictate of Heliod* (+2/+2), *True Conviction* (double strike + lifelink — the
exact "all bot creatures have double strike" example from the ask above), and *Eldrazi Monument*
(+1/+1 + flying) — see the "Artifacts & enchantments" section in
[dinosaurDeck.ts](../src/data/dinosaurDeck.ts)/[zombieDeck.ts](../src/data/zombieDeck.ts) for the
per-card simplification notes (mana-cost/tap abilities and indestructible are dropped the same way
the app already drops anything mana- or upkeep-trigger-related elsewhere). "Double damage dealt by
bot creatures" from the original ask was deliberately **not** built: the app never computes combat
damage (blocks/damage stay physical, see "Philosophy" above), so there's nothing in the engine for
such a flag to actually multiply — it would only ever be a reminder string, better left as table
knowledge than a fake lever.

---

**Suggested order:** 1 (deck curation, no code risk) → 2 (low-risk UI) → 3 (small, self-contained
feature) → 4 (design pass, then implementation). All four items are now implemented; nothing here
is scheduled — revisit and reorder freely as priorities shift as new ideas come up.
