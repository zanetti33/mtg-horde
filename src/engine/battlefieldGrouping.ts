import type { BattlefieldCreature, BotPermanent } from '../types'

/**
 * Groups battlefield creatures/permanents that are visually indistinguishable — same name, stats,
 * keywords, image — so `BotPanel` can render them as a single stacked pile (with a "×N" badge)
 * instead of one full tile per instance. A Horde deck routinely puts 5-13 identical tokens on the
 * board from a single card (see docs/roadmap.md item 1), which would otherwise flood the grid with
 * repeated tiles carrying no extra information.
 *
 * Grouping is by *base* stats, not `getEffectiveStats`'s derived ones: every creature on the board
 * shares the same `BotPermanent[]`, so two creatures with identical base stats always end up with
 * identical effective stats too — there's no per-creature-conditional buff in this engine. This
 * keeps the grouping key independent of `bot.permanents` entirely.
 *
 * `summoningSick` is part of the key on purpose: two copies of the same creature can coexist with
 * different sickness (one just summoned, one from a previous turn), and merging them would make the
 * "summoning sickness" note on the stack ambiguous — so they render as two separate stacks instead.
 */
export interface CreatureGroup {
  key: string
  representative: BattlefieldCreature
  instanceIds: string[]
}

export interface PermanentGroup {
  key: string
  representative: BotPermanent
  instanceIds: string[]
}

function creatureGroupKey(c: BattlefieldCreature): string {
  return [
    c.name,
    c.isToken,
    c.power,
    c.toughness,
    [...c.keywords].sort().join(','),
    c.summoningSick,
    c.imageUrl ?? '',
    c.typeLine ?? '',
    [...(c.colors ?? [])].sort().join(','),
  ].join('|')
}

function permanentGroupKey(p: BotPermanent): string {
  return [
    p.name,
    p.permanentType,
    p.powerBonus,
    p.toughnessBonus,
    [...p.grantKeywords].sort().join(','),
    p.imageUrl ?? '',
    p.typeLine ?? '',
    [...(p.colors ?? [])].sort().join(','),
  ].join('|')
}

/** Order is stable: a group first appears wherever its first member would have — new copies grow an existing stack in place instead of it jumping around the grid. */
export function groupCreatures(battlefield: BattlefieldCreature[]): CreatureGroup[] {
  const groups = new Map<string, CreatureGroup>()
  for (const creature of battlefield) {
    const key = creatureGroupKey(creature)
    const existing = groups.get(key)
    if (existing) existing.instanceIds.push(creature.instanceId)
    else groups.set(key, { key, representative: creature, instanceIds: [creature.instanceId] })
  }
  return Array.from(groups.values())
}

export function groupPermanents(permanents: BotPermanent[]): PermanentGroup[] {
  const groups = new Map<string, PermanentGroup>()
  for (const permanent of permanents) {
    const key = permanentGroupKey(permanent)
    const existing = groups.get(key)
    if (existing) existing.instanceIds.push(permanent.instanceId)
    else groups.set(key, { key, representative: permanent, instanceIds: [permanent.instanceId] })
  }
  return Array.from(groups.values())
}
