import type { EffectParams, EffectTemplateId } from '../types'

export const TEMPLATE_LABELS: Record<EffectTemplateId, string> = {
  CreateCreature: 'Evoca creatura/token',
  PumpBotBoard: 'Potenzia la board del bot',
  GainLifeBot: 'Il bot guadagna vita',
  DrawExtraBot: 'Il bot pesca carte extra',
  RemovalInstruction: 'Rimozione (istruzione al tavolo)',
  DamageInstruction: 'Danno (istruzione al tavolo)',
  SacrificeInstruction: 'Sacrificio (istruzione al tavolo)',
  DiscardInstruction: 'Scarto (istruzione al tavolo)',
}

export function defaultEffectFor(kind: EffectTemplateId): EffectParams {
  switch (kind) {
    case 'CreateCreature':
      return { kind, count: 1, power: 1, toughness: 1, keywords: [] }
    case 'PumpBotBoard':
      return { kind, powerBonus: 1, toughnessBonus: 1, grantKeywords: [] }
    case 'GainLifeBot':
      return { kind, amount: 3 }
    case 'DrawExtraBot':
      return { kind, amount: 1 }
    case 'RemovalInstruction':
      return { kind, mode: 'highestPower', count: 1, destroyOrExile: 'destroy' }
    case 'DamageInstruction':
      return { kind, amount: 3, target: 'creatureHighestPower' }
    case 'SacrificeInstruction':
      return { kind, perPlayer: false, count: 1 }
    case 'DiscardInstruction':
      return { kind, perPlayer: false, count: 1 }
  }
}
