import type { DeckCardConfig } from '../types'
import { attachLocalScryfallData } from './attachLocalScryfallData'

// Zombie-themed deck: ~65 real cards, with multiple copies of the same
// cards (like a real Horde deck, meant to last many turns). Follows the
// same deck-curation criteria as the prebuilt deck (see docs/game-design.md),
// with one extra constraint: for instructions aimed at the players (removal,
// damage, sacrifice, discard), only real cards that do NOT target are chosen
// — edicts ("each player sacrifices...") and symmetric sweepers ("destroy
// all creatures", "-X/-X to all creatures") — instead of reinterpreting
// single-target removal (e.g. "Doom Blade") as the "highest power/toughness/
// mana value" template. The bot can't see the players' board, so any
// instruction left to the table must already be free of arbitrary choices
// made by the bot.
//
// Extinction Event is the one exception that needs an errata: the real
// text is modal ("destroy creatures with mana value 3 or less, OR those
// with mana value 4 or greater") and no existing RemovalMode expresses "the
// table picks the more impactful option" — see the `errata` field below.
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
// own body) since that's the more distinctive real effect and the deck was
// short on "several tokens from one card" cases beyond Army of the Damned.
//
// `impact` (1 low / 2 medium / 3 high) grades how much of a threat each card
// is, and feeds the draw-weighting in engine/difficulty.ts — see the note in
// docs/game-design.md.

let counter = 0
function id(): string {
  counter += 1
  return `zombie-${counter.toString().padStart(2, '0')}`
}

const zombieDeckRaw: DeckCardConfig[] = [
  // --- Creatures -------------------------------------------------------
  { id: id(), scryfallName: 'Diregraf Ghoul', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Diregraf Ghoul', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Diregraf Ghoul', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Diregraf Ghoul', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 1, keywords: [] } },

  { id: id(), scryfallName: 'Gravecrawler', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 1, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Gravecrawler', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 1, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Gravecrawler', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 1, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Gravecrawler', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 1, toughness: 1, keywords: [] } },

  { id: id(), scryfallName: 'Walking Corpse', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Walking Corpse', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Walking Corpse', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: 'Relentless Dead', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Relentless Dead', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Relentless Dead', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['menace'] } },

  { id: id(), scryfallName: 'Cemetery Reaper', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Cemetery Reaper', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: 'Lord of the Undead', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Lord of the Undead', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: 'Diregraf Colossus', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Diregraf Colossus', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },

  { id: id(), scryfallName: 'Plague Belcher', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Plague Belcher', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: ['menace'] } },

  { id: id(), scryfallName: 'Rotting Regisaur', impact: 3, effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: [] } },
  { id: id(), scryfallName: 'Rotting Regisaur', impact: 3, effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: [] } },

  { id: id(), scryfallName: 'Gray Merchant of Asphodel', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Gray Merchant of Asphodel', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: 'Zombie Master', impact: 1, effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  {
    id: id(),
    scryfallName: 'Army of the Damned',
    impact: 3,
    effect: { kind: 'CreateCreature', count: 13, power: 2, toughness: 2, keywords: ['flying'], tokenName: 'Zombie' },
  },

  // --- Lords (real anthem effects, mapped to PumpBotBoard — see file header) ---
  {
    id: id(),
    scryfallName: 'Death Baron',
    impact: 2,
    effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: ['deathtouch'] },
  },
  {
    id: id(),
    scryfallName: 'Death Baron',
    impact: 2,
    effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: ['deathtouch'] },
  },
  { id: id(), scryfallName: 'Undead Warchief', impact: 2, effect: { kind: 'PumpBotBoard', powerBonus: 2, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Undead Warchief', impact: 2, effect: { kind: 'PumpBotBoard', powerBonus: 2, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Risen Executioner', impact: 2, effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Risen Executioner', impact: 2, effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Diregraf Captain', impact: 2, effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },
  { id: id(), scryfallName: 'Diregraf Captain', impact: 2, effect: { kind: 'PumpBotBoard', powerBonus: 1, toughnessBonus: 1, grantKeywords: [] } },

  // --- Reanimation (mapped to CreateCreature via the spell's own card art —
  // see file header) --------------------------------------------------------
  { id: id(), scryfallName: 'Zombify', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Zombify', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Rise from the Grave', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: [] } },
  { id: id(), scryfallName: 'Rise from the Grave', impact: 2, effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: [] } },

  // --- More tokens from a single card --------------------------------------
  {
    id: id(),
    scryfallName: 'From Under the Floorboards',
    impact: 2,
    effect: { kind: 'CreateCreature', count: 3, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie' },
  },
  {
    id: id(),
    scryfallName: 'From Under the Floorboards',
    impact: 2,
    effect: { kind: 'CreateCreature', count: 3, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie' },
  },
  { id: id(), scryfallName: 'Grave Titan', impact: 2, effect: { kind: 'CreateCreature', count: 2, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie' } },
  { id: id(), scryfallName: 'Grave Titan', impact: 2, effect: { kind: 'CreateCreature', count: 2, power: 2, toughness: 2, keywords: [], tokenName: 'Zombie' } },

  // --- Removal / damage / sacrifice / discard (table instructions, only
  // non-targeted effects) -------------------------------------------------
  { id: id(), scryfallName: "Chainer's Edict", impact: 2, effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: "Chainer's Edict", impact: 2, effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Diabolic Edict', impact: 2, effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Diabolic Edict', impact: 2, effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Barter in Blood', impact: 3, effect: { kind: 'SacrificeInstruction', perPlayer: true, count: 2 } },
  { id: id(), scryfallName: 'Mind Sludge', impact: 2, effect: { kind: 'DiscardInstruction', perPlayer: true, count: 3 } },
  { id: id(), scryfallName: 'Syphon Mind', impact: 1, effect: { kind: 'DiscardInstruction', perPlayer: true, count: 1 } },
  { id: id(), scryfallName: "Bontu's Last Reckoning", impact: 3, effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Kindred Dominance', impact: 3, effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Damnation', impact: 3, effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Damnation', impact: 3, effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Languish', impact: 3, effect: { kind: 'DamageInstruction', amount: 4, target: 'allCreatures' } },
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
  {
    id: id(),
    scryfallName: 'Extinction Event',
    impact: 3,
    effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' },
    errata:
      "Choose whichever option would hit more of the players' creatures: destroy all their creatures with mana value 3 or less, or destroy all their creatures with mana value 4 or greater.",
  },
  {
    id: id(),
    scryfallName: 'Debt to the Deathless',
    impact: 2,
    effect: { kind: 'DamageInstruction', amount: { query: "What is the bot's devotion to black (black permanents in play)?", multiplier: 1, offset: 0, min: 2 }, target: 'eachPlayer' },
  },

  // --- Utility (bot state) ------------------------------------------------
  { id: id(), scryfallName: 'Read the Bones', impact: 2, effect: { kind: 'DrawExtraBot', amount: 2 } },
  { id: id(), scryfallName: "Night's Whisper", impact: 2, effect: { kind: 'DrawExtraBot', amount: 2 } },
  { id: id(), scryfallName: "Night's Whisper", impact: 2, effect: { kind: 'DrawExtraBot', amount: 2 } },
  { id: id(), scryfallName: 'Rest for the Weary', impact: 1, effect: { kind: 'GainLifeBot', amount: 8 } },
  { id: id(), scryfallName: 'Overrun', impact: 3, effect: { kind: 'PumpBotBoard', powerBonus: 3, toughnessBonus: 3, grantKeywords: ['trample'] } },
]

export const zombieDeck: DeckCardConfig[] = attachLocalScryfallData(zombieDeckRaw)
