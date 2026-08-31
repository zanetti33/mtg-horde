import { describe, expect, it } from 'vitest'
import type { DamageInstructionEffect, DeckCardConfig, DiscardInstructionEffect, RemovalInstructionEffect, SacrificeInstructionEffect } from '../types'
import { describeDamage, describeDiscard, describeRemoval, describeSacrifice } from './instructionText'

function card(effect: DeckCardConfig['effect']): DeckCardConfig {
  return { id: 'card-1', scryfallName: 'Test', effect }
}

describe('describeRemoval', () => {
  it('describes a single highest-power destroy', () => {
    const effect: RemovalInstructionEffect = { kind: 'RemovalInstruction', mode: 'highestPower', count: 1, destroyOrExile: 'destroy' }
    expect(describeRemoval(card(effect), effect, {})).toBe('Distruggi la creatura con potere più alto tra quelle dei giocatori.')
  })

  it('pluralizes when count > 1 and uses exile wording', () => {
    const effect: RemovalInstructionEffect = { kind: 'RemovalInstruction', mode: 'highestToughness', count: 2, destroyOrExile: 'exile' }
    expect(describeRemoval(card(effect), effect, {})).toBe('Esilia le 2 creature con costituzione più alta tra quelle dei giocatori.')
  })

  it('ignores count for mode "all"', () => {
    const effect: RemovalInstructionEffect = { kind: 'RemovalInstruction', mode: 'all', count: 99, destroyOrExile: 'destroy' }
    expect(describeRemoval(card(effect), effect, {})).toBe('Distruggi tutte le creature in gioco dei giocatori.')
  })

  it('describes random removal singular vs plural', () => {
    const single: RemovalInstructionEffect = { kind: 'RemovalInstruction', mode: 'random', count: 1, destroyOrExile: 'destroy' }
    const multi: RemovalInstructionEffect = { kind: 'RemovalInstruction', mode: 'random', count: 3, destroyOrExile: 'destroy' }
    expect(describeRemoval(card(single), single, {})).toContain('una creatura a caso')
    expect(describeRemoval(card(multi), multi, {})).toContain('3 creature a caso')
  })
})

describe('describeDamage', () => {
  it('covers every target', () => {
    const cases: Array<[DamageInstructionEffect['target'], string]> = [
      ['eachPlayer', 'Ogni giocatore perde 3 vita.'],
      ['creatureHighestPower', 'Infliggi 3 danni alla creatura con potere più alto tra quelle dei giocatori.'],
      ['creatureHighestToughness', 'Infliggi 3 danni alla creatura con costituzione più alta tra quelle dei giocatori.'],
      ['creatureRandom', 'Infliggi 3 danni a una creatura a caso tra quelle dei giocatori.'],
      ['allCreatures', 'Infliggi 3 danni a tutte le creature dei giocatori.'],
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
    expect(describeSacrifice(card(perPlayer), perPlayer, {})).toBe('Ogni giocatore sacrifica 2 creature.')
    expect(describeSacrifice(card(total), total, {})).toBe('I giocatori scelgono insieme una creatura da sacrificare, in totale.')
  })

  it('phrases per-player vs total discard', () => {
    const perPlayer: DiscardInstructionEffect = { kind: 'DiscardInstruction', perPlayer: true, count: 3 }
    expect(describeDiscard(card(perPlayer), perPlayer, {})).toBe('Ogni giocatore scarta 3 carte.')
  })
})
