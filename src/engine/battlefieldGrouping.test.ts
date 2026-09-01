import { describe, expect, it } from 'vitest'
import type { BattlefieldCreature, BotPermanent } from '../types'
import { groupCreatures, groupPermanents } from './battlefieldGrouping'

function creature(overrides: Partial<BattlefieldCreature> = {}): BattlefieldCreature {
  return {
    instanceId: crypto.randomUUID(),
    name: 'Zombie',
    isToken: true,
    power: 2,
    toughness: 2,
    keywords: [],
    summoningSick: false,
    ...overrides,
  }
}

function permanent(overrides: Partial<BotPermanent> = {}): BotPermanent {
  return {
    instanceId: crypto.randomUUID(),
    name: 'Glorious Anthem',
    permanentType: 'enchantment',
    powerBonus: 1,
    toughnessBonus: 1,
    grantKeywords: [],
    sourceDeckCardId: 'p1',
    ...overrides,
  }
}

describe('groupCreatures', () => {
  it('groups indistinguishable creatures into a single stack', () => {
    const a = creature({ instanceId: 'a' })
    const b = creature({ instanceId: 'b' })
    const c = creature({ instanceId: 'c' })
    const groups = groupCreatures([a, b, c])
    expect(groups).toHaveLength(1)
    expect(groups[0].instanceIds).toEqual(['a', 'b', 'c'])
    expect(groups[0].representative).toBe(a)
  })

  it('keeps creatures with different keywords in separate stacks, order-independent', () => {
    const a = creature({ instanceId: 'a', keywords: ['flying', 'trample'] })
    const b = creature({ instanceId: 'b', keywords: ['trample', 'flying'] }) // same set, different order
    const c = creature({ instanceId: 'c', keywords: ['flying'] })
    const groups = groupCreatures([a, b, c])
    expect(groups).toHaveLength(2)
    expect(groups[0].instanceIds).toEqual(['a', 'b'])
    expect(groups[1].instanceIds).toEqual(['c'])
  })

  it('keeps different summoning-sickness in separate stacks even if otherwise identical', () => {
    const sick = creature({ instanceId: 'sick', summoningSick: true })
    const ready = creature({ instanceId: 'ready', summoningSick: false })
    const groups = groupCreatures([sick, ready])
    expect(groups).toHaveLength(2)
  })

  it('keeps a token and a same-named non-token body in separate stacks', () => {
    const token = creature({ instanceId: 't', isToken: true, imageUrl: undefined })
    const real = creature({ instanceId: 'r', isToken: false, imageUrl: 'img.png' })
    const groups = groupCreatures([token, real])
    expect(groups).toHaveLength(2)
  })

  it('preserves first-seen order of stacks', () => {
    const a = creature({ instanceId: 'a', name: 'A' })
    const b = creature({ instanceId: 'b', name: 'B' })
    const a2 = creature({ instanceId: 'a2', name: 'A' })
    const groups = groupCreatures([a, b, a2])
    expect(groups.map((g) => g.representative.name)).toEqual(['A', 'B'])
    expect(groups[0].instanceIds).toEqual(['a', 'a2'])
  })

  it('returns an empty array for an empty battlefield', () => {
    expect(groupCreatures([])).toEqual([])
  })
})

describe('groupPermanents', () => {
  it('groups indistinguishable permanents (e.g. two copies of the same anthem) into one stack', () => {
    const a = permanent({ instanceId: 'a' })
    const b = permanent({ instanceId: 'b' })
    const groups = groupPermanents([a, b])
    expect(groups).toHaveLength(1)
    expect(groups[0].instanceIds).toEqual(['a', 'b'])
  })

  it('keeps different permanent buffs in separate stacks', () => {
    const anthem = permanent({ instanceId: 'a', name: 'Glorious Anthem' })
    const spear = permanent({ instanceId: 'b', name: 'Spear of Heliod', permanentType: 'artifact' })
    const groups = groupPermanents([anthem, spear])
    expect(groups).toHaveLength(2)
  })
})
