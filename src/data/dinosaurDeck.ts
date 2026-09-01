import type { DeckCardConfig } from '../types'
import { attachLocalScryfallData } from './attachLocalScryfallData'

// Dinosaur-themed deck: ~76 real cards, with multiple copies of the same
// cards (like a real Horde deck, meant to last many turns). Same
// deck-curation criteria as zombieDeck.ts: for instructions aimed at the
// players, only cards free of bot judgment are chosen — symmetric sweepers
// (damage or "-X/-X" to all creatures, "destroy all creatures"), edicts, and
// single-target removal with an objective criterion (`RemovalMode`:
// highestPower/highestToughness/highestManaValue/random — see Highcliff
// Felidar below for the first use of this deck's own criterion slot).
//
// Every CreateCreature that produces tokens (count > 1) also carries tokenTypeLine/tokenColors —
// purely informational (the engine never reads them), shown on the token card in BotPanel/
// AttackOutcome since tokens have no card image for the table to check colors/type against their
// own buffs or removal. See Color/BattlefieldCreature.typeLine in types.ts.
//
// Toxic Deluge and Triceraton Commander have a real X the table would normally choose by looking
// at the board (Toxic Deluge's -X/-X, Triceraton Commander's "create X tokens"). Rather than ask
// the operator at resolution time, X is fixed per deck entry, with three copies spanning the
// impact tiers (X=1/3/5 -> impact 1/2/3) instead of one entry with a variable X.
//
// Regal Imperiosaur and Devil Dinosaur are real anthem lords ("other
// Dinosaurs you control get +1/+1") mapped to `PumpBotBoard` instead of
// `CreateCreature`, same trade-off (own body for the accurate team-wide
// buff) as the lords in zombieDeck.ts. Reanimate has no dedicated template
// — closest simplification is `CreateCreature` using the spell's own card
// image, same as the reanimation spells in zombieDeck.ts.
//
// `impact` (1 low / 2 medium / 3 high) grades how much of a threat each card
// is, and feeds the draw-weighting in engine/difficulty.ts — see the note in
// docs/game-design.md. Zetalpa and Gishath (the two biggest bodies) and every
// board wipe/team pump are impact 3, so they stay very unlikely to show up
// in the opening turns instead of ending a game on the spot.
//
// Every `CreateCreature` body's power/toughness/keywords match the real card's printed stats —
// see "Creature accuracy" in docs/game-design.md#deck-curation-criteria. A creature whose real
// text carries two or more abilities beyond keywords (something this engine's templates can't
// represent, e.g. Territorial Allosaurus' kicker-fight, or Forerunner of the Empire's tutor +
// damage trigger) isn't curved down and kept anyway — it's swapped for a different real card that
// actually is vanilla, vanilla-plus-keywords, or an unconditional token-maker, so the body on
// screen is never quietly missing most of what the real card does. A single minor/narrow ability
// (an Enrage trigger, a one-shot sacrifice ability) is still dropped silently, same as always — the
// bar is "would the table be surprised by how much this card actually does," not "zero lost text."
//
// The "Artifacts & enchantments" section below is the deck's set of `CreatePermanent` cards — real,
// persistent anthems (see docs/roadmap.md item 4 and that effect's own doc comment in types.ts),
// as opposed to the `PumpBotBoard`-mapped lords above which apply once, at resolution, and don't
// reach creatures summoned afterward. See that section's own comment for card-by-card notes.

let counter = 0
function id(): string {
  counter += 1
  return `dino-${counter.toString().padStart(2, '0')}`
}

const dinosaurDeckRaw: DeckCardConfig[] = [
  // --- Creatures -------------------------------------------------------
  { id: id(), scryfallName: 'Colossal Dreadmaw', impact: 2, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },
  { id: id(), scryfallName: 'Colossal Dreadmaw', impact: 2, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },
  { id: id(), scryfallName: 'Colossal Dreadmaw', impact: 2, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },

  { id: id(), scryfallName: 'Charging Monstrosaur', impact: 2, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['trample', 'haste'] } },
  { id: id(), scryfallName: 'Charging Monstrosaur', impact: 2, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['trample', 'haste'] } },
  { id: id(), scryfallName: 'Charging Monstrosaur', impact: 2, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['trample', 'haste'] } },

  { id: id(), scryfallName: 'Ripjaw Raptor', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Ripjaw Raptor', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Ripjaw Raptor', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 5, keywords: [] } },

  // Territorial Allosaurus swapped out: its real text is kicker+fight (a targeted-removal-on-a-body
  // effect this format can't express) with no vigilance at all — the old entry's "vigilance" was
  // fabricated, not a simplification of anything on the real card. Imposing Vantasaur is a real,
  // clean vanilla+vigilance body instead.
  { id: id(), scryfallName: 'Imposing Vantasaur', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 6, keywords: ['vigilance'] } },
  { id: id(), scryfallName: 'Imposing Vantasaur', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 6, keywords: ['vigilance'] } },
  { id: id(), scryfallName: 'Imposing Vantasaur', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 6, keywords: ['vigilance'] } },

  { id: id(), scryfallName: 'Thrashing Brontodon', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Thrashing Brontodon', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 4, keywords: [] } },

  { id: id(), scryfallName: 'Ranging Raptor', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 3, keywords: [] } },
  { id: id(), scryfallName: 'Ranging Raptor', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 3, keywords: [] } },

  { id: id(), scryfallName: 'Raptor Companion', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Raptor Companion', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Raptor Companion', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 1, keywords: [] } },

  // Sun-Crested Pterodon's vigilance is real but conditional ("as long as you control another
  // Dinosaur") — same treatment as Stampeding Horncrest's conditional haste below: unconditional,
  // since the condition is true almost the entire game in a ~80-card mostly-Dinosaur deck.
  { id: id(), scryfallName: 'Sun-Crested Pterodon', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 5, keywords: ['flying', 'vigilance'] } },
  { id: id(), scryfallName: 'Sun-Crested Pterodon', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 5, keywords: ['flying', 'vigilance'] } },

  // Shifting Ceratops swapped out: real text needs an unsupported keyword (protection from a
  // color) plus an activated ability (choice of reach/trample/haste) neither template can express.
  // Gigantosaurus is a real, purely vanilla big body instead — no ability text lost at all.
  { id: id(), scryfallName: 'Gigantosaurus', impact: 3, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 10, toughness: 10, keywords: [] } },
  { id: id(), scryfallName: 'Gigantosaurus', impact: 3, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 10, toughness: 10, keywords: [] } },

  // Regisaur Alpha swapped out: its real text is two abilities (haste for OTHER Dinosaurs, plus a
  // 3/3 token on ETB) that this one CreateCreature body can't carry at once. Nest Robber is a real,
  // clean vanilla+haste body instead.
  { id: id(), scryfallName: 'Nest Robber', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 1, keywords: ['haste'] } },
  { id: id(), scryfallName: 'Nest Robber', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 1, keywords: ['haste'] } },

  { id: id(), scryfallName: 'Ripscale Predator', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 5, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Ripscale Predator', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 5, keywords: ['menace'] } },

  // Forerunner of the Empire swapped out: real text is two separate triggered abilities (a library
  // tutor, and a repeatable damage ping whenever another Dinosaur enters) neither expressible here.
  // Colossadactyl is a real, clean vanilla+reach+trample body instead.
  { id: id(), scryfallName: 'Colossadactyl', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 5, keywords: ['reach', 'trample'] } },
  { id: id(), scryfallName: 'Colossadactyl', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 5, keywords: ['reach', 'trample'] } },

  { id: id(), scryfallName: 'Frenzied Raptor', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Frenzied Raptor', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Frenzied Raptor', impact: 1, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 2, keywords: [] } },

  // Gishath and Zetalpa keep their real triggered ability dropped (per the usual trade-off — see
  // file header) since their *bodies* are otherwise fully, faithfully represented: every keyword
  // Gishath and Zetalpa actually have is on the card below, nothing invented. Zetalpa's real fifth
  // keyword, indestructible, has no equivalent in this engine's `Keyword` union (types.ts) and is
  // the one keyword genuinely impossible to carry over — an engine limitation, not a curation gap.
  { id: id(), scryfallName: "Gishath, Sun's Avatar", impact: 3, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 7, toughness: 6, keywords: ['vigilance', 'trample', 'haste'] } },
  { id: id(), scryfallName: 'Zetalpa, Primal Dawn', impact: 3, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 8, keywords: ['flying', 'doublestrike', 'vigilance', 'trample'] } },
  { id: id(), scryfallName: 'Etali, Primal Storm', impact: 2, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },

  { id: id(), scryfallName: 'Earthshaker Dreadmaw', impact: 2, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },
  { id: id(), scryfallName: 'Earthshaker Dreadmaw', impact: 2, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },

  { id: id(), scryfallName: 'Stampeding Horncrest', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['haste'] } },
  { id: id(), scryfallName: 'Stampeding Horncrest', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['haste'] } },

  // --- Lords (real anthem effects, mapped to PumpBotBoard — see file header) ---
  { id: id(), scryfallName: 'Regal Imperiosaur', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Regal Imperiosaur', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Devil Dinosaur', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Thundering Spineback', impact: 2, category: 'lord', effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  {
    id: id(),
    scryfallName: 'Dinosaurs on a Spaceship',
    impact: 3, category: 'lord',
    effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: ['vigilance', 'trample'] },
  },

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
  // Triumph's real text asks the caster to choose a creature type as it enters — fixed to Dinosaur
  // here, same "decided by the deck curator, not asked at the table" precedent as every other
  // modal-but-fixed choice in this deck (see the file header's Triceraton Commander/Toxic Deluge
  // note in the sibling zombie deck). Intangible Virtue's real restriction to token creatures is
  // dropped (applies to every bot creature instead) per the "simplest reading, even if slightly
  // stronger" rule in docs/game-design.md.
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
  // see file header). Resurrection, not Reanimate: same role (a 5/5 body straight
  // onto the battlefield), but white instead of black — a much closer color fit for
  // an R/G/W Dinosaur deck than a generic black necromancy spell.
  // ------------------------------------------------------------------------
  { id: id(), scryfallName: 'Resurrection', impact: 2, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Resurrection', impact: 2, category: 'grunt', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },

  // --- More tokens from a single card --------------------------------------
  // Triceraton Commander's real X ("create X 2/2 Dinosaur Soldiers") is fixed per copy instead of
  // asked at the table — see file header. The X=1 copy omits tokenName/tokenTypeLine/tokenColors
  // like every other count=1 CreateCreature: at count 1 the engine shows the real Triceraton
  // Commander card (isToken stays false), not a token.
  { id: id(), scryfallName: 'Triceraton Commander', impact: 1, category: 'bigBad', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['flying'] } },
  {
    id: id(),
    scryfallName: 'Triceraton Commander',
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 3, power: 2, toughness: 2, keywords: [], tokenName: 'Dinosaur Soldier', tokenTypeLine: 'Dinosaur Soldier', tokenColors: ['W'] },
  },
  {
    id: id(),
    scryfallName: 'Triceraton Commander',
    impact: 3, category: 'horde',
    effect: { kind: 'CreateCreature', count: 5, power: 2, toughness: 2, keywords: [], tokenName: 'Dinosaur Soldier', tokenTypeLine: 'Dinosaur Soldier', tokenColors: ['W'] },
  },
  {
    id: id(),
    scryfallName: 'Crested Herdcaller',
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 2, power: 3, toughness: 3, keywords: ['trample'], tokenName: 'Dinosaur', tokenTypeLine: 'Dinosaur', tokenColors: ['G'] },
  },
  {
    id: id(),
    scryfallName: 'Crested Herdcaller',
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 2, power: 3, toughness: 3, keywords: ['trample'], tokenName: 'Dinosaur', tokenTypeLine: 'Dinosaur', tokenColors: ['G'] },
  },
  {
    id: id(),
    scryfallName: 'Crested Herdcaller',
    impact: 2, category: 'horde',
    effect: { kind: 'CreateCreature', count: 2, power: 3, toughness: 3, keywords: ['trample'], tokenName: 'Dinosaur', tokenTypeLine: 'Dinosaur', tokenColors: ['G'] },
  },

  // --- Removal / damage / sacrifice (table instructions, only
  // non-targeted effects) -------------------------------------------------
  { id: id(), scryfallName: "Yahenni's Expertise", impact: 2, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 2, target: 'allCreatures' } },
  { id: id(), scryfallName: "Yahenni's Expertise", impact: 2, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 2, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Drown in Sorrow', impact: 2, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 2, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Drown in Sorrow', impact: 2, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 2, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Hour of Devastation', impact: 3, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 5, target: 'allCreatures' } },
  { id: id(), scryfallName: "Bontu's Last Reckoning", impact: 3, category: 'boardClear', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Fumigate', impact: 3, category: 'boardClear', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Crux of Fate', impact: 3, category: 'boardClear', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Damnation', impact: 3, category: 'boardClear', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  {
    id: id(),
    scryfallName: 'Extinction Event',
    impact: 3, category: 'boardClear',
    effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' },
    errata:
      "Choose whichever option would hit more of the players' creatures: destroy all their creatures with mana value 3 or less, or destroy all their creatures with mana value 4 or greater.",
  },
  { id: id(), scryfallName: 'Barter in Blood', impact: 3, category: 'specificRemoval', effect: { kind: 'SacrificeInstruction', perPlayer: true, count: 2 } },
  { id: id(), scryfallName: 'Diabolic Edict', impact: 2, category: 'specificRemoval', effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Diabolic Edict', impact: 2, category: 'specificRemoval', effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Languish', impact: 3, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 4, target: 'allCreatures' } },
  // Toxic Deluge's X is fixed per copy instead of asked at the table — see file header.
  { id: id(), scryfallName: 'Toxic Deluge', impact: 1, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 1, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Toxic Deluge', impact: 2, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 3, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Toxic Deluge', impact: 3, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 5, target: 'allCreatures' } },

  // On-color (R/G/W) board wipes, filling out the removal suite beyond all-black:
  { id: id(), scryfallName: 'Wrath of God', impact: 3, category: 'boardClear', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Doomskar', impact: 3, category: 'boardClear', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Pyroclasm', impact: 1, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 2, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Anger of the Gods', impact: 2, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 3, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Slice and Dice', impact: 2, category: 'aoe', effect: { kind: 'DamageInstruction', amount: 4, target: 'allCreatures' } },

  // First use of the highestPower criterion in this deck (see file header) — each opponent
  // loses their own biggest creature, no bot judgment involved.
  { id: id(), scryfallName: 'Highcliff Felidar', impact: 2, category: 'specificRemoval', effect: { kind: 'RemovalInstruction', mode: 'highestPower', count: 1, destroyOrExile: 'destroy' } },

  // --- Utility (bot state) ------------------------------------------------
  { id: id(), scryfallName: 'Commune with Dinosaurs', impact: 1, category: 'draw', effect: { kind: 'DrawExtraBot', amount: 1 } },
  { id: id(), scryfallName: 'Commune with Dinosaurs', impact: 1, category: 'draw', effect: { kind: 'DrawExtraBot', amount: 1 } },
  { id: id(), scryfallName: 'Rest for the Weary', impact: 1, category: 'lifeGain', effect: { kind: 'GainLifeBot', amount: 8 } },
  { id: id(), scryfallName: 'Overrun', impact: 3, category: 'teamPump', effect: { kind: 'PumpBotBoard', powerBonus: 3, toughnessBonus: 3, grantKeywords: ['trample'] } },
]

export const dinosaurDeck: DeckCardConfig[] = attachLocalScryfallData(dinosaurDeckRaw)
