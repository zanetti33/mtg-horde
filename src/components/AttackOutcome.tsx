import { useState } from 'react'
import { useAppState } from '../state/AppContext'

export function AttackOutcome() {
  const { state, dispatch } = useAppState()
  const attackers = state.game?.pendingAttackers ?? []
  const [eliminated, setEliminated] = useState<Set<string>>(() => new Set())

  if (attackers.length === 0) return null

  function toggle(id: string) {
    setEliminated((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function confirm() {
    const survivingInstanceIds = attackers.filter((a) => !eliminated.has(a.instanceId)).map((a) => a.instanceId)
    dispatch({ type: 'CONFIRM_ATTACK_OUTCOME', survivingInstanceIds })
  }

  return (
    <div className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-4">
      <h3 className="mb-1 text-sm font-semibold text-amber-300">Esito del combattimento</h3>
      <p className="mb-3 text-sm text-slate-400">
        Dopo che i giocatori hanno dichiarato i blocchi fisicamente, clicca le creature del bot morte in combattimento. Clicca di nuovo per annullare.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {attackers.map((a) => {
          const isDead = eliminated.has(a.instanceId)
          return (
            <button
              key={a.instanceId}
              type="button"
              onClick={() => toggle(a.instanceId)}
              className={`group relative overflow-hidden rounded border p-2 text-left transition ${
                isDead ? 'border-red-700 bg-red-950/30' : 'border-slate-700 bg-slate-950/60 hover:border-emerald-600'
              }`}
            >
              {a.imageUrl && <img src={a.imageUrl} alt="" className={`mb-1 w-full rounded transition ${isDead ? 'opacity-40 grayscale' : ''}`} />}
              <p className={`text-sm font-medium ${isDead ? 'text-red-300 line-through' : 'text-slate-100'}`}>{a.name}</p>
              <p className="text-xs text-slate-400">
                {a.power}/{a.toughness}
              </p>

              {isDead ? (
                <span className="absolute right-1 top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">MORTA</span>
              ) : (
                <span className="absolute right-1 top-1 rounded-full bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                  ✕ elimina
                </span>
              )}
            </button>
          )
        })}
      </div>

      <button onClick={confirm} className="mt-4 rounded bg-emerald-500 px-4 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400">
        Conferma esito
      </button>
    </div>
  )
}
