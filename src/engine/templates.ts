import type {
  BattlefieldCreature,
  CreateCreatureEffect,
  DeckCardConfig,
  EffectTemplateId,
  GainLifeBotEffect,
  DrawExtraBotEffect,
  Keyword,
  NumericValue,
  PumpBotBoardEffect,
} from '../types'
import { isQueryValue } from '../types'

/** Which fields of each effect kind are NumericValue (and therefore may carry a query). */
const NUMERIC_FIELDS: Record<EffectTemplateId, string[]> = {
  CreateCreature: ['count', 'power', 'toughness'],
  PumpBotBoard: ['powerBonus', 'toughnessBonus'],
  GainLifeBot: ['amount'],
  DrawExtraBot: ['amount'],
  RemovalInstruction: ['count'],
  DamageInstruction: ['amount'],
  SacrificeInstruction: ['count'],
  DiscardInstruction: ['count'],
}

export interface QueryPrompt {
  /** Unique key identifying this query slot: `${deckCardId}:${fieldName}`. */
  key: string
  prompt: string
  cardName: string
}

// Keyed by card + question text (not field name): two fields on the same
// card asking the identical question (e.g. Bane of Progress's power and
// toughness) share one answer instead of prompting twice.
function queryKey(deckCardId: string, query: string): string {
  return `${deckCardId}:${query}`
}

/** Scans a deck card's effect params for query-driven numeric fields. */
export function collectQueriesForCard(card: DeckCardConfig): QueryPrompt[] {
  const fields = NUMERIC_FIELDS[card.effect.kind] ?? []
  const prompts: QueryPrompt[] = []
  const seenKeys = new Set<string>()
  for (const field of fields) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (card.effect as any)[field] as NumericValue | undefined
    if (value !== undefined && isQueryValue(value)) {
      const key = queryKey(card.id, value.query)
      if (seenKeys.has(key)) continue
      seenKeys.add(key)
      prompts.push({ key, prompt: value.query, cardName: card.scryfallName })
    }
  }
  return prompts
}

/** Resolves one numeric field of a card's effect to a concrete number. */
export function resolveNumeric(card: DeckCardConfig, field: string, queryAnswers: Record<string, number>): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = (card.effect as any)[field] as NumericValue
  if (typeof value === 'number') return value
  const answer = queryAnswers[queryKey(card.id, value.query)] ?? 0
  let result = answer * value.multiplier + value.offset
  if (value.min !== undefined) result = Math.max(value.min, result)
  if (value.max !== undefined) result = Math.min(value.max, result)
  return result
}

function newInstanceId(): string {
  return crypto.randomUUID()
}

export interface CreateCreatureResult {
  creatures: BattlefieldCreature[]
  description: string
}

export function applyCreateCreature(card: DeckCardConfig, effect: CreateCreatureEffect, queryAnswers: Record<string, number>): CreateCreatureResult {
  const count = Math.max(0, Math.round(resolveNumeric(card, 'count', queryAnswers)))
  const power = Math.round(resolveNumeric(card, 'power', queryAnswers))
  const toughness = Math.round(resolveNumeric(card, 'toughness', queryAnswers))
  const isToken = count !== 1
  const hasHaste = effect.keywords.includes('haste')
  const baseName = isToken ? (effect.tokenName ?? card.scryfallName) : card.scryfallName

  const creatures: BattlefieldCreature[] = Array.from({ length: count }, () => ({
    instanceId: newInstanceId(),
    name: isToken ? `${baseName} (token)` : baseName,
    imageUrl: isToken ? undefined : card.scryfall?.imageUrl,
    isToken,
    power,
    toughness,
    keywords: effect.keywords,
    summoningSick: !hasHaste,
    sourceDeckCardId: card.id,
  }))

  const keywordSuffix = effect.keywords.length > 0 ? ` (${effect.keywords.join(', ')})` : ''
  const description =
    count === 0
      ? 'no effect (0 creatures generated)'
      : count === 1
        ? `summons ${baseName} ${power}/${toughness}${keywordSuffix}`
        : `summons ${count} ${baseName} tokens ${power}/${toughness}${keywordSuffix}`

  return { creatures, description }
}

/**
 * Builds the battlefield object for a card re-entering play from another
 * zone (manual correction, mill/reanimation-style effect, ...) — as opposed
 * to `applyCreateCreature`, which is for the bot *casting* the card. Reuses
 * the given instance id (the card keeps its identity across zones) and
 * always produces exactly one non-token creature: only `CreateCreature`
 * cards have a body to put into play, and moving a real card back to the
 * battlefield is never the "make N tokens" reading of `count`. Numeric
 * fields driven by a query resolve with no answers (falls back to
 * `offset`/`min`), since this happens outside the turn-resolution flow that
 * collects query answers up front.
 */
export function buildBattlefieldCreatureFromCard(card: DeckCardConfig, instanceId: string): BattlefieldCreature | null {
  if (card.effect.kind !== 'CreateCreature') return null
  const effect = card.effect
  const power = Math.round(resolveNumeric(card, 'power', {}))
  const toughness = Math.round(resolveNumeric(card, 'toughness', {}))
  const hasHaste = effect.keywords.includes('haste')

  return {
    instanceId,
    name: card.scryfallName,
    imageUrl: card.scryfall?.imageUrl,
    isToken: false,
    power,
    toughness,
    keywords: effect.keywords,
    summoningSick: !hasHaste,
    sourceDeckCardId: card.id,
  }
}

export interface PumpBoardResult {
  battlefield: BattlefieldCreature[]
  description: string
}

export function applyPumpBotBoard(
  card: DeckCardConfig,
  effect: PumpBotBoardEffect,
  queryAnswers: Record<string, number>,
  battlefield: BattlefieldCreature[],
): PumpBoardResult {
  const powerBonus = Math.round(resolveNumeric(card, 'powerBonus', queryAnswers))
  const toughnessBonus = Math.round(resolveNumeric(card, 'toughnessBonus', queryAnswers))
  const grant = effect.grantKeywords

  const updated = battlefield.map((creature) => ({
    ...creature,
    power: creature.power + powerBonus,
    toughness: creature.toughness + toughnessBonus,
    keywords: Array.from(new Set<Keyword>([...creature.keywords, ...grant])),
  }))

  const parts = [`+${powerBonus}/+${toughnessBonus}`]
  if (grant.length > 0) parts.push(`grants ${grant.join(', ')}`)
  const description = `the bot's creatures get ${parts.join(' and ')}`

  return { battlefield: updated, description }
}

export function applyGainLifeBot(card: DeckCardConfig, _effect: GainLifeBotEffect, queryAnswers: Record<string, number>) {
  const amount = Math.round(resolveNumeric(card, 'amount', queryAnswers))
  return { amount, description: `the bot gains ${amount} life` }
}

export function applyDrawExtraBot(card: DeckCardConfig, _effect: DrawExtraBotEffect, queryAnswers: Record<string, number>) {
  const amount = Math.round(resolveNumeric(card, 'amount', queryAnswers))
  return { amount, description: `the bot draws ${amount} extra card${amount === 1 ? '' : 's'}` }
}
