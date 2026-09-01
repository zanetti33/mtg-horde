import type {
  BattlefieldCreature,
  BotPermanent,
  CreateCreatureEffect,
  CreatePermanentEffect,
  DeckCardConfig,
  GainLifeBotEffect,
  DrawExtraBotEffect,
  Keyword,
  PumpBotBoardEffect,
} from '../types'

function newInstanceId(): string {
  return crypto.randomUUID()
}

export interface CreateCreatureResult {
  creatures: BattlefieldCreature[]
  description: string
}

export function applyCreateCreature(card: DeckCardConfig, effect: CreateCreatureEffect): CreateCreatureResult {
  const count = Math.max(0, effect.count)
  const power = effect.power
  const toughness = effect.toughness
  const isToken = count !== 1
  const hasHaste = effect.keywords.includes('haste')
  const baseName = isToken ? (effect.tokenName ?? card.scryfallName) : card.scryfallName
  // A real card's own Scryfall image already shows its type/colors. Tokens get the same treatment
  // when a real Scryfall *token* card is bundled for them (tokenScryfall — see types.ts); otherwise
  // they fall back to the deck author's plain-text tokenTypeLine/tokenColors and no image.
  const typeLine = isToken ? (effect.tokenScryfall?.typeLine ?? effect.tokenTypeLine) : card.scryfall?.typeLine
  const colors = isToken ? (effect.tokenScryfall?.colors ?? effect.tokenColors) : card.scryfall?.colors
  const imageUrl = isToken ? effect.tokenScryfall?.imageUrl : card.scryfall?.imageUrl

  const creatures: BattlefieldCreature[] = Array.from({ length: count }, () => ({
    instanceId: newInstanceId(),
    name: isToken ? `${baseName} (token)` : baseName,
    imageUrl,
    isToken,
    power,
    toughness,
    keywords: effect.keywords,
    summoningSick: !hasHaste,
    sourceDeckCardId: card.id,
    typeLine,
    colors,
  }))

  const keywordSuffix = effect.keywords.length > 0 ? ` (${effect.keywords.join(', ')})` : ''
  const colorPrefix = isToken && colors && colors.length > 0 ? ` ${colors.join('/')}` : ''
  const description =
    count === 0
      ? 'no effect (0 creatures generated)'
      : count === 1
        ? `summons ${baseName} ${power}/${toughness}${keywordSuffix}`
        : `summons ${count}${colorPrefix} ${baseName} tokens ${power}/${toughness}${keywordSuffix}`

  return { creatures, description }
}

/**
 * Builds the battlefield object for a card re-entering play from another
 * zone (manual correction, mill/reanimation-style effect, ...) — as opposed
 * to `applyCreateCreature`, which is for the bot *casting* the card. Reuses
 * the given instance id (the card keeps its identity across zones) and
 * always produces exactly one non-token creature: only `CreateCreature`
 * cards have a body to put into play, and moving a real card back to the
 * battlefield is never the "make N tokens" reading of `count`.
 */
export function buildBattlefieldCreatureFromCard(card: DeckCardConfig, instanceId: string): BattlefieldCreature | null {
  if (card.effect.kind !== 'CreateCreature') return null
  const effect = card.effect
  const power = effect.power
  const toughness = effect.toughness
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
    typeLine: card.scryfall?.typeLine,
    colors: card.scryfall?.colors,
  }
}

export interface PumpBoardResult {
  battlefield: BattlefieldCreature[]
  description: string
}

export function applyPumpBotBoard(effect: PumpBotBoardEffect, battlefield: BattlefieldCreature[]): PumpBoardResult {
  const powerBonus = effect.powerBonus
  const toughnessBonus = effect.toughnessBonus
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

export interface CreatePermanentResult {
  permanent: BotPermanent
  description: string
}

/** Resolves a `CreatePermanent` card into a new `BotPermanent` — see that effect in types.ts for why this doesn't touch `battlefield` directly. */
export function applyCreatePermanent(card: DeckCardConfig, effect: CreatePermanentEffect): CreatePermanentResult {
  const permanent: BotPermanent = {
    instanceId: newInstanceId(),
    name: card.scryfallName,
    imageUrl: card.scryfall?.imageUrl,
    permanentType: effect.permanentType,
    powerBonus: effect.powerBonus,
    toughnessBonus: effect.toughnessBonus,
    grantKeywords: effect.grantKeywords,
    sourceDeckCardId: card.id,
    typeLine: card.scryfall?.typeLine,
    colors: card.scryfall?.colors,
  }

  const parts: string[] = []
  if (effect.powerBonus !== 0 || effect.toughnessBonus !== 0) parts.push(`+${effect.powerBonus}/+${effect.toughnessBonus}`)
  if (effect.grantKeywords.length > 0) parts.push(`grants ${effect.grantKeywords.join(', ')}`)
  const buff = parts.length > 0 ? parts.join(' and ') : 'no ongoing effect'
  const description = `a permanent ${effect.permanentType} enters play — the bot's creatures (now and in the future) get ${buff}`

  return { permanent, description }
}

/**
 * Builds the permanent object for a `CreatePermanent` card re-entering play
 * from another zone — the `permanents`-zone counterpart of
 * `buildBattlefieldCreatureFromCard`, used by the same "move any card to any
 * zone" operator action.
 */
export function buildPermanentFromCard(card: DeckCardConfig, instanceId: string): BotPermanent | null {
  if (card.effect.kind !== 'CreatePermanent') return null
  const effect = card.effect
  return {
    instanceId,
    name: card.scryfallName,
    imageUrl: card.scryfall?.imageUrl,
    permanentType: effect.permanentType,
    powerBonus: effect.powerBonus,
    toughnessBonus: effect.toughnessBonus,
    grantKeywords: effect.grantKeywords,
    sourceDeckCardId: card.id,
    typeLine: card.scryfall?.typeLine,
    colors: card.scryfall?.colors,
  }
}

export interface EffectiveStats {
  power: number
  toughness: number
  keywords: Keyword[]
}

/**
 * A creature's displayed stats, derived from its own base stats plus every active permanent's
 * buff — the "real anthem" behavior `CreatePermanent` exists for (see types.ts): the sum is
 * recomputed every time this is called rather than baked into `BattlefieldCreature` once, so a
 * permanent's effect disappears the moment it's destroyed/exiled, and a creature that entered play
 * before the permanent did still benefits from it once it's on board. `creature.power`/`toughness`
 * themselves are never mutated by this — everywhere they're *shown* to the table should call this
 * instead of reading the raw fields.
 */
export function getEffectiveStats(creature: BattlefieldCreature, permanents: BotPermanent[]): EffectiveStats {
  let power = creature.power
  let toughness = creature.toughness
  const keywords = new Set<Keyword>(creature.keywords)
  for (const permanent of permanents) {
    power += permanent.powerBonus
    toughness += permanent.toughnessBonus
    for (const keyword of permanent.grantKeywords) keywords.add(keyword)
  }
  return { power, toughness, keywords: Array.from(keywords) }
}

export function applyGainLifeBot(effect: GainLifeBotEffect) {
  const amount = effect.amount
  return { amount, description: `the bot gains ${amount} life` }
}

export function applyDrawExtraBot(effect: DrawExtraBotEffect) {
  const amount = effect.amount
  return { amount, description: `the bot draws ${amount} extra card${amount === 1 ? '' : 's'}` }
}
