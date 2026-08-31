import type { DeckCardConfig } from '../types'

// Mazzo a tema Dinosauri: ~49 carte reali, con più copie delle stesse carte
// (come un vero mazzo Horde, pensato per durare molti turni). Stesso
// criterio di curatela di zombieDeck.ts: per le istruzioni verso i giocatori
// si scelgono solo carte reali che NON targettano (edict, spazzate
// simmetriche "-X/-X"/"distruggi tutte"), mai rimozioni a bersaglio singolo
// riadattate a un "potere/costituzione più alto".
//
// Toxic Deluge mostra invece il meccanismo già esistente per l'altro tipo di
// scelta guidata dal tavolo: non una scelta modale (per cui serve un
// errata), ma un valore scalare che dipende dalla board — per questo usa una
// NumericValue "da domanda" invece di un numero fisso.

let counter = 0
function id(): string {
  counter += 1
  return `dino-${counter.toString().padStart(2, '0')}`
}

export const dinosaurDeck: DeckCardConfig[] = [
  // --- Creature -------------------------------------------------------
  { id: id(), scryfallName: 'Colossal Dreadmaw', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },
  { id: id(), scryfallName: 'Colossal Dreadmaw', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },
  { id: id(), scryfallName: 'Colossal Dreadmaw', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 6, keywords: ['trample'] } },

  { id: id(), scryfallName: 'Charging Monstrosaur', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['trample', 'haste'] } },
  { id: id(), scryfallName: 'Charging Monstrosaur', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['trample', 'haste'] } },
  { id: id(), scryfallName: 'Charging Monstrosaur', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['trample', 'haste'] } },

  { id: id(), scryfallName: 'Ripjaw Raptor', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Ripjaw Raptor', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Ripjaw Raptor', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },

  { id: id(), scryfallName: 'Territorial Allosaurus', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['vigilance'] } },
  { id: id(), scryfallName: 'Territorial Allosaurus', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['vigilance'] } },
  { id: id(), scryfallName: 'Territorial Allosaurus', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['vigilance'] } },

  { id: id(), scryfallName: 'Thrashing Brontodon', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Thrashing Brontodon', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 5, keywords: [] } },

  { id: id(), scryfallName: 'Ranging Raptor', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Ranging Raptor', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },

  { id: id(), scryfallName: 'Raptor Companion', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } },
  { id: id(), scryfallName: 'Raptor Companion', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } },
  { id: id(), scryfallName: 'Raptor Companion', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 3, keywords: [] } },

  { id: id(), scryfallName: 'Sun-Crested Pterodon', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['flying'] } },
  { id: id(), scryfallName: 'Sun-Crested Pterodon', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: ['flying'] } },

  { id: id(), scryfallName: 'Shifting Ceratops', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },
  { id: id(), scryfallName: 'Shifting Ceratops', effect: { kind: 'CreateCreature', count: 1, power: 5, toughness: 5, keywords: [] } },

  { id: id(), scryfallName: 'Regisaur Alpha', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['haste'] } },
  { id: id(), scryfallName: 'Regisaur Alpha', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: ['haste'] } },

  { id: id(), scryfallName: 'Ripscale Predator', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 1, keywords: ['menace'] } },
  { id: id(), scryfallName: 'Ripscale Predator', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 1, keywords: ['menace'] } },

  { id: id(), scryfallName: 'Forerunner of the Empire', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },
  { id: id(), scryfallName: 'Forerunner of the Empire', effect: { kind: 'CreateCreature', count: 1, power: 4, toughness: 4, keywords: [] } },

  { id: id(), scryfallName: 'Frenzied Raptor', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Frenzied Raptor', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 2, keywords: [] } },
  { id: id(), scryfallName: 'Frenzied Raptor', effect: { kind: 'CreateCreature', count: 1, power: 3, toughness: 2, keywords: [] } },

  { id: id(), scryfallName: "Gishath, Sun's Avatar", effect: { kind: 'CreateCreature', count: 1, power: 7, toughness: 6, keywords: ['trample', 'haste'] } },
  { id: id(), scryfallName: 'Zetalpa, Primal Dawn', effect: { kind: 'CreateCreature', count: 1, power: 8, toughness: 8, keywords: ['flying', 'firststrike', 'vigilance'] } },
  { id: id(), scryfallName: 'Etali, Primal Storm', effect: { kind: 'CreateCreature', count: 1, power: 6, toughness: 5, keywords: ['trample'] } },

  // --- Rimozioni / danno / sacrificio (istruzioni per il tavolo, solo
  // effetti non a bersaglio) ---------------------------------------------
  { id: id(), scryfallName: "Yahenni's Expertise", effect: { kind: 'DamageInstruction', amount: 2, target: 'allCreatures' } },
  { id: id(), scryfallName: "Yahenni's Expertise", effect: { kind: 'DamageInstruction', amount: 2, target: 'allCreatures' } },
  { id: id(), scryfallName: "Bontu's Last Reckoning", effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Fumigate', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Crux of Fate', effect: { kind: 'RemovalInstruction', mode: 'all', count: 1, destroyOrExile: 'destroy' } },
  { id: id(), scryfallName: 'Barter in Blood', effect: { kind: 'SacrificeInstruction', perPlayer: true, count: 2 } },
  { id: id(), scryfallName: 'Diabolic Edict', effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Diabolic Edict', effect: { kind: 'SacrificeInstruction', perPlayer: false, count: 1 } },
  { id: id(), scryfallName: 'Languish', effect: { kind: 'DamageInstruction', amount: 4, target: 'allCreatures' } },
  {
    id: id(),
    scryfallName: 'Toxic Deluge',
    effect: {
      kind: 'DamageInstruction',
      amount: { query: 'Che X scegli per Toxic Deluge, guardando le creature dei giocatori?', multiplier: 1, offset: 0, min: 1 },
      target: 'allCreatures',
    },
  },

  // --- Utility (stato del bot) -------------------------------------------
  { id: id(), scryfallName: 'Commune with Dinosaurs', effect: { kind: 'DrawExtraBot', amount: 1 } },
  { id: id(), scryfallName: 'Commune with Dinosaurs', effect: { kind: 'DrawExtraBot', amount: 1 } },
  { id: id(), scryfallName: 'Rest for the Weary', effect: { kind: 'GainLifeBot', amount: 8 } },
  { id: id(), scryfallName: 'Overrun', effect: { kind: 'PumpBotBoard', powerBonus: 3, toughnessBonus: 3, grantKeywords: ['trample'] } },
]
