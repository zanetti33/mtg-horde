import { useState } from 'react'
import { useAppState } from '../state/AppContext'
import { KEYWORD_LABELS, type BattlefieldDestination } from '../types'
import { CardContextMenu } from './CardContextMenu'

export function BotPanel() {
  const { state, dispatch } = useAppState()
  const [menu, setMenu] = useState<{ instanceId: string; x: number; y: number } | null>(null)
  const game = state.game
  if (!game) return null
  const { bot } = game

  function move(instanceId: string, destination: BattlefieldDestination) {
    dispatch({ type: 'MOVE_BATTLEFIELD_CREATURE', instanceId, destination })
  }

  function moveToLibraryAtChosenPosition(instanceId: string) {
    const answer = window.prompt('A quale posizione dalla cima del mazzo? (1 = cima)', '1')
    if (answer === null) return
    const n = Math.max(1, Math.round(Number(answer)))
    if (!Number.isFinite(n)) return
    move(instanceId, { zone: 'library', position: { kind: 'nth', n } })
  }

  const menuCreature = menu ? bot.battlefield.find((c) => c.instanceId === menu.instanceId) : null

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">Vita bot</span>
          <input
            type="number"
            value={bot.life}
            onChange={(e) => dispatch({ type: 'SET_BOT_LIFE', life: Number(e.target.value) })}
            className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-lg font-semibold text-slate-100"
          />
        </label>
        <span className="text-sm text-slate-400">Libreria: {bot.library.length}</span>
        <span className="text-sm text-slate-400">Mano: {bot.hand.length}</span>
        <span className="text-sm text-slate-400">Cimitero: {bot.graveyard.length}</span>
        <span className="text-sm text-slate-400">Esilio: {bot.exile.length}</span>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-slate-300">Board del bot ({bot.battlefield.length})</h3>
      <p className="mb-2 text-xs text-slate-500">Click su una creatura morta = va al cimitero. Click destro per altre destinazioni (mano, mazzo, esilio).</p>
      {bot.battlefield.length === 0 ? (
        <p className="text-sm text-slate-500">Nessuna creatura in gioco.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {bot.battlefield.map((creature) => (
            <button
              key={creature.instanceId}
              type="button"
              onClick={() => move(creature.instanceId, { zone: 'graveyard' })}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({ instanceId: creature.instanceId, x: e.clientX, y: e.clientY })
              }}
              className="group relative overflow-hidden rounded border border-slate-800 bg-slate-950/60 p-2 text-left transition hover:border-red-700"
            >
              {creature.imageUrl && (
                <img src={creature.imageUrl} alt={creature.name} className="mb-1 w-full rounded transition group-hover:opacity-40 group-hover:grayscale" />
              )}
              <p className="text-sm font-medium text-slate-100">{creature.name}</p>
              <p className="text-xs text-slate-400">
                {creature.power}/{creature.toughness}
                {creature.summoningSick && ' · malattia da evocazione'}
              </p>
              {creature.keywords.length > 0 && <p className="text-xs text-emerald-400">{creature.keywords.map((k) => KEYWORD_LABELS[k]).join(', ')}</p>}

              <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-red-950/80 px-1 text-center text-red-200 opacity-0 transition group-hover:opacity-100">
                <span className="text-sm font-bold">✕ Cimitero</span>
                <span className="text-[10px] text-red-300">click destro: altre opzioni</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {menu && menuCreature && (
        <CardContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          options={
            menuCreature.isToken
              ? [{ label: 'Rimuovi (il token cessa di esistere)', onSelect: () => move(menuCreature.instanceId, { zone: 'graveyard' }) }]
              : [
                  { label: 'Manda al cimitero (morta)', onSelect: () => move(menuCreature.instanceId, { zone: 'graveyard' }) },
                  { label: 'Rimetti in mano', onSelect: () => move(menuCreature.instanceId, { zone: 'hand' }) },
                  { label: 'Metti in cima al mazzo', onSelect: () => move(menuCreature.instanceId, { zone: 'library', position: { kind: 'top' } }) },
                  { label: 'Metti in fondo al mazzo', onSelect: () => move(menuCreature.instanceId, { zone: 'library', position: { kind: 'bottom' } }) },
                  { label: 'Metti a N posizioni dalla cima…', onSelect: () => moveToLibraryAtChosenPosition(menuCreature.instanceId) },
                  { label: 'Esilia', onSelect: () => move(menuCreature.instanceId, { zone: 'exile' }) },
                ]
          }
        />
      )}
    </div>
  )
}
