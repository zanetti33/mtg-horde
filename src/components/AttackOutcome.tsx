import { useState } from 'react'
import { useAppState } from '../state/AppContext'
import { groupCreatures } from '../engine/battlefieldGrouping'
import { CardThumbnail } from './CardThumbnail'
import { CardStack } from './CardStack'
import { ColorDots } from './ColorDots'

export function AttackOutcome() {
  const { state, dispatch } = useAppState()
  const attackers = state.game?.pendingAttackers ?? []
  const [eliminated, setEliminated] = useState<Set<string>>(() => new Set())

  if (attackers.length === 0) return null

  /**
   * A click on a stack marks one more of its (identical, interchangeable) attackers as dead —
   * same "click = one casualty" gesture as a lone attacker, just repeatable per stack instead of
   * needing one tile per instance. Once every instance in the stack is marked, clicking again
   * revives the whole stack (undo), mirroring the single-instance toggle exactly when count === 1.
   */
  function markNextOrRevive(instanceIds: string[]) {
    setEliminated((prev) => {
      const next = new Set(prev)
      const nextToMark = instanceIds.find((id) => !next.has(id))
      if (nextToMark) next.add(nextToMark)
      else for (const id of instanceIds) next.delete(id)
      return next
    })
  }

  function confirm() {
    const survivingInstanceIds = attackers.filter((a) => !eliminated.has(a.instanceId)).map((a) => a.instanceId)
    dispatch({ type: 'CONFIRM_ATTACK_OUTCOME', survivingInstanceIds })
  }

  return (
    <div data-testid="attack-outcome" className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-4">
      <h3 className="mb-1 text-sm font-semibold text-amber-300">Combat outcome</h3>
      <p className="mb-3 text-sm text-slate-400">
        After the players have declared blocks physically, click the bot's creatures that died in combat. Click again to undo.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {groupCreatures(attackers).map((group) => {
          const a = group.representative
          const count = group.instanceIds.length
          const deadCount = group.instanceIds.filter((id) => eliminated.has(id)).length
          const anyDead = deadCount > 0
          return (
            <CardStack key={group.key} count={count} testId="attack-outcome-stack">
              <button
                type="button"
                onClick={() => markNextOrRevive(group.instanceIds)}
                className={`group relative w-full overflow-hidden rounded border p-2 text-left transition ${
                  anyDead ? 'border-red-700 bg-red-950/30' : 'border-slate-700 bg-slate-950/60 hover:border-emerald-600'
                }`}
              >
                {a.imageUrl && <CardThumbnail imageUrl={a.imageUrl} alt="" className={`mb-1 w-full rounded transition ${anyDead ? 'opacity-40 grayscale' : ''}`} />}
                <p className={`text-sm font-medium ${anyDead ? 'text-red-300 line-through' : 'text-slate-100'}`}>{a.name}</p>
                <p className="text-xs text-slate-400">
                  {a.power}/{a.toughness}
                </p>
                {!a.imageUrl && (a.typeLine || (a.colors && a.colors.length > 0)) && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <ColorDots colors={a.colors} />
                    {a.typeLine}
                  </p>
                )}

                {anyDead ? (
                  <span className="absolute left-1 top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {count > 1 ? `${deadCount}/${count} DEAD` : 'DEAD'}
                  </span>
                ) : (
                  <span className="absolute left-1 top-1 rounded-full bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                    ✕ eliminate{count > 1 ? ' one' : ''}
                  </span>
                )}
              </button>
            </CardStack>
          )
        })}
      </div>

      <button onClick={confirm} className="mt-4 rounded bg-emerald-500 px-4 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400">
        Confirm outcome
      </button>
    </div>
  )
}
