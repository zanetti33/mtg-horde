import type { DeckCardConfig } from '../types'

// Mazzo Horde precompilato: ~24 carte reali (nomi validi su Scryfall), ciascuna
// già mappata su un template semplice (vedi src/engine/templates.ts). Alcune
// carte reali hanno testo più complesso (condizioni, kicker, "fino a fine
// turno", targeting singolo anziché di squadra): la mappatura qui sceglie
// deliberatamente la lettura più semplice e la generalizza al modello
// "istruzione generica verso i giocatori" o "effetto permanente sul bot",
// come da criterio di selezione del piano.

let counter = 0
function id(): string {
  counter += 1
  return `starter-${counter.toString().padStart(2, '0')}`
}

export const defaultDeck: DeckCardConfig[] = [
  // --- Creature -------------------------------------------------------
  { id: id(), scryfallName: 'Colossal Dreadmaw', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },
  { id: id(), scryfallName: 'Serra Angel', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['flying', 'vigilance'] } },
  { id: id(), scryfallName: 'Shivan Dragon', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['flying'] } },
  { id: id(), scryfallName: 'Gifted Aetherborn', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 3, keywords: ['deathtouch', 'lifelink'] } },
  { id: id(), scryfallName: 'Fencing Ace', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 1, keywords: ['doublestrike'] } },
  { id: id(), scryfallName: 'Ripscale Predator', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 1, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Typhoid Rats', effect: { kind: 'CreateCreature', count: 1, power: 1, toughness: 1, keywords: ['deathtouch'] } },
  { id: id(), scryfallName: 'Charging Monstrosaur', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['trample', 'haste'] } },
  { id: id(), scryfallName: 'Woolly Thoctar', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Craw Wurm', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Watchwolf', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } },
  { id: id(), scryfallName: 'Runeclaw Bear', effect: { kind: 'CreateCreature', count: 1, power: 2, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Rumbling Baloth', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },

  // --- Rimozioni / danno (istruzioni per il tavolo) --------------------
  { id: id(), scryfallName: 'Doom Blade', effect: { kind: 'RemovalInstruction', mode: 'highestPower', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Murder', effect: { kind: 'RemovalInstruction', mode: 'highestToughness', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Wrath of God', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Lightning Bolt', effect: { kind: 'DamageInstruction', amount: 3, target: 'eachPlayer' } },
  { id: id(), scryfallName: 'Incinerate', effect: { kind: 'DamageInstruction', amount: 3, target: 'creatureHighestToughness' } },

  // --- Sacrificio / scarto ----------------------------------------------
  { id: id(), scryfallName: 'Diabolic Edict', effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Barter in Blood', effect: { kind: 'SacrificeInstruction', perPlayer: true, count: 2 } },
  { id: id(), scryfallName: 'Mind Sludge', effect: { kind: 'DiscardInstruction', perPlayer: true, count: 3 } },

  // --- Utility (stato del bot) -------------------------------------------
  { id: id(), scryfallName: 'Rest for the Weary', effect: { kind: 'GainLifeBot', amount: 8 } },
  { id: id(), scryfallName: 'Divination', effect: { kind: 'DrawExtraBot', amount: 2 } },
  { id: id(), scryfallName: 'Overrun', effect: { kind: 'PumpBotBoard', powerBonus: 3, toughnessBonus: 3, grantKeywords: ['trample'] } },

  // --- Effetto scalabile stile Archenemy ----------------------------------
  {
    id: id(),
    scryfallName: 'Bane of Progress',
    effect: {
      kind: 'CreateCreature',
      count: 1,
      power: { query: 'Quanti artefatti e incantesimi controllano i giocatori?', multiplier: 1, offset: 4, min: 4 },
      toughness: { query: 'Quanti artefatti e incantesimi controllano i giocatori?', multiplier: 1, offset: 4, min: 4 },
      keywords: [],
    },
  },
]
