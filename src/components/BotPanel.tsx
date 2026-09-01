import { useState } from 'react'
import { useAppState } from '../state/AppContext'
import { summarizeEffect, summarizePermanent } from '../engine/effectSummary'
import { getEffectiveStats } from '../engine/templates'
import { groupCreatures, groupPermanents } from '../engine/battlefieldGrouping'
import { KEYWORD_LABELS } from '../types'
import type { CardDestination, CardRef, DeckCardConfig, Zone } from '../types'
import { CardContextMenu, type ContextMenuOption } from './CardContextMenu'
import { CardThumbnail } from './CardThumbnail'
import { CardStack } from './CardStack'
import { LifeCounter } from './LifeCounter'
import { AddTokenModal, type CustomTokenInput } from './AddTokenModal'
import { ColorDots } from './ColorDots'

const REF_ZONE_LABELS: Record<'hand' | 'graveyard' | 'exile' | 'library', string> = {
  hand: 'Hand',
  graveyard: 'Graveyard',
  exile: 'Exile',
  library: 'Library',
}

interface MenuState {
  zone: Zone
  instanceId: string
  x: number
  y: number
}

const REF_ZONES = ['hand', 'graveyard', 'exile', 'library'] as const

export function BotPanel() {
  const { state, dispatch } = useAppState()
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [showAddToken, setShowAddToken] = useState(false)
  // Every non-board zone starts collapsed — only the board needs to stay in view turn over turn.
  const [expandedZones, setExpandedZones] = useState<Record<(typeof REF_ZONES)[number], boolean>>({
    hand: false,
    graveyard: false,
    exile: false,
    library: false,
  })
  const game = state.game
  if (!game) return null
  const { bot, deckSnapshot } = game

  function move(zone: Zone, instanceId: string, destination: CardDestination) {
    dispatch({ type: 'MOVE_CARD', instanceId, origin: zone, destination })
  }

  function moveToLibraryAtChosenPosition(zone: Zone, instanceId: string) {
    const answer = window.prompt('At what position from the top of the deck? (1 = top)', '1')
    if (answer === null) return
    const n = Math.max(1, Math.round(Number(answer)))
    if (!Number.isFinite(n)) return
    move(zone, instanceId, { zone: 'library', position: { kind: 'nth', n } })
  }

  function resolveCard(deckCardId: string): DeckCardConfig | undefined {
    return deckSnapshot.find((c) => c.id === deckCardId)
  }

  function refsForZone(zone: 'hand' | 'graveyard' | 'exile' | 'library'): CardRef[] {
    switch (zone) {
      case 'hand':
        return bot.hand
      case 'graveyard':
        return bot.graveyard
      case 'exile':
        return bot.exile
      case 'library':
        return bot.library
    }
  }

  /**
   * Every zone a card at `zone` could be sent to, minus the zone it's already in. `toBattlefield`/
   * `toPermanents` gate the two destinations that aren't always legal — only `CreateCreature` cards
   * have a body to put into play, only `CreatePermanent` cards have a permanent to put into play.
   */
  function destinationOptions(zone: Zone, instanceId: string, { toBattlefield = false, toPermanents = false }: { toBattlefield?: boolean; toPermanents?: boolean }): ContextMenuOption[] {
    const options: ContextMenuOption[] = []
    if (zone !== 'battlefield' && toBattlefield) {
      options.push({ label: 'Put into play', onSelect: () => move(zone, instanceId, { zone: 'battlefield' }) })
    }
    if (zone !== 'permanents' && toPermanents) {
      options.push({ label: 'Put into play', onSelect: () => move(zone, instanceId, { zone: 'permanents' }) })
    }
    if (zone !== 'hand') options.push({ label: 'Return to hand', onSelect: () => move(zone, instanceId, { zone: 'hand' }) })
    if (zone !== 'graveyard') options.push({ label: 'Send to graveyard', onSelect: () => move(zone, instanceId, { zone: 'graveyard' }) })
    if (zone !== 'exile') options.push({ label: 'Exile', onSelect: () => move(zone, instanceId, { zone: 'exile' }) })
    if (zone !== 'library') {
      options.push({ label: 'Put on top of deck', onSelect: () => move(zone, instanceId, { zone: 'library', position: { kind: 'top' } }) })
      options.push({ label: 'Put on bottom of deck', onSelect: () => move(zone, instanceId, { zone: 'library', position: { kind: 'bottom' } }) })
      options.push({ label: 'Put N positions from the top…', onSelect: () => moveToLibraryAtChosenPosition(zone, instanceId) })
    }
    return options
  }

  function menuOptionsFor(m: MenuState): ContextMenuOption[] {
    if (m.zone === 'battlefield') {
      const creature = bot.battlefield.find((c) => c.instanceId === m.instanceId)
      if (!creature) return []
      if (creature.isToken) {
        return [{ label: 'Remove (the token ceases to exist)', onSelect: () => move('battlefield', m.instanceId, { zone: 'graveyard' }) }]
      }
      return destinationOptions('battlefield', m.instanceId, {})
    }
    if (m.zone === 'permanents') {
      const permanent = bot.permanents.find((p) => p.instanceId === m.instanceId)
      if (!permanent) return []
      return destinationOptions('permanents', m.instanceId, {})
    }
    const ref = refsForZone(m.zone).find((r) => r.instanceId === m.instanceId)
    if (!ref) return []
    const cardEffectKind = resolveCard(ref.deckCardId)?.effect.kind
    return destinationOptions(m.zone, m.instanceId, { toBattlefield: cardEffectKind === 'CreateCreature', toPermanents: cardEffectKind === 'CreatePermanent' })
  }

  function openMenu(zone: Zone, instanceId: string, e: React.MouseEvent) {
    e.preventDefault()
    setMenu({ zone, instanceId, x: e.clientX, y: e.clientY })
  }

  function addCustomToken(token: CustomTokenInput) {
    dispatch({ type: 'ADD_CUSTOM_TOKEN', ...token })
    setShowAddToken(false)
  }

  return (
    <div className="space-y-6 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <LifeCounter label="Bot life" value={bot.life} onChange={(life) => dispatch({ type: 'SET_BOT_LIFE', life })} />
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-300">Bot board ({bot.battlefield.length})</h3>
          <button
            type="button"
            onClick={() => setShowAddToken(true)}
            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            + Add token
          </button>
        </div>
        {bot.battlefield.length === 0 ? (
          <p className="text-sm text-slate-500">No creatures in play.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {groupCreatures(bot.battlefield).map((group) => {
              const creature = group.representative
              const count = group.instanceIds.length
              const effective = getEffectiveStats(creature, bot.permanents)
              const isBuffed = effective.power !== creature.power || effective.toughness !== creature.toughness || effective.keywords.length !== creature.keywords.length
              return (
                <CardStack key={group.key} count={count} testId="battlefield-stack">
                  <button
                    type="button"
                    onClick={() => move('battlefield', creature.instanceId, { zone: 'graveyard' })}
                    onContextMenu={(e) => openMenu('battlefield', creature.instanceId, e)}
                    className="group relative w-full overflow-hidden rounded border border-slate-800 bg-slate-950/60 p-2 text-left transition hover:border-red-700"
                  >
                    {creature.imageUrl && (
                      <CardThumbnail
                        imageUrl={creature.imageUrl}
                        alt={creature.name}
                        className="mb-1 w-full rounded transition group-hover:opacity-40 group-hover:grayscale"
                      />
                    )}
                    <p className="text-sm font-medium text-slate-100">{creature.name}</p>
                    <p className={`text-xs ${isBuffed ? 'font-semibold text-emerald-300' : 'text-slate-400'}`}>
                      {effective.power}/{effective.toughness}
                      {creature.summoningSick && ' · summoning sickness'}
                    </p>
                    {effective.keywords.length > 0 && <p className="text-xs text-emerald-400">{effective.keywords.map((k) => KEYWORD_LABELS[k]).join(', ')}</p>}
                    {/* Only shown when there's no card image to look at instead (tokens) — a real card's image already prints its type/colors. */}
                    {!creature.imageUrl && (creature.typeLine || (creature.colors && creature.colors.length > 0)) && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <ColorDots colors={creature.colors} />
                        {creature.typeLine}
                      </p>
                    )}

                    <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-red-950/80 px-1 text-center text-red-200 opacity-0 transition group-hover:opacity-100">
                      <span className="text-sm font-bold">✕ Graveyard{count > 1 ? ' (1 of stack)' : ''}</span>
                      <span className="text-[10px] text-red-300">right-click: other options</span>
                    </span>
                  </button>
                </CardStack>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Bot permanents ({bot.permanents.length})</h3>
        {bot.permanents.length === 0 ? (
          <p className="text-sm text-slate-500">No artifacts or enchantments in play.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {groupPermanents(bot.permanents).map((group) => {
              const permanent = group.representative
              const count = group.instanceIds.length
              return (
                <CardStack key={group.key} count={count} testId="permanent-stack">
                  <button
                    type="button"
                    onClick={() => move('permanents', permanent.instanceId, { zone: 'graveyard' })}
                    onContextMenu={(e) => openMenu('permanents', permanent.instanceId, e)}
                    className="group relative w-full overflow-hidden rounded border border-purple-900/60 bg-slate-950/60 p-2 text-left transition hover:border-red-700"
                  >
                    {permanent.imageUrl && (
                      <CardThumbnail
                        imageUrl={permanent.imageUrl}
                        alt={permanent.name}
                        className="mb-1 w-full rounded transition group-hover:opacity-40 group-hover:grayscale"
                      />
                    )}
                    <p className="text-sm font-medium text-slate-100">{permanent.name}</p>
                    <p className="text-xs uppercase tracking-wide text-purple-300">{permanent.permanentType}</p>
                    <p className="text-xs text-emerald-400">{summarizePermanent(permanent)}</p>

                    <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-red-950/80 px-1 text-center text-red-200 opacity-0 transition group-hover:opacity-100">
                      <span className="text-sm font-bold">✕ Graveyard{count > 1 ? ' (1 of stack)' : ''}</span>
                      <span className="text-[10px] text-red-300">right-click: other options</span>
                    </span>
                  </button>
                </CardStack>
              )
            })}
          </div>
        )}
      </div>

      {REF_ZONES.map((zone) => (
        <div key={zone}>
          <button
            type="button"
            onClick={() => setExpandedZones((prev) => ({ ...prev, [zone]: !prev[zone] }))}
            className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-slate-100"
          >
            <span>{expandedZones[zone] ? '▾' : '▸'}</span>
            {REF_ZONE_LABELS[zone]} ({refsForZone(zone).length})
          </button>
          {expandedZones[zone] && (
            <RefZoneSection refs={refsForZone(zone)} deckSnapshot={deckSnapshot} onOpenMenu={(instanceId, e) => openMenu(zone, instanceId, e)} />
          )}
        </div>
      ))}

      {menu && <CardContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} options={menuOptionsFor(menu)} />}
      {showAddToken && <AddTokenModal onSubmit={addCustomToken} onCancel={() => setShowAddToken(false)} />}
    </div>
  )
}

/** Renders one of the CardRef-backed zones (hand/graveyard/exile/library) as a grid of clickable cards, once its collapsible section is expanded. Click (either button) opens the move menu — unlike the battlefield, none of these zones has one dominant action worth a one-click shortcut. */
function RefZoneSection({
  refs,
  deckSnapshot,
  onOpenMenu,
}: {
  refs: CardRef[]
  deckSnapshot: DeckCardConfig[]
  onOpenMenu: (instanceId: string, e: React.MouseEvent) => void
}) {
  return (
    <div>
      {refs.length === 0 ? (
        <p className="text-sm text-slate-500">Empty.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {refs.map((ref) => {
            const card = deckSnapshot.find((c) => c.id === ref.deckCardId)
            return (
              <button
                key={ref.instanceId}
                type="button"
                onClick={(e) => onOpenMenu(ref.instanceId, e)}
                onContextMenu={(e) => onOpenMenu(ref.instanceId, e)}
                className="overflow-hidden rounded border border-slate-800 bg-slate-950/60 p-2 text-left transition hover:border-slate-600"
              >
                {card?.scryfall?.imageUrl && <CardThumbnail imageUrl={card.scryfall.imageUrl} alt={card.scryfallName} className="mb-1 w-full rounded" />}
                <p className="text-sm font-medium text-slate-100">{card?.scryfallName ?? '(unknown card)'}</p>
                {card && <p className="text-xs text-slate-400">{summarizeEffect(card.effect)}</p>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
