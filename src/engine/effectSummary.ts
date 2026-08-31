import type { DamageTarget, EffectParams, NumericValue, RemovalMode } from '../types'
import { isQueryValue, KEYWORD_LABELS } from '../types'

function formatNumeric(v: NumericValue): string {
  if (typeof v === 'number') return String(v)
  const parts = [`${v.multiplier}× answer`]
  if (v.offset) parts.push(`${v.offset >= 0 ? '+' : ''}${v.offset}`)
  if (v.min !== undefined) parts.push(`min ${v.min}`)
  if (v.max !== undefined) parts.push(`max ${v.max}`)
  return `[${parts.join(', ')}]`
}

const REMOVAL_MODE_LABEL: Record<RemovalMode, string> = {
  highestPower: 'highest power',
  highestToughness: 'highest toughness',
  highestManaValue: 'highest mana value',
  random: 'random',
  all: 'all',
}

const DAMAGE_TARGET_LABEL: Record<DamageTarget, string> = {
  eachPlayer: 'each player',
  creatureHighestPower: 'creature with highest power',
  creatureHighestToughness: 'creature with highest toughness',
  creatureRandom: 'random creature',
  allCreatures: 'all creatures',
}

/** One-line, query-agnostic description of an effect for the deck list (no game context, no resolved numbers). */
export function summarizeEffect(effect: EffectParams): string {
  switch (effect.kind) {
    case 'CreateCreature': {
      const pt = `${formatNumeric(effect.power)}/${formatNumeric(effect.toughness)}`
      const kws = effect.keywords.length ? ` — ${effect.keywords.map((k) => KEYWORD_LABELS[k]).join(', ')}` : ''
      const countLabel = isQueryValue(effect.count) || effect.count !== 1 ? ` ×${formatNumeric(effect.count)}` : ''
      return `Creature ${pt}${kws}${countLabel}`
    }
    case 'PumpBotBoard': {
      const kws = effect.grantKeywords.length ? `, grants ${effect.grantKeywords.map((k) => KEYWORD_LABELS[k]).join(', ')}` : ''
      return `Pump bot board: +${formatNumeric(effect.powerBonus)}/+${formatNumeric(effect.toughnessBonus)}${kws}`
    }
    case 'GainLifeBot':
      return `The bot gains ${formatNumeric(effect.amount)} life`
    case 'DrawExtraBot':
      return `The bot draws ${formatNumeric(effect.amount)} extra cards`
    case 'RemovalInstruction':
      return `${effect.destroyOrExile === 'destroy' ? 'Destroy' : 'Exile'}: ${effect.mode === 'all' ? 'all creatures' : `${formatNumeric(effect.count)} with ${REMOVAL_MODE_LABEL[effect.mode]}`}`
    case 'DamageInstruction':
      return `Damage ${formatNumeric(effect.amount)} to ${DAMAGE_TARGET_LABEL[effect.target]}`
    case 'SacrificeInstruction':
      return `Sacrifice: ${effect.perPlayer ? 'each player' : 'total among players'} ×${formatNumeric(effect.count)}`
    case 'DiscardInstruction':
      return `Discard: ${effect.perPlayer ? 'each player' : 'total among players'} ×${formatNumeric(effect.count)}`
  }
}
