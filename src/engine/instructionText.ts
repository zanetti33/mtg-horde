import type { DamageInstructionEffect, DiscardInstructionEffect, RemovalInstructionEffect, SacrificeInstructionEffect } from '../types'

const REMOVAL_MODE_LABEL: Record<Exclude<RemovalInstructionEffect['mode'], 'all' | 'random'>, string> = {
  highestPower: 'with the highest power',
  highestToughness: 'with the highest toughness',
  highestManaValue: 'with the highest mana value',
}

export function describeRemoval(effect: RemovalInstructionEffect): string {
  const verb = effect.destroyOrExile === 'destroy' ? 'Destroy' : 'Exile'

  if (effect.mode === 'all') {
    return `${verb} all creatures the players control.`
  }

  const count = Math.max(0, effect.count)

  if (effect.mode === 'random') {
    const noun = count === 1 ? 'a random creature' : `${count} random creatures`
    return `${verb} ${noun} among the players' creatures.`
  }

  const label = REMOVAL_MODE_LABEL[effect.mode]
  const noun = count === 1 ? `the creature ${label}` : `the ${count} creatures ${label}`
  return `${verb} ${noun} among the players' creatures.`
}

export function describeDamage(effect: DamageInstructionEffect): string {
  const amount = effect.amount

  switch (effect.target) {
    case 'eachPlayer':
      return `Each player loses ${amount} life.`
    case 'creatureHighestPower':
      return `Deal ${amount} damage to the creature with the highest power among the players' creatures.`
    case 'creatureHighestToughness':
      return `Deal ${amount} damage to the creature with the highest toughness among the players' creatures.`
    case 'creatureRandom':
      return `Deal ${amount} damage to a random creature among the players' creatures.`
    case 'allCreatures':
      return `Deal ${amount} damage to all of the players' creatures.`
  }
}

export function describeSacrifice(effect: SacrificeInstructionEffect): string {
  const count = Math.max(0, effect.count)
  const noun = count === 1 ? 'a creature' : `${count} creatures`
  return effect.perPlayer ? `Each player sacrifices ${noun}.` : `Players jointly choose ${noun} to sacrifice in total.`
}

export function describeDiscard(effect: DiscardInstructionEffect): string {
  const count = Math.max(0, effect.count)
  const noun = count === 1 ? 'a card' : `${count} cards`
  return effect.perPlayer ? `Each player discards ${noun}.` : `Players jointly choose ${noun} to discard in total.`
}
