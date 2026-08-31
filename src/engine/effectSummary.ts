import type { DamageTarget, EffectParams, NumericValue, RemovalMode } from '../types'
import { isQueryValue, KEYWORD_LABELS } from '../types'

function formatNumeric(v: NumericValue): string {
  if (typeof v === 'number') return String(v)
  const parts = [`${v.multiplier}× risposta`]
  if (v.offset) parts.push(`${v.offset >= 0 ? '+' : ''}${v.offset}`)
  if (v.min !== undefined) parts.push(`min ${v.min}`)
  if (v.max !== undefined) parts.push(`max ${v.max}`)
  return `[${parts.join(', ')}]`
}

const REMOVAL_MODE_LABEL: Record<RemovalMode, string> = {
  highestPower: 'potere più alto',
  highestToughness: 'costituzione più alta',
  highestManaValue: 'mana value più alto',
  random: 'a caso',
  all: 'tutte',
}

const DAMAGE_TARGET_LABEL: Record<DamageTarget, string> = {
  eachPlayer: 'ogni giocatore',
  creatureHighestPower: 'creatura con potere più alto',
  creatureHighestToughness: 'creatura con costituzione più alta',
  creatureRandom: 'creatura a caso',
  allCreatures: 'tutte le creature',
}

/** One-line, query-agnostic description of an effect for the deck list (no game context, no resolved numbers). */
export function summarizeEffect(effect: EffectParams): string {
  switch (effect.kind) {
    case 'CreateCreature': {
      const pt = `${formatNumeric(effect.power)}/${formatNumeric(effect.toughness)}`
      const kws = effect.keywords.length ? ` — ${effect.keywords.map((k) => KEYWORD_LABELS[k]).join(', ')}` : ''
      const countLabel = isQueryValue(effect.count) || effect.count !== 1 ? ` ×${formatNumeric(effect.count)}` : ''
      return `Creatura ${pt}${kws}${countLabel}`
    }
    case 'PumpBotBoard': {
      const kws = effect.grantKeywords.length ? `, concede ${effect.grantKeywords.map((k) => KEYWORD_LABELS[k]).join(', ')}` : ''
      return `Pump board bot: +${formatNumeric(effect.powerBonus)}/+${formatNumeric(effect.toughnessBonus)}${kws}`
    }
    case 'GainLifeBot':
      return `Il bot guadagna ${formatNumeric(effect.amount)} vita`
    case 'DrawExtraBot':
      return `Il bot pesca ${formatNumeric(effect.amount)} carte extra`
    case 'RemovalInstruction':
      return `${effect.destroyOrExile === 'destroy' ? 'Distruggi' : 'Esilia'}: ${effect.mode === 'all' ? 'tutte le creature' : `${formatNumeric(effect.count)} con ${REMOVAL_MODE_LABEL[effect.mode]}`}`
    case 'DamageInstruction':
      return `Danno ${formatNumeric(effect.amount)} a ${DAMAGE_TARGET_LABEL[effect.target]}`
    case 'SacrificeInstruction':
      return `Sacrificio: ${effect.perPlayer ? 'ogni giocatore' : 'totale tra i giocatori'} ×${formatNumeric(effect.count)}`
    case 'DiscardInstruction':
      return `Scarto: ${effect.perPlayer ? 'ogni giocatore' : 'totale tra i giocatori'} ×${formatNumeric(effect.count)}`
  }
}
