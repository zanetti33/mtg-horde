import { describe, expect, it } from 'vitest'
import type { DamageInstructionEffect, DeckCardConfig, DiscardInstructionEffect, RemovalInstructionEffect, SacrificeInstructionEffect } from '../types'
import { describeDamage, describeDiscard, describeRemoval, describeSacrifice } from './instructionText'

function card(effect: DeckCardConfig['effect']): DeckCardConfig {
  return { id: 'card-1', scryfallName: 'Test', effect }
}

describe('describeRemoval', () => {
  it('describes a single highest-power destroy', () => {
    const effect: RemovalInstructionEffect = { kind: 'RemovalInstruction', mode: 'highestPower', count: 1, destroyOrExile: 'destroy' }
    expect(describeRemoval(card(effect), effect, {})).toBe("Destroy the creature with the highest power among the players' creatures.")
  })

  it('pluralizes when count > 1 and uses exile wording', () => {
    const effect: RemovalInstructionEffect = { kind: 'RemovalInstruction', mode: 'highestToughness', count: 2, destroyOrExile: 'exile' }
    expect(describeRemoval(card(effect), effect, {})).toBe("Exile the 2 creatures with the highest toughness among the players' creatures.")
  })

  it('ignores count for mode "all"', () => {
    const effect: RemovalInstructionEffect = { kind: 'RemovalInstruction', mode: 'all', count: 99, destroyOrExile: 'destroy' }
    expect(describeRemoval(card(effect), effect, {})).toBe('Destroy all creatures the players control.')
  })

  it('describes random removal singular vs plural', () => {
    const single: RemovalInstructionEffect = { kind: 'RemovalInstruction', mode: 'random', count: 1, destroyOrExile: 'destroy' }
    const multi: RemovalInstructionEffect = { kind: 'RemovalInstruction', mode: 'random', count: 3, destroyOrExile: 'destroy' }
    expect(describeRemoval(card(single), single, {})).toContain('a random creature')
    expect(describeRemoval(card(multi), multi, {})).toContain('3 random creatures')
  })
})

describe('describeDamage', () => {
  it('covers every target', () => {
    const cases: Array<[DamageInstructionEffect['target'], string]> = [
      ['eachPlayer', 'Each player loses 3 life.'],
      ['creatureHighestPower', "Deal 3 damage to the creature with the highest power among the players' creatures."],
      ['creatureHighestToughness', "Deal 3 damage to the creature with the highest toughness among the players' creatures."],
      ['creatureRandom', "Deal 3 damage to a random creature among the players' creatures."],
      ['allCreatures', "Deal 3 damage to all of the players' creatures."],
    ]
    for (const [target, expected] of cases) {
      const effect: DamageInstructionEffect = { kind: 'DamageInstruction', amount: 3, target }
      expect(describeDamage(card(effect), effect, {})).toBe(expected)
    }
  })
})

describe('describeSacrifice / describeDiscard', () => {
  it('phrases per-player vs total sacrifice', () => {
    const perPlayer: SacrificeInstructionEffect = { kind: 'SacrificeInstruction', perPlayer: true, count: 2 }
    const total: SacrificeInstructionEffect = { kind: 'SacrificeInstruction', perPlayer: false, count: 1 }
    expect(describeSacrifice(card(perPlayer), perPlayer, {})).toBe('Each player sacrifices 2 creatures.')
    expect(describeSacrifice(card(total), total, {})).toBe('Players jointly choose a creature to sacrifice in total.')
  })

  it('phrases per-player vs total discard', () => {
    const perPlayer: DiscardInstructionEffect = { kind: 'DiscardInstruction', perPlayer: true, count: 3 }
    expect(describeDiscard(card(perPlayer), perPlayer, {})).toBe('Each player discards 3 cards.')
  })
})
