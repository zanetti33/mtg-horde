import type { DeckCardConfig } from '../types'
import { attachLocalScryfallData } from './attachLocalScryfallData'

// Zombie-themed deck: ~81 real cards, with multiple copies of the same
// cards (like a real Horde deck, meant to last many turns). Follows the
// same deck-curation criteria as the prebuilt deck (see docs/game-design.md):
// for instructions aimed at the players (removal, damage, sacrifice,
// discard), only cards free of bot judgment are chosen — edicts ("each
// player sacrifices..."), symmetric sweepers ("destroy all creatures",
// "-X/-X to all creatures"), and single-target removal with an objective
// criterion (`RemovalMode`: highestPower/highestToughness/highestManaValue/
// random — see Soul Shatter/Consumed by Greed below for this deck's own use
// of that pattern). The bot can't see the players' board, so any instruction
// left to the table must already be free of arbitrary choices made by the bot.
//
// Extinction Event is the one exception that needs an errata: the real
// text is modal ("destroy creatures with mana value 3 or less, OR those
// with mana value 4 or greater") and no existing RemovalMode expresses "the
// table picks the more impactful option" — see the `errata` field below.
//
// Toxic Deluge and Debt to the Deathless have a real X the table would
// normally choose by looking at the board (Toxic Deluge's -X/-X, Debt to
// the Deathless's devotion to black). Rather than ask the operator at
// resolution time, X is fixed per deck entry, with three copies spanning
// the impact tiers (X=1/3/5 -> impact 1/2/3) instead of one entry with a
// variable X.
//
// Every CreateCreature that produces tokens (count > 1) also carries tokenTypeLine/tokenColors —
// purely informational (the engine never reads them), shown on the token card in BotPanel/
// AttackOutcome since tokens have no card image for the table to check colors/type against their
// own buffs or removal. See Color/BattlefieldCreature.typeLine in types.ts.
//
// Real anthem lords (Death Baron, Undead Warchief, Risen Executioner,
// Diregraf Captain) are mapped to `PumpBotBoard` instead of `CreateCreature`
// — their actual Oracle text is "other Zombies get +X/+Y", so representing
// them as a plain vanilla body (as an earlier version of this deck did)
// throws away the one thing that makes them a lord. The trade-off (per the
// usual curation criteria) is losing their own small body in exchange for
// the accurate team-wide buff. Real reanimation spells (Zombify, Rise from
// the Grave) have no dedicated template — the closest simplification is
// `CreateCreature` using the spell's own card image, same trade-off already
// made for Bane of Progress in the default deck. Grave Titan and From
// Under the Floorboards are mapped to their token-making half (not their
// own body) since that's the more distinctive real effect. Moan of the
// Unhallowed and Stir the Sands round out the "several tokens from one
// card" pool with small, unconditional swarm plays (2 and 3 tokens) — see
// docs/roadmap.md's swarm item.
//
// `impact` (1 low / 2 medium / 3 high) grades how much of a threat each card
// is, and feeds the draw-weighting in engine/difficulty.ts — see the note in
// docs/game-design.md.
//
// Every `CreateCreature` body's power/toughness/keywords match the real card's printed stats —
// see "Creature accuracy" in docs/game-design.md#deck-curation-criteria. A creature whose real
// text carries two or more abilities beyond keywords (something this engine's templates can't
// represent, e.g. Cemetery Reaper's lord ability plus its activated graveyard ability, or
// Diregraf Colossus' scaling counters plus its token trigger) isn't curved down and kept anyway —
// it's swapped for a different real card that actually is vanilla, vanilla-plus-keywords, or an
// unconditional token-maker. A single minor/narrow ability (a self-mill trigger, an upkeep
// drawback) is still dropped silently, same as always.
//
// The "Artifacts & enchantments" section below is the deck's set of `CreatePermanent` cards — real,
// persistent anthems (see docs/roadmap.md item 4 and that effect's own doc comment in types.ts),
// as opposed to the `PumpBotBoard`-mapped lords above which apply once, at resolution, and don't
// reach creatures summoned afterward. See that section's own comment for card-by-card notes.

let counter = 0
function id(): string {
  counter += 1
  return `zombie-${counter.toString().padStart(2, '0')}`
}

const zombieDeckRaw: DeckCardConfig[] = [
  // --- Creatures -------------------------------------------------------
  { id: id(), scryfallName: 'Diregraf Ghoul', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Diregraf Ghoul', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Diregraf Ghoul', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Diregraf Ghoul', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  // Gravecrawler swapped out: its real "cast from your graveyard" ability has no equivalent in this
  // engine (cards that reach the graveyard just stay there, for every card in both decks), and
  // "can't block" is a second real restriction on top — two real clauses this body can't carry.
  // Scathe Zombies is a real, purely vanilla body instead.
  { id: id(), scryfallName: 'Scathe Zombies', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Scathe Zombies', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Scathe Zombies', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Scathe Zombies', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: 'Walking Corpse', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Walking Corpse', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Walking Corpse', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  // Relentless Dead swapped out: real text is menace plus two separate death-triggered recursion
  // abilities (return to hand, or reanimate another Zombie) this format has no way to represent.
  // Two-Headed Zombie is a real, purely vanilla+menace body instead.
  { id: id(), scryfallName: 'Two-Headed Zombie', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 2, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Two-Headed Zombie', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 2, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Two-Headed Zombie', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 2, keywords: ['menace'] } },

  // Cemetery Reaper and Lord of the Undead swapped out: both are real Zombie lords ("other Zombies
  // you control get +1/+1") *plus* a separate activated graveyard ability — the old entries showed
  // them as plain vanilla bodies, dropping the one thing that actually defines either card, which
  // is exactly the kind of loss this pass is meant to catch. Rather than turn two more cards into
  // `lord`/`PumpBotBoard` (the deck already has ten), they're replaced with real, purely vanilla
  // Zombies instead — Undead Minotaur and Warpath Ghoul.
  { id: id(), scryfallName: 'Undead Minotaur', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 3, keywords: [] } },
  { id: id(), scryfallName: 'Undead Minotaur', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 3, keywords: [] } },

  { id: id(), scryfallName: 'Warpath Ghoul', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Warpath Ghoul', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 2, keywords: [] } },

  // Diregraf Colossus swapped out: its real body is a variable 2/2-plus-counters (scaling with
  // Zombie cards in the graveyard) with a second, repeatable token-making trigger on top — no
  // single fixed body captures it. Lazotep Behemoth is a real, purely vanilla body instead.
  { id: id(), scryfallName: 'Lazotep Behemoth', impact: 2, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Lazotep Behemoth', impact: 2, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 4, keywords: [] } },

  // Plague Belcher swapped out: real text is menace plus an ETB drawback (-1/-1 counters on your
  // own creature) plus a death-triggered life-loss trigger — two real clauses beyond the keyword.
  // Cursed Minotaur is a real, purely vanilla+menace body instead.
  { id: id(), scryfallName: 'Cursed Minotaur', impact: 2, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 2, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Cursed Minotaur', impact: 2, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 2, keywords: ['menace'] } },

  { id: id(), scryfallName: 'Rotting Regisaur', impact: 3, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 7, toughness: 6, keywords: [] } },
  { id: id(), scryfallName: 'Rotting Regisaur', impact: 3, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 7, toughness: 6, keywords: [] } },

  { id: id(), scryfallName: 'Gray Merchant of Asphodel', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Gray Merchant of Asphodel', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 4, keywords: [] } },

  // Zombie Master swapped out: its real abilities (granting swampwalk and a regenerate ability to
  // other Zombies) use mechanics this engine doesn't model at all (no Keyword for either). Gutter
  // Skulk is a real, purely vanilla body instead.
  { id: id(), scryfallName: 'Gutter Skulk', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  {
    id: id(),
    scryfallName: 'Army of the Damned',
    impact: 3, category: 'horde',
    effect: { kind: 'CreateCreature', count: 13, power: 2, toughness: 2, keywords: ['flying'], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
  },

  // --- Lords (real anthem effects, mapped to PumpBotBoard — see file header) ---
  {
    id: id(),
    scryfallName: 'Death Baron',
    impact: 2, category: 'lord',
    effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: ['deathtouch'] },
  },
  {
    id: id(),
    scryfallName: 'Death Baron',
    impact: 2, category: 'lord',
    effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: ['deathtouch'] },
  },
  { id: id(), scryfallName: 'Undead Warchief', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 2, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Undead Warchief', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 2, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Risen Executioner', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Risen Executioner', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Diregraf Captain', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Diregraf Captain', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Lord of the Accursed', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Tomb Tyrant', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },

  // --- Artifacts & enchantments (real, persistent anthems — CreatePermanent) --------------------
  // Unlike the lords above (own creature body traded away for PumpBotBoard, applied once at
  // resolution — see file header), these are genuinely non-creature permanents: they sit in
  // `bot.permanents`, so the buff also reaches creatures drawn/summoned *after* the card resolves,
  // and disappears again if the permanent itself is later destroyed/exiled (see game-design.md).
  // Every card here is real and verified on Scryfall; a mana-cost/tap activated ability riding
  // along the anthem (Spear of Heliod's "{1}{W}{W}, {T}: destroy...") is dropped silently, same
  // reasoning as every other simplification in this app: the engine never tracks mana or taps, so
  // that ability could never be used here regardless. Eldrazi Monument's real text also grants
  // indestructible and has a recurring upkeep sacrifice cost — indestructible isn't one of this
  // engine's `Keyword`s (dropped, same as any keyword with no `Keyword` slot) and the upkeep cost
  // isn't tracked (no recurring-trigger concept exists), so it's simplified down to its flying/
  // +1/+1 anthem alone and priced at impact 3 to compensate for the missing drawback. Shared
  // Triumph's real text asks the caster to choose a creature type as it enters — fixed to Zombie
  // here, same "decided by the deck curator, not asked at the table" precedent as Triceraton
  // Commander/Toxic Deluge's fixed X (see file header). Intangible Virtue's real restriction to
  // token creatures is dropped (applies to every bot creature instead) per the "simplest reading,
  // even if slightly stronger" rule in docs/game-design.md — a good fit for this deck's many
  // zombie-token makers regardless.
  { id: id(), scryfallName: 'Glorious Anthem', impact: 1, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Glorious Anthem', impact: 1, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Shared Triumph', impact: 1, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Shared Triumph', impact: 1, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Concordant Crossroads', impact: 1, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 0, toughnessBonus: 0, grantKeywords: ['haste'] } },
  { id: id(), scryfallName: 'Concordant Crossroads', impact: 1, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 0, toughnessBonus: 0, grantKeywords: ['haste'] } },
  { id: id(), scryfallName: 'Spear of Heliod', impact: 2, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'artifact', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Spear of Heliod', impact: 2, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'artifact', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Intangible Virtue', impact: 2, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 1, toughnessBonus: 1, grantKeywords: ['vigilance'] } },
  { id: id(), scryfallName: 'Intangible Virtue', impact: 2, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 1, toughnessBonus: 1, grantKeywords: ['vigilance'] } },
  { id: id(), scryfallName: 'Dictate of Heliod', impact: 2, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 2, toughnessBonus: 2, grantKeywords: [] } },
  { id: id(), scryfallName: 'Dictate of Heliod', impact: 2, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 2, toughnessBonus: 2, grantKeywords: [] } },
  { id: id(), scryfallName: 'True Conviction', impact: 3, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'enchantment', powerBonus: 0, toughnessBonus: 0, grantKeywords: ['doublestrike', 'lifelink'] } },
  { id: id(), scryfallName: 'Eldrazi Monument', impact: 3, category: 'lord', effect: { kind: 'CreatePermanent', permanentType: 'artifact', powerBonus: 1, toughnessBonus: 1, grantKeywords: ['flying'] } },

  // --- Reanimation (mapped to CreateCreature via the spell's own card art —
  // see file header) --------------------------------------------------------
  { id: id(), scryfallName: 'Zombify', impact: 2, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Zombify', impact: 2, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Rise from the Grave', impact: 2, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: [] } },
  { id: id(), scryfallName: 'Rise from the Grave', impact: 2, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: [] } },

  // --- More tokens from a single card --------------------------------------
  {
    id: id(),
    scryfallName: 'From Under the Floorboards',
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 3, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
  },
  {
    id: id(),
    scryfallName: 'From Under the Floorboards',
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 3, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
  },
  {
    id: id(),
    scryfallName: 'Grave Titan',
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 2, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
  },
  {
    id: id(),
    scryfallName: 'Grave Titan',
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 2, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
  },
  // Small, unconditional, on-curve swarm cards — this is the "more, smaller bodies" lever from
  // docs/roadmap.md's swarm item, applied without touching the draw/weight engine.
  {
    id: id(),
    scryfallName: 'Moan of the Unhallowed',
    impact: 1, category: 'horde',
    effect: { kind: 'CreateCreature', count: 2, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
  },
  {
    id: id(),
    scryfallName: 'Moan of the Unhallowed',
    impact: 1, category: 'horde',
    effect: { kind: 'CreateCreature', count: 2, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
  },
  {
    id: id(),
    scryfallName: 'Stir the Sands',
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 3, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
  },
  {
    id: id(),
    scryfallName: 'Stir the Sands',
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 3, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
  },
  {
    id: id(),
    scryfallName: "Gisa's Bidding",
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 2, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
  },
  {
    id: id(),
    scryfallName: 'Diregraf Horde',
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 2, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie', tokenTypeLine: 'Zombie', tokenColors: ['B'] },
  },

  // --- Removal / damage / sacrifice / discard (table instructions, only
  // non-targeted effects) -------------------------------------------------
  { id: id(), scryfallName: "Chainer's Edict", impact: 2, category: 'specificRemoval', effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: "Chainer's Edict", impact: 2, category: 'specificRemoval', effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Diabolic Edict', impact: 2, category: 'specificRemoval', effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Diabolic Edict', impact: 2, category: 'specificRemoval', effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Barter in Blood', impact: 3, category: 'specificRemoval', effect: { kind: 'SacrificeInstruction', perPlayer: true, count: 2 } },
  // A much bigger edict than Barter in Blood — each player loses six creatures, not two.
  { id: id(), scryfallName: 'Necrotic Hex', impact: 3, category: 'specificRemoval', effect: { kind: 'SacrificeInstruction', perPlayer: true, count: 6 } },
  // First use of the highestPower/highestManaValue criteria in this deck (see file header) — each
  // opponent loses one specific creature of their own, picked by an objective rule, no bot judgment.
  { id: id(), scryfallName: 'Soul Shatter', impact: 2, category: 'specificRemoval', effect: { kind: 'RemovalInstruction', mode: 'highestManaValue', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Consumed by Greed', impact: 2, category: 'specificRemoval', effect: { kind: 'RemovalInstruction', mode: 'highestPower', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Mind Sludge', impact: 2, category: 'discard', effect: { kind: 'DiscardInstruction', perPlayer: true, count: 3 } },
  { id: id(), scryfallName: 'Syphon Mind', impact: 1, category: 'discard', effect: { kind: 'DiscardInstruction', perPlayer: true, count: 1 } },
  { id: id(), scryfallName: "Bontu's Last Reckoning", impact: 3, category: 'boardClear', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Kindred Dominance', impact: 3, category: 'boardClear', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Damnation', impact: 3, category: 'boardClear', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Damnation', impact: 3, category: 'boardClear', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Languish', impact: 3, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 4, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Languish', impact: 3, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 4, target: 'allCreatures' } },
  // Toxic Deluge's X is fixed per copy instead of asked at the table — see file header.
  { id: id(), scryfallName: 'Toxic Deluge', impact: 1, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 1, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Toxic Deluge', impact: 2, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 3, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Toxic Deluge', impact: 3, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 5, target: 'allCreatures' } },
  {
    id: id(),
    scryfallName: 'Extinction Event',
    impact: 3, category: 'boardClear',
    effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' },
    errata:
      "Choose whichever option would hit more of the players' creatures: destroy all their creatures with mana value 3 or less, or destroy all their creatures with mana value 4 or greater.",
  },
  {
    id: id(),
    scryfallName: 'Necromantic Selection',
    impact: 3, category: 'boardClear',
    effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' },
    errata:
      "After destroying all creatures the players control, the bot's side may put one of the creatures destroyed this way onto the battlefield under the bot's control as a 2/2 black Zombie, in addition to its other colors and types.",
  },
  // Debt to the Deathless's X (devotion to black) is fixed per copy instead of asked at the table
  // — see file header.
  { id: id(), scryfallName: 'Debt to the Deathless', impact: 1, category: 'faceDamage', effect: { kind: 'DamageInstruction', amount: 1, target: 'eachPlayer' } },
  { id: id(), scryfallName: 'Debt to the Deathless', impact: 2, category: 'faceDamage', effect: { kind: 'DamageInstruction', amount: 3, target: 'eachPlayer' } },
  { id: id(), scryfallName: 'Debt to the Deathless', impact: 3, category: 'faceDamage', effect: { kind: 'DamageInstruction', amount: 5, target: 'eachPlayer' } },

  // --- Utility (bot state) ------------------------------------------------
  { id: id(), scryfallName: 'Read the Bones', impact: 2, category: 'draw', effect: { kind: 'DrawExtraBot', amount: 2 } },
  { id: id(), scryfallName: "Night's Whisper", impact: 2, category: 'draw', effect: { kind: 'DrawExtraBot', amount: 2 } },
  { id: id(), scryfallName: "Night's Whisper", impact: 2, category: 'draw', effect: { kind: 'DrawExtraBot', amount: 2 } },
  { id: id(), scryfallName: 'Rest for the Weary', impact: 1, category: 'lifeGain', effect: { kind: 'GainLifeBot', amount: 8 } },
  { id: id(), scryfallName: 'Overrun', impact: 3, category: 'teamPump', effect: { kind: 'PumpBotBoard', powerBonus: 3, toughnessBonus: 3, grantKeywords: ['trample'] } },
]

export const zombieDeck: DeckCardConfig[] = attachLocalScryfallData(zombieDeckRaw)
