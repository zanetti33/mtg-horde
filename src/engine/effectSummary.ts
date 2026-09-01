import type { BotPermanent, DamageTarget, EffectParams, RemovalMode } from '../types'
import { KEYWORD_LABELS } from '../types'

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

/** One-line description of an effect for the deck list (no game context). */
export function summarizeEffect(effect: EffectParams): string {
  switch (effect.kind) {
    case 'CreateCreature': {
      const pt = `${effect.power}/${effect.toughness}`
      const kws = effect.keywords.length ? ` — ${effect.keywords.map((k) => KEYWORD_LABELS[k]).join(', ')}` : ''
      const isToken = effect.count !== 1
      const countLabel = isToken ? ` ×${effect.count}` : ''
      const tokenBits = [effect.tokenColors?.length ? effect.tokenColors.join('/') : null, effect.tokenTypeLine].filter(Boolean)
      const tokenLabel = isToken && tokenBits.length ? ` (${tokenBits.join(' ')})` : ''
      return `Creature ${pt}${kws}${countLabel}${tokenLabel}`
    }
    case 'PumpBotBoard': {
      const kws = effect.grantKeywords.length ? `, grants ${effect.grantKeywords.map((k) => KEYWORD_LABELS[k]).join(', ')}` : ''
      return `Pump bot board: +${effect.powerBonus}/+${effect.toughnessBonus}${kws}`
    }
    case 'CreatePermanent': {
      const kws = effect.grantKeywords.length ? `, grants ${effect.grantKeywords.map((k) => KEYWORD_LABELS[k]).join(', ')}` : ''
      const typeLabel = effect.permanentType === 'artifact' ? 'Artifact' : 'Enchantment'
      return `${typeLabel} (persistent): +${effect.powerBonus}/+${effect.toughnessBonus}${kws}`
    }
    case 'GainLifeBot':
      return `The bot gains ${effect.amount} life`
    case 'DrawExtraBot':
      return `The bot draws ${effect.amount} extra cards`
    case 'RemovalInstruction':
      return `${effect.destroyOrExile === 'destroy' ? 'Destroy' : 'Exile'}: ${effect.mode === 'all' ? 'all creatures' : `${effect.count} with ${REMOVAL_MODE_LABEL[effect.mode]}`}`
    case 'DamageInstruction':
      return `Damage ${effect.amount} to ${DAMAGE_TARGET_LABEL[effect.target]}`
    case 'SacrificeInstruction':
      return `Sacrifice: ${effect.perPlayer ? 'each player' : 'total among players'} ×${effect.count}`
    case 'DiscardInstruction':
      return `Discard: ${effect.perPlayer ? 'each player' : 'total among players'} ×${effect.count}`
  }
}

/** One-line description of a live `BotPermanent`'s ongoing buff, for the "Bot permanents" section of BotPanel. */
export function summarizePermanent(permanent: BotPermanent): string {
  const parts: string[] = []
  if (permanent.powerBonus !== 0 || permanent.toughnessBonus !== 0) parts.push(`+${permanent.powerBonus}/+${permanent.toughnessBonus}`)
  if (permanent.grantKeywords.length > 0) parts.push(permanent.grantKeywords.map((k) => KEYWORD_LABELS[k]).join(', '))
  return parts.length > 0 ? `Bot creatures get ${parts.join(', ')}` : 'No ongoing effect'
}
