import { useState } from 'react'
import { useAppState } from '../state/AppContext'
import { summarizeEffect } from '../engine/effectSummary'
import { KEYWORD_LABELS } from '../types'
import type { CardDestination, CardRef, DeckCardConfig, Zone } from '../types'
import { CardContextMenu, type ContextMenuOption } from './CardContextMenu'
import { CardThumbnail } from './CardThumbnail'
import { LifeCounter } from './LifeCounter'

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

  /** Every zone a card at `zone` could be sent to, minus the zone it's already in. `canGoToBattlefield` gates the one destination that isn't always legal (only `CreateCreature` cards have a body to put into play). */
  function destinationOptions(zone: Zone, instanceId: string, canGoToBattlefield: boolean): ContextMenuOption[] {
    const options: ContextMenuOption[] = []
    if (zone !== 'battlefield' && canGoToBattlefield) {
      options.push({ label: 'Put into play', onSelect: () => move(zone, instanceId, { zone: 'battlefield' }) })
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
      return destinationOptions('battlefield', m.instanceId, false)
    }
    const ref = refsForZone(m.zone).find((r) => r.instanceId === m.instanceId)
    if (!ref) return []
    const canGoToBattlefield = resolveCard(ref.deckCardId)?.effect.kind === 'CreateCreature'
    return destinationOptions(m.zone, m.instanceId, canGoToBattlefield)
  }

  function openMenu(zone: Zone, instanceId: string, e: React.MouseEvent) {
    e.preventDefault()
    setMenu({ zone, instanceId, x: e.clientX, y: e.clientY })
  }

  return (
    <div className="space-y-6 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <LifeCounter label="Bot life" value={bot.life} onChange={(life) => dispatch({ type: 'SET_BOT_LIFE', life })} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Bot board ({bot.battlefield.length})</h3>
        <p className="mb-2 text-xs text-slate-500">Click a dead creature = it goes to the graveyard. Right-click for other destinations.</p>
        {bot.battlefield.length === 0 ? (
          <p className="text-sm text-slate-500">No creatures in play.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {bot.battlefield.map((creature) => (
              <button
                key={creature.instanceId}
                type="button"
                onClick={() => move('battlefield', creature.instanceId, { zone: 'graveyard' })}
                onContextMenu={(e) => openMenu('battlefield', creature.instanceId, e)}
                className="group relative overflow-hidden rounded border border-slate-800 bg-slate-950/60 p-2 text-left transition hover:border-red-700"
              >
                {creature.imageUrl && (
                  <CardThumbnail
                    imageUrl={creature.imageUrl}
                    alt={creature.name}
                    className="mb-1 w-full rounded transition group-hover:opacity-40 group-hover:grayscale"
                  />
                )}
                <p className="text-sm font-medium text-slate-100">{creature.name}</p>
                <p className="text-xs text-slate-400">
                  {creature.power}/{creature.toughness}
                  {creature.summoningSick && ' · summoning sickness'}
                </p>
                {creature.keywords.length > 0 && <p className="text-xs text-emerald-400">{creature.keywords.map((k) => KEYWORD_LABELS[k]).join(', ')}</p>}

                <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-red-950/80 px-1 text-center text-red-200 opacity-0 transition group-hover:opacity-100">
                  <span className="text-sm font-bold">✕ Graveyard</span>
                  <span className="text-[10px] text-red-300">right-click: other options</span>
                </span>
              </button>
            ))}
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
