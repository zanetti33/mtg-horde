import type { DamageTarget, EffectParams, EffectTemplateId, RemovalMode } from '../types'
import { defaultEffectFor, TEMPLATE_LABELS } from '../engine/effectDefaults'
import { NumericValueEditor } from './NumericValueEditor'
import { KeywordPicker } from './KeywordPicker'

const TEMPLATE_IDS: EffectTemplateId[] = [
  'CreateCreature',
  'PumpBotBoard',
  'GainLifeBot',
  'DrawExtraBot',
  'RemovalInstruction',
  'DamageInstruction',
  'SacrificeInstruction',
  'DiscardInstruction',
]

const REMOVAL_MODES: RemovalMode[] = ['highestPower', 'highestToughness', 'highestManaValue', 'random', 'all']
const REMOVAL_MODE_LABEL: Record<RemovalMode, string> = {
  highestPower: 'Potere più alto',
  highestToughness: 'Costituzione più alta',
  highestManaValue: 'Mana value più alto',
  random: 'A caso',
  all: 'Tutte',
}

const DAMAGE_TARGETS: DamageTarget[] = ['eachPlayer', 'creatureHighestPower', 'creatureHighestToughness', 'creatureRandom', 'allCreatures']
const DAMAGE_TARGET_LABEL: Record<DamageTarget, string> = {
  eachPlayer: 'Ogni giocatore (vita)',
  creatureHighestPower: 'Creatura con potere più alto',
  creatureHighestToughness: 'Creatura con costituzione più alta',
  creatureRandom: 'Creatura a caso',
  allCreatures: 'Tutte le creature',
}

export function EffectForm({ effect, onChange }: { effect: EffectParams; onChange: (e: EffectParams) => void }) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-300">Tipo di effetto</span>
        <select
          value={effect.kind}
          onChange={(e) => onChange(defaultEffectFor(e.target.value as EffectTemplateId))}
          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
        >
          {TEMPLATE_IDS.map((id) => (
            <option key={id} value={id}>
              {TEMPLATE_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      {effect.kind === 'CreateCreature' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <NumericValueEditor label="Quantità" value={effect.count} onChange={(count) => onChange({ ...effect, count })} />
            <NumericValueEditor label="Potere" value={effect.power} onChange={(power) => onChange({ ...effect, power })} />
            <NumericValueEditor label="Costituzione" value={effect.toughness} onChange={(toughness) => onChange({ ...effect, toughness })} />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-300">Keyword</span>
            <KeywordPicker selected={effect.keywords} onChange={(keywords) => onChange({ ...effect, keywords })} />
          </div>
        </>
      )}

      {effect.kind === 'PumpBotBoard' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumericValueEditor label="Bonus potere" value={effect.powerBonus} onChange={(powerBonus) => onChange({ ...effect, powerBonus })} />
            <NumericValueEditor label="Bonus costituzione" value={effect.toughnessBonus} onChange={(toughnessBonus) => onChange({ ...effect, toughnessBonus })} />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-300">Keyword concesse</span>
            <KeywordPicker selected={effect.grantKeywords} onChange={(grantKeywords) => onChange({ ...effect, grantKeywords })} />
          </div>
        </>
      )}

      {(effect.kind === 'GainLifeBot' || effect.kind === 'DrawExtraBot') && (
        <NumericValueEditor label="Quantità" value={effect.amount} onChange={(amount) => onChange({ ...effect, amount })} />
      )}

      {effect.kind === 'RemovalInstruction' && (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">Bersaglio</span>
            <select
              value={effect.mode}
              onChange={(e) => onChange({ ...effect, mode: e.target.value as RemovalMode })}
              className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            >
              {REMOVAL_MODES.map((m) => (
                <option key={m} value={m}>
                  {REMOVAL_MODE_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
          {effect.mode !== 'all' && <NumericValueEditor label="Quante creature" value={effect.count} onChange={(count) => onChange({ ...effect, count })} />}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">Distruggi o esilia</span>
            <select
              value={effect.destroyOrExile}
              onChange={(e) => onChange({ ...effect, destroyOrExile: e.target.value as 'destroy' | 'exile' })}
              className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            >
              <option value="destroy">Distruggi</option>
              <option value="exile">Esilia</option>
            </select>
          </label>
        </>
      )}

      {effect.kind === 'DamageInstruction' && (
        <>
          <NumericValueEditor label="Ammontare danno" value={effect.amount} onChange={(amount) => onChange({ ...effect, amount })} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">Bersaglio</span>
            <select
              value={effect.target}
              onChange={(e) => onChange({ ...effect, target: e.target.value as DamageTarget })}
              className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            >
              {DAMAGE_TARGETS.map((t) => (
                <option key={t} value={t}>
                  {DAMAGE_TARGET_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {(effect.kind === 'SacrificeInstruction' || effect.kind === 'DiscardInstruction') && (
        <>
          <NumericValueEditor label="Quantità" value={effect.count} onChange={(count) => onChange({ ...effect, count })} />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={effect.perPlayer} onChange={(e) => onChange({ ...effect, perPlayer: e.target.checked })} />
            Per ogni giocatore (altrimenti: totale tra tutti)
          </label>
        </>
      )}
    </div>
  )
}
