import type { EffectParams, EffectTemplateId } from '../types'

export const TEMPLATE_LABELS: Record<EffectTemplateId, string> = {
  CreateCreature: 'Summon creature/token',
  PumpBotBoard: 'Buff the bot board',
  GainLifeBot: 'The bot gains life',
  DrawExtraBot: 'The bot draws extra cards',
  RemovalInstruction: 'Removal (table instruction)',
  DamageInstruction: 'Damage (table instruction)',
  SacrificeInstruction: 'Sacrifice (table instruction)',
  DiscardInstruction: 'Discard (table instruction)',
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
