import type { DeckCardConfig } from '../types'

// Zombie-themed deck: ~49 real cards, with multiple copies of the same
// cards (like a real Horde deck, meant to last many turns). Follows the
// same deck-curation criteria as the prebuilt deck (see defaultDeck.ts and
// docs/game-design.md), with one extra constraint: for instructions aimed
// at the players (removal, damage, sacrifice, discard), only real cards
// that do NOT target are chosen — edicts ("each player sacrifices...") and
// symmetric sweepers ("destroy all creatures", "-X/-X to all creatures") —
// instead of reinterpreting single-target removal (e.g. "Doom Blade") as
// the "highest power/toughness/mana value" template. The bot can't see the
// players' board, so any instruction left to the table must already be
// free of arbitrary choices made by the bot.
//
// Extinction Event is the one exception that needs an errata: the real
// text is modal ("destroy creatures with mana value 3 or less, OR those
// with mana value 4 or greater") and no existing RemovalMode expresses "the
// table picks the more impactful option" — see the `errata` field below.

let counter = 0
function id(): string {
  counter += 1
  return `zombie-${counter.toString().padStart(2, '0')}`
}

export const zombieDeck: DeckCardConfig[] = [
  // --- Creatures -------------------------------------------------------
  { id: id(), scryfallName: 'Diregraf Ghoul', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Diregraf Ghoul', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Diregraf Ghoul', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Diregraf Ghoul', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 1, keywords: [] } },

  { id: id(), scryfallName: 'Gravecrawler', effect: { kind: 'CreateCreature', count: 1, power: 1, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Gravecrawler', effect: { kind: 'CreateCreature', count: 1, power: 1, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Gravecrawler', effect: { kind: 'CreateCreature', count: 1, power: 1, toughness: 1, keywords: [] } },
  { id: id(), scryfallName: 'Gravecrawler', effect: { kind: 'CreateCreature', count: 1, power: 1, toughness: 1, keywords: [] } },

  { id: id(), scryfallName: 'Walking Corpse', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Walking Corpse', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Walking Corpse', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: 'Relentless Dead', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Relentless Dead', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Relentless Dead', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['menace'] } },

  { id: id(), scryfallName: 'Cemetery Reaper', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Cemetery Reaper', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: 'Lord of the Undead', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Lord of the Undead', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: 'Undead Warchief', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } },
  { id: id(), scryfallName: 'Undead Warchief', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } },

  { id: id(), scryfallName: 'Death Baron', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['deathtouch'] } },
  { id: id(), scryfallName: 'Death Baron', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: ['deathtouch'] } },

  { id: id(), scryfallName: 'Risen Executioner', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Risen Executioner', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: 'Diregraf Colossus', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Diregraf Colossus', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },

  { id: id(), scryfallName: 'Plague Belcher', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Plague Belcher', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: ['menace'] } },

  { id: id(), scryfallName: 'Rotting Regisaur', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: [] } },
  { id: id(), scryfallName: 'Rotting Regisaur', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: [] } },

  { id: id(), scryfallName: 'Gray Merchant of Asphodel', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Gray Merchant of Asphodel', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: 'Zombie Master', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },

  {
    id: id(),
    scryfallName: 'Army of the Damned',
    effect: { kind: 'CreateCreature', count: 13, power: 2, toughness: 2, keywords: ['flying'], tokenName: 'Zombie' },
  },

  // --- Removal / damage / sacrifice / discard (table instructions, only
  // non-targeted effects) -------------------------------------------------
  { id: id(), scryfallName: "Chainer's Edict", effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: "Chainer's Edict", effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Diabolic Edict', effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Diabolic Edict', effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Barter in Blood', effect: { kind: 'SacrificeInstruction', perPlayer: true, count: 2 } },
  { id: id(), scryfallName: 'Mind Sludge', effect: { kind: 'DiscardInstruction', perPlayer: true, count: 3 } },
  { id: id(), scryfallName: "Bontu's Last Reckoning", effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Kindred Dominance', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Languish', effect: { kind: 'DamageInstruction', amount: 4, target: 'allCreatures' } },
  { id: id(), scryfallName: 'Languish', effect: { kind: 'DamageInstruction', amount: 4, target: 'allCreatures' } },
  {
    id: id(),
    scryfallName: 'Extinction Event',
    effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' },
    errata:
      "Choose whichever option would hit more of the players' creatures: destroy all their creatures with mana value 3 or less, or destroy all their creatures with mana value 4 or greater.",
  },
  {
    id: id(),
    scryfallName: 'Debt to the Deathless',
    effect: { kind: 'DamageInstruction', amount: { query: "What is the bot's devotion to black (black permanents in play)?", multiplier: 1, offset: 0, min: 2 }, target: 'eachPlayer' },
  },

  // --- Utility (bot state) ------------------------------------------------
  { id: id(), scryfallName: 'Read the Bones', effect: { kind: 'DrawExtraBot', amount: 2 } },
  { id: id(), scryfallName: 'Rest for the Weary', effect: { kind: 'GainLifeBot', amount: 8 } },
  { id: id(), scryfallName: 'Overrun', effect: { kind: 'PumpBotBoard', powerBonus: 3, toughnessBonus: 3, grantKeywords: ['trample'] } },
]
