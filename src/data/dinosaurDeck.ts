import type { DeckCardConfig } from '../types'
import { attachLocalScryfallData } from './attachLocalScryfallData'

// Dinosaur-themed deck: ~63 real cards, with multiple copies of the same
// cards (like a real Horde deck, meant to last many turns). Same
// deck-curation criteria as zombieDeck.ts: for instructions aimed at the
// players, only real cards that do NOT target are chosen (edicts, symmetric
// sweepers like "-X/-X"/"destroy all"), never single-target removal
// reinterpreted as "highest power/toughness".
//
// Toxic Deluge shows the mechanism that already exists for the other kind
// of table-guided choice: not a modal choice (which needs an errata), but a
// scalar value that depends on the board — hence it uses a "query"
// NumericValue instead of a fixed number. Triceraton Commander reuses the
// same mechanism for `count`, since its real text makes X tokens.
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

let counter = 0
function id(): string {
  counter += 1
  return `dino-${counter.toString().padStart(2, '0')}`
}

const dinosaurDeckRaw: DeckCardConfig[] = [
  // --- Creatures -------------------------------------------------------
  { id: id(), scryfallName: 'Colossal Dreadmaw', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },
  { id: id(), scryfallName: 'Colossal Dreadmaw', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },
  { id: id(), scryfallName: 'Colossal Dreadmaw', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },

  { id: id(), scryfallName: 'Charging Monstrosaur', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['trample', 'haste'] } },
  { id: id(), scryfallName: 'Charging Monstrosaur', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['trample', 'haste'] } },
  { id: id(), scryfallName: 'Charging Monstrosaur', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['trample', 'haste'] } },

  { id: id(), scryfallName: 'Ripjaw Raptor', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Ripjaw Raptor', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Ripjaw Raptor', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },

  { id: id(), scryfallName: 'Territorial Allosaurus', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['vigilance'] } },
  { id: id(), scryfallName: 'Territorial Allosaurus', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['vigilance'] } },
  { id: id(), scryfallName: 'Territorial Allosaurus', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['vigilance'] } },

  { id: id(), scryfallName: 'Thrashing Brontodon', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Thrashing Brontodon', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 5, keywords: [] } },

  { id: id(), scryfallName: 'Ranging Raptor', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Ranging Raptor', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },

  { id: id(), scryfallName: 'Raptor Companion', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } },
  { id: id(), scryfallName: 'Raptor Companion', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } },
  { id: id(), scryfallName: 'Raptor Companion', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } },

  { id: id(), scryfallName: 'Sun-Crested Pterodon', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['flying'] } },
  { id: id(), scryfallName: 'Sun-Crested Pterodon', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['flying'] } },

  { id: id(), scryfallName: 'Shifting Ceratops', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Shifting Ceratops', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },

  { id: id(), scryfallName: 'Regisaur Alpha', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['haste'] } },
  { id: id(), scryfallName: 'Regisaur Alpha', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['haste'] } },

  { id: id(), scryfallName: 'Ripscale Predator', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 1, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Ripscale Predator', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 1, keywords: ['menace'] } },

  { id: id(), scryfallName: 'Forerunner of the Empire', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Forerunner of the Empire', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },

  { id: id(), scryfallName: 'Frenzied Raptor', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Frenzied Raptor', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Frenzied Raptor', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: "Gishath, Sun's Avatar", impact: 3, effect: { kind: 'CreateCreature', count: 1, power: 7, toughness: 6, keywords: ['trample', 'haste'] } },
  { id: id(), scryfallName: 'Zetalpa, Primal Dawn', impact: 3, effect: { kind: 'CreateCreature', count: 1, power: 8, toughness: 8, keywords: ['flying', 'firststrike', 'vigilance'] } },
  { id: id(), scryfallName: 'Etali, Primal Storm', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 5, keywords: ['trample'] } },

  // --- Lords (real anthem effects, mapped to PumpBotBoard — see file header) ---
  { id: id(), scryfallName: 'Regal Imperiosaur', impact: 2, effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Regal Imperiosaur', impact: 2, effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Devil Dinosaur', impact: 2, effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },

  // --- Reanimation (mapped to CreateCreature via the spell's own card art —
  // see file header) --------------------------------------------------------
  { id: id(), scryfallName: 'Reanimate', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Reanimate', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },

  // --- More tokens from a single card --------------------------------------
  {
    id: id(),
    scryfallName: 'Triceraton Commander',
    impact: 2,
    effect: {
      kind: 'CreateCreature',
      count: { query: 'What X do you choose for Triceraton Commander?', multiplier: 1, offset: 0, min: 1 },
      power: 2,
      toughness: 2,
      keywords: [],
      tokenName: 'Dinosaur Soldier',
    },
  },
  {
    id: id(),
    scryfallName: 'Triceraton Commander',
    impact: 2,
    effect: {
      kind: 'CreateCreature',
      count: { query: 'What X do you choose for Triceraton Commander?', multiplier: 1, offset: 0, min: 1 },
      power: 2,
      toughness: 2,
      keywords: [],
      tokenName: 'Dinosaur Soldier',
    },
  },
  {
    id: id(),
    scryfallName: 'Crested Herdcaller',
    impact: 2,
    effect: { kind: 'CreateCreature', count: 2, power: 3, toughness: 3, keywords: ['trample'], tokenName: 'Dinosaur' },
  },
  {
    id: id(),
    scryfallName: 'Crested Herdcaller',
    impact: 2,
    effect: { kind: 'CreateCreature', count: 2, power: 3, toughness: 3, keywords: ['trample'], tokenName: 'Dinosaur' },
  },

  // --- Removal / damage / sacrifice (table instructions, only
  // non-targeted effects) -------------------------------------------------
  { id: id(), scryfallName: "Yahenni's Expertise", impact: 2, effect: { kind: 'DamageInstruction', amount: 2, target: 'allCreatures' } },
  { id: id(), scryfallName: "Yahenni's Expertise", impact: 2, effect: { kind: 'DamageInstruction', amount: 2, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Drown in Sorrow', impact: 2, effect: { kind: 'DamageInstruction', amount: 2, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Drown in Sorrow', impact: 2, effect: { kind: 'DamageInstruction', amount: 2, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Hour of Devastation', impact: 3, effect: { kind: 'DamageInstruction', amount: 5, target: 'allCreatures' } },
  { id: id(), scryfallName: "Bontu's Last Reckoning", impact: 3, effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Fumigate', impact: 3, effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Crux of Fate', impact: 3, effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Damnation', impact: 3, effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  {
    id: id(),
    scryfallName: 'Extinction Event',
    impact: 3,
    effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' },
    errata:
      "Choose whichever option would hit more of the players' creatures: destroy all their creatures with mana value 3 or less, or destroy all their creatures with mana value 4 or greater.",
  },
  { id: id(), scryfallName: 'Barter in Blood', impact: 3, effect: { kind: 'SacrificeInstruction', perPlayer: true, count: 2 } },
  { id: id(), scryfallName: 'Diabolic Edict', impact: 2, effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Diabolic Edict', impact: 2, effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Languish', impact: 3, effect: { kind: 'DamageInstruction', amount: 4, target: 'allCreatures' } },
  {
    id: id(),
    scryfallName: 'Toxic Deluge',
    impact: 2,
    effect: {
      kind: 'DamageInstruction',
      amount: { query: 'What X do you choose for Toxic Deluge, looking at the players\' creatures?', multiplier: 1, offset: 0, min: 1 },
      target: 'allCreatures',
    },
  },

  // --- Utility (bot state) ------------------------------------------------
  { id: id(), scryfallName: 'Commune with Dinosaurs', impact: 1, effect: { kind: 'DrawExtraBot', amount: 1 } },
  { id: id(), scryfallName: 'Commune with Dinosaurs', impact: 1, effect: { kind: 'DrawExtraBot', amount: 1 } },
  { id: id(), scryfallName: 'Rest for the Weary', impact: 1, effect: { kind: 'GainLifeBot', amount: 8 } },
  { id: id(), scryfallName: 'Overrun', impact: 3, effect: { kind: 'PumpBotBoard', powerBonus: 3, toughnessBonus: 3, grantKeywords: ['trample'] } },
]

export const dinosaurDeck: DeckCardConfig[] = attachLocalScryfallData(dinosaurDeckRaw)
