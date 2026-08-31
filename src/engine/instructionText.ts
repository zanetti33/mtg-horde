import type { DamageInstructionEffect, DeckCardConfig, DiscardInstructionEffect, RemovalInstructionEffect, SacrificeInstructionEffect } from '../types'
import { resolveNumeric } from './templates'

const REMOVAL_MODE_LABEL: Record<Exclude<RemovalInstructionEffect['mode'], 'all' | 'random'>, string> = {
  highestPower: 'con potere più alto',
  highestToughness: 'con costituzione più alta',
  highestManaValue: 'con valore di mana più alto',
}

export function describeRemoval(card: DeckCardConfig, effect: RemovalInstructionEffect, queryAnswers: Record<string, number>): string {
  const verb = effect.destroyOrExile === 'destroy' ? 'Distruggi' : 'Esilia'

  if (effect.mode === 'all') {
    return `${verb} tutte le creature in gioco dei giocatori.`
  }

  const count = Math.max(0, Math.round(resolveNumeric(card, 'count', queryAnswers)))

  if (effect.mode === 'random') {
    const noun = count === 1 ? 'una creatura a caso' : `${count} creature a caso`
    return `${verb} ${noun} tra quelle dei giocatori.`
  }

  const label = REMOVAL_MODE_LABEL[effect.mode]
  const noun = count === 1 ? `la creatura ${label}` : `le ${count} creature ${label}`
  return `${verb} ${noun} tra quelle dei giocatori.`
}

export function describeDamage(card: DeckCardConfig, effect: DamageInstructionEffect, queryAnswers: Record<string, number>): string {
  const amount = Math.round(resolveNumeric(card, 'amount', queryAnswers))

  switch (effect.target) {
    case 'eachPlayer':
      return `Ogni giocatore perde ${amount} vita.`
    case 'creatureHighestPower':
      return `Infliggi ${amount} danni alla creatura con potere più alto tra quelle dei giocatori.`
    case 'creatureHighestToughness':
      return `Infliggi ${amount} danni alla creatura con costituzione più alta tra quelle dei giocatori.`
    case 'creatureRandom':
      return `Infliggi ${amount} danni a una creatura a caso tra quelle dei giocatori.`
    case 'allCreatures':
      return `Infliggi ${amount} danni a tutte le creature dei giocatori.`
  }
}

export function describeSacrifice(card: DeckCardConfig, effect: SacrificeInstructionEffect, queryAnswers: Record<string, number>): string {
  const count = Math.max(0, Math.round(resolveNumeric(card, 'count', queryAnswers)))
  const noun = count === 1 ? 'una creatura' : `${count} creature`
  return effect.perPlayer ? `Ogni giocatore sacrifica ${noun}.` : `I giocatori scelgono insieme ${noun} da sacrificare, in totale.`
}

export function describeDiscard(card: DeckCardConfig, effect: DiscardInstructionEffect, queryAnswers: Record<string, number>): string {
  const count = Math.max(0, Math.round(resolveNumeric(card, 'count', queryAnswers)))
  const noun = count === 1 ? 'una carta' : `${count} carte`
  return effect.perPlayer ? `Ogni giocatore scarta ${noun}.` : `I giocatori scelgono insieme ${noun} da scartare, in totale.`
}
