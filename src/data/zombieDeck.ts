import type { DeckCardConfig } from '../types'

// Mazzo a tema Zombie: ~49 carte reali, con più copie delle stesse carte
// (come un vero mazzo Horde, pensato per durare molti turni). Segue lo
// stesso criterio di curatela del mazzo precompilato (vedi defaultDeck.ts e
// docs/design-di-gioco.md), con un vincolo in più: per le istruzioni verso i
// giocatori (rimozioni, danno, sacrificio, scarto) si scelgono solo carte
// reali che NON targettano — edict ("ogni giocatore sacrifica...") e
// spazzate simmetriche ("distruggi tutte le creature", "-X/-X a tutte le
// creature") — invece di riadattare rimozioni a bersaglio singolo (es. "Doom
// Blade") sul template "potere/costituzione/mana value più alto". Il bot non
// vede la board dei giocatori, quindi ogni istruzione lasciata al tavolo
// dev'essere già di per sé priva di scelte arbitrarie da parte del bot.
//
// Extinction Event è l'unica eccezione che richiede un errata: il testo
// reale è modale ("distruggi le creature con mana value 3 o meno, OPPURE
// quelle con mana value 4 o più") e nessun RemovalMode esistente esprime "il
// tavolo sceglie l'opzione più impattante" — vedi il campo `errata` sotto.

let counter = 0
function id(): string {
  counter += 1
  return `zombie-${counter.toString().padStart(2, '0')}`
}

export const zombieDeck: DeckCardConfig[] = [
  // --- Creature -------------------------------------------------------
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

  // --- Rimozioni / danno / sacrificio / scarto (istruzioni per il tavolo,
  // solo effetti non a bersaglio) ---------------------------------------
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
      "Scegli l'opzione che colpirebbe più creature dei giocatori: distruggi tutte le loro creature con valore di mana 3 o inferiore, oppure distruggi tutte le loro creature con valore di mana 4 o superiore.",
  },
  {
    id: id(),
    scryfallName: 'Debt to the Deathless',
    effect: { kind: 'DamageInstruction', amount: { query: 'Quant è la devozione al nero del bot (permanenti neri in gioco)?', multiplier: 1, offset: 0, min: 2 }, target: 'eachPlayer' },
  },

  // --- Utility (stato del bot) -------------------------------------------
  { id: id(), scryfallName: 'Read the Bones', effect: { kind: 'DrawExtraBot', amount: 2 } },
  { id: id(), scryfallName: 'Rest for the Weary', effect: { kind: 'GainLifeBot', amount: 8 } },
  { id: id(), scryfallName: 'Overrun', effect: { kind: 'PumpBotBoard', powerBonus: 3, toughnessBonus: 3, grantKeywords: ['trample'] } },
]
