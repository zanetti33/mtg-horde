import type { BattlefieldCreature, BotState, CardRef, DeckCardConfig, GameStatus, TurnLogEntry } from '../types'
import { collectQueriesForCard, applyCreateCreature, applyPumpBotBoard, applyGainLifeBot, applyDrawExtraBot } from './templates'
import type { QueryPrompt } from './templates'
export type { QueryPrompt } from './templates'
import { describeRemoval, describeDamage, describeSacrifice, describeDiscard } from './instructionText'

function findDeckCard(deckSnapshot: DeckCardConfig[], deckCardId: string): DeckCardConfig {
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

export interface ResolvedTurn {
  bot: BotState
  logLines: TurnLogEntry[]
  attackers: BattlefieldCreature[]
  status: GameStatus
}

/**
 * Resolves an entire bot turn: every card currently in hand (already including
 * this turn's draw) is played, table-facing instructions first, then bot-state
 * effects, then attackers are declared. No mana, no partial hands — see plan.
 */
export function resolveBotTurn(bot: BotState, deckSnapshot: DeckCardConfig[], queryAnswers: Record<string, number>): ResolvedTurn {
  const logLines: TurnLogEntry[] = []

  // Creatures already on the battlefield have been under the bot's control
  // since its last turn began, so summoning sickness clears for them.
  let battlefield = bot.battlefield.map((c) => ({ ...c, summoningSick: false }))
  let life = bot.life
  const graveyard = [...bot.graveyard]

  const handCards = bot.hand.map((ref) => ({ ref, card: findDeckCard(deckSnapshot, ref.deckCardId) }))
  const tableInstructionCards = handCards.filter(({ card }) => isTableInstruction(card))
  const botStateCards = handCards.filter(({ card }) => !isTableInstruction(card))
  const orderedHand = [...tableInstructionCards, ...botStateCards]

  let extraDraws = 0

  for (const { ref, card } of orderedHand) {
    const effect = card.effect
    let description: string

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
        extraDraws += result.amount
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
    logLines.push({ text: `Il bot lancia ${card.scryfallName}: ${finalDescription}.`, imageUrl: card.scryfall?.imageUrl })
  }

  // Cards drawn by a DrawExtraBot effect are not resolved this same turn —
  // recursively resolving them could require queries we never collected
  // up front. They simply carry over into next turn's hand.
  let library = bot.library
  let carriedHand: CardRef[] = []
  if (extraDraws > 0) {
    carriedHand = library.slice(0, extraDraws)
    library = library.slice(extraDraws)
    logLines.push({ text: `Il bot pesca ${carriedHand.length} cart${carriedHand.length === 1 ? 'a' : 'e'} extra.` })
  }

  const attackers = battlefield.filter((c) => !c.summoningSick)
  const attackPower = attackers.reduce((sum, c) => sum + c.power, 0)
  if (attackers.length > 0) {
    const names = attackers.map((c) => `${c.name} (${c.power}/${c.toughness}${c.keywords.length ? `, ${c.keywords.join(', ')}` : ''})`)
    logLines.push({ text: `Il bot attacca con: ${names.join(', ')} — potenza totale ${attackPower}.` })
  } else {
    logLines.push({ text: 'Il bot non ha creature pronte per attaccare questo turno.' })
  }

  const newBot: BotState = {
    life,
    library,
    hand: carriedHand,
    battlefield,
    graveyard,
    exile: bot.exile,
  }

  return {
    bot: newBot,
    logLines,
    attackers,
    status: recomputeStatus(newBot),
  }
}

function isTableInstruction(card: DeckCardConfig): boolean {
  return (
    card.effect.kind === 'RemovalInstruction' ||
    card.effect.kind === 'DamageInstruction' ||
    card.effect.kind === 'SacrificeInstruction' ||
    card.effect.kind === 'DiscardInstruction'
  )
}
