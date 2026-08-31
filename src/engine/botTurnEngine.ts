import type { BattlefieldCreature, BotState, CardRef, DeckCardConfig, GameStatus, TurnLogEntry } from '../types'
import { collectQueriesForCard, applyCreateCreature, applyPumpBotBoard, applyGainLifeBot, applyDrawExtraBot } from './templates'
import type { QueryPrompt } from './templates'
export type { QueryPrompt } from './templates'
import { describeRemoval, describeDamage, describeSacrifice, describeDiscard } from './instructionText'

export function findDeckCard(deckSnapshot: DeckCardConfig[], deckCardId: string): DeckCardConfig {
  const card = deckSnapshot.find((c) => c.id === deckCardId)
  if (!card) throw new Error(`Deck card ${deckCardId} not found in snapshot`)
  return card
}

/** Draws `count` cards from the top of the library into the hand. Pure — returns a new BotState. */
export function drawForTurn(bot: BotState, count: number): BotState {
  const drawn = bot.library.slice(0, count)
  const remainingLibrary = bot.library.slice(count)
  return {
    ...bot,
    library: remainingLibrary,
    hand: [...bot.hand, ...drawn],
  }
}

/** Collects every query needed to resolve the current hand, so the operator can answer them all up front. */
export function getPendingQueries(hand: CardRef[], deckSnapshot: DeckCardConfig[]): QueryPrompt[] {
  const seen = new Set<string>()
  const prompts: QueryPrompt[] = []
  for (const ref of hand) {
    const card = findDeckCard(deckSnapshot, ref.deckCardId)
    for (const prompt of collectQueriesForCard(card)) {
      if (seen.has(prompt.key)) continue
      seen.add(prompt.key)
      prompts.push(prompt)
    }
  }
  return prompts
}

export function recomputeStatus(bot: BotState): GameStatus {
  if (bot.life <= 0) return 'botDefeated'
  if (bot.library.length === 0) return 'botDefeated'
  return 'ongoing'
}

function isTableInstruction(card: DeckCardConfig): boolean {
  return (
    card.effect.kind === 'RemovalInstruction' ||
    card.effect.kind === 'DamageInstruction' ||
    card.effect.kind === 'SacrificeInstruction' ||
    card.effect.kind === 'DiscardInstruction'
  )
}

/**
 * Orders a hand for card-by-card reveal: `TableInstruction` cards first (so
 * the table "clears" a threat before the bot develops its board), then
 * `BotStateEffect` cards, preserving draw order within each group. This
 * doubles as the turn's resolution queue — see `resolveSingleCard`.
 */
export function orderHandForResolution(hand: CardRef[], deckSnapshot: DeckCardConfig[]): CardRef[] {
  const withCards = hand.map((ref) => ({ ref, card: findDeckCard(deckSnapshot, ref.deckCardId) }))
  const tableInstructions = withCards.filter(({ card }) => isTableInstruction(card))
  const botStateCards = withCards.filter(({ card }) => !isTableInstruction(card))
  return [...tableInstructions, ...botStateCards].map(({ ref }) => ref)
}

/** Clears summoning sickness on creatures already on the battlefield at the start of the bot's turn — they've been under its control since the previous turn began. */
export function clearSummoningSickness(battlefield: BattlefieldCreature[]): BattlefieldCreature[] {
  return battlefield.map((c) => ({ ...c, summoningSick: false }))
}

export interface CardResolutionResult {
  bot: BotState
  logLine: TurnLogEntry
  /** Bonus cards to fold into the next turn's draw, from a resolved `DrawExtraBot` effect. Always 0 for a countered card. */
  extraDraws: number
}

/**
 * Resolves one card revealed from the front of the bot's turn queue,
 * applying its effect to `bot`. Does not touch `bot.hand`/`bot.library` —
 * the caller advances the hand, and once the whole queue is empty, draws
 * the next turn's hand (see `drawNextTurnHand`).
 */
export function resolveSingleCard(bot: BotState, ref: CardRef, card: DeckCardConfig, queryAnswers: Record<string, number>): CardResolutionResult {
  let battlefield = bot.battlefield
  let life = bot.life
  const graveyard = [...bot.graveyard]
  let extraDraws = 0
  let description: string

  const effect = card.effect
  switch (effect.kind) {
    case 'CreateCreature': {
      const result = applyCreateCreature(card, effect, queryAnswers)
      battlefield = [...battlefield, ...result.creatures]
      description = result.description
      break
    }
    case 'PumpBotBoard': {
      const result = applyPumpBotBoard(card, effect, queryAnswers, battlefield)
      battlefield = result.battlefield
      description = result.description
      graveyard.push(ref)
      break
    }
    case 'GainLifeBot': {
      const result = applyGainLifeBot(card, effect, queryAnswers)
      life += result.amount
      description = result.description
      graveyard.push(ref)
      break
    }
    case 'DrawExtraBot': {
      const result = applyDrawExtraBot(card, effect, queryAnswers)
      extraDraws = result.amount
      description = result.description
      graveyard.push(ref)
      break
    }
    case 'RemovalInstruction':
      description = describeRemoval(card, effect, queryAnswers)
      graveyard.push(ref)
      break
    case 'DamageInstruction':
      description = describeDamage(card, effect, queryAnswers)
      graveyard.push(ref)
      break
    case 'SacrificeInstruction':
      description = describeSacrifice(card, effect, queryAnswers)
      graveyard.push(ref)
      break
    case 'DiscardInstruction':
      description = describeDiscard(card, effect, queryAnswers)
      graveyard.push(ref)
      break
  }

  // A card's `errata` (when set) fully replaces the template-derived text:
  // it exists precisely for cases where no single template mode can state
  // the correct table-resolution rule on its own (see types.ts).
  const finalDescription = card.errata ?? description
  return {
    bot: { ...bot, battlefield, life, graveyard },
    logLine: { text: `The bot casts ${card.scryfallName}: ${finalDescription}.`, imageUrl: card.scryfall?.imageUrl },
    extraDraws,
  }
}

/**
 * The table can counter the revealed card instead of letting it resolve: it
 * still leaves the bot's hand for the graveyard (a countered spell was
 * still cast), but none of its effects happen — never enters the
 * battlefield, deals no damage, grants no bonus draws, etc.
 */
export function counterSingleCard(bot: BotState, ref: CardRef, card: DeckCardConfig): CardResolutionResult {
  return {
    bot: { ...bot, graveyard: [...bot.graveyard, ref] },
    logLine: { text: `The bot casts ${card.scryfallName}: countered by the players, no effect.`, imageUrl: card.scryfall?.imageUrl },
    extraDraws: 0,
  }
}

export interface DeclareAttackersResult {
  attackers: BattlefieldCreature[]
  logLine: TurnLogEntry
}

/** Declares attackers once the turn's whole card queue has been resolved: every battlefield creature without summoning sickness. */
export function declareAttackers(battlefield: BattlefieldCreature[]): DeclareAttackersResult {
  const attackers = battlefield.filter((c) => !c.summoningSick)
  const attackPower = attackers.reduce((sum, c) => sum + c.power, 0)
  const logLine: TurnLogEntry =
    attackers.length > 0
      ? {
          text: `The bot attacks with: ${attackers
            .map((c) => `${c.name} (${c.power}/${c.toughness}${c.keywords.length ? `, ${c.keywords.join(', ')}` : ''})`)
            .join(', ')} — total power ${attackPower}.`,
        }
      : { text: 'The bot has no creatures ready to attack this turn.' }
  return { attackers, logLine }
}

export interface DrawNextHandResult {
  hand: CardRef[]
  library: CardRef[]
  logLine: TurnLogEntry | null
}

/**
 * Draws the hand the bot will play next turn — done once the current
 * turn's card queue is fully resolved, not at the start of this one (see
 * "Bot turn flow" in docs/game-design.md for why). A
 * `DrawExtraBot` effect resolved this turn folds into `extraDraws` rather
 * than being drawn and played immediately.
 */
export function drawNextTurnHand(library: CardRef[], drawPerTurn: number, extraDraws: number): DrawNextHandResult {
  const nextDrawCount = drawPerTurn + extraDraws
  const hand = library.slice(0, nextDrawCount)
  const remainingLibrary = library.slice(nextDrawCount)
  const logLine: TurnLogEntry | null =
    hand.length > 0
      ? {
          text: `The bot draws ${hand.length} card${hand.length === 1 ? '' : 's'} for the next turn${
            extraDraws > 0 ? ` (${drawPerTurn} normal + ${extraDraws} extra)` : ''
          }.`,
        }
      : null
  return { hand, library: remainingLibrary, logLine }
}
