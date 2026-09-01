import type { DamageTarget, EffectParams, EffectTemplateId, PermanentType, RemovalMode } from '../types'
import { defaultEffectFor, TEMPLATE_LABELS } from '../engine/effectDefaults'
import { NumberField } from './NumberField'
import { KeywordPicker } from './KeywordPicker'
import { ColorPicker } from './ColorPicker'

const TEMPLATE_IDS: EffectTemplateId[] = [
  'CreateCreature',
  'PumpBotBoard',
  'CreatePermanent',
  'GainLifeBot',
  'DrawExtraBot',
  'RemovalInstruction',
  'DamageInstruction',
  'SacrificeInstruction',
  'DiscardInstruction',
]

const PERMANENT_TYPES: PermanentType[] = ['artifact', 'enchantment']
const PERMANENT_TYPE_LABEL: Record<PermanentType, string> = {
  artifact: 'Artifact',
  enchantment: 'Enchantment',
}

const REMOVAL_MODES: RemovalMode[] = ['highestPower', 'highestToughness', 'highestManaValue', 'random', 'all']
const REMOVAL_MODE_LABEL: Record<RemovalMode, string> = {
  highestPower: 'Highest power',
  highestToughness: 'Highest toughness',
  highestManaValue: 'Highest mana value',
  random: 'Random',
  all: 'All',
}

const DAMAGE_TARGETS: DamageTarget[] = ['eachPlayer', 'creatureHighestPower', 'creatureHighestToughness', 'creatureRandom', 'allCreatures']
const DAMAGE_TARGET_LABEL: Record<DamageTarget, string> = {
  eachPlayer: 'Each player (life)',
  creatureHighestPower: 'Creature with highest power',
  creatureHighestToughness: 'Creature with highest toughness',
  creatureRandom: 'Random creature',
  allCreatures: 'All creatures',
}

export function EffectForm({ effect, onChange }: { effect: EffectParams; onChange: (e: EffectParams) => void }) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-300">Effect type</span>
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
            <NumberField label="Count" value={effect.count} onChange={(count) => onChange({ ...effect, count })} />
            <NumberField label="Power" value={effect.power} onChange={(power) => onChange({ ...effect, power })} />
            <NumberField label="Toughness" value={effect.toughness} onChange={(toughness) => onChange({ ...effect, toughness })} />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-300">Keywords</span>
            <KeywordPicker selected={effect.keywords} onChange={(keywords) => onChange({ ...effect, keywords })} />
          </div>
          <div className="rounded border border-slate-800 p-2">
            <p className="mb-2 text-xs text-slate-500">Only used when Count resolves to more than 1 (i.e. the card makes tokens, not its own body).</p>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-300">Token name</span>
              <input
                type="text"
                value={effect.tokenName ?? ''}
                onChange={(e) => onChange({ ...effect, tokenName: e.target.value || undefined })}
                placeholder="Defaults to the card's own name"
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
            <label className="mt-2 block">
              <span className="mb-1 block text-xs font-medium text-slate-300">Token type line</span>
              <input
                type="text"
                value={effect.tokenTypeLine ?? ''}
                onChange={(e) => onChange({ ...effect, tokenTypeLine: e.target.value || undefined })}
                placeholder="e.g. Zombie, Dinosaur Soldier"
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
            <div className="mt-2">
              <span className="mb-1 block text-xs font-medium text-slate-300">Token colors</span>
              <ColorPicker selected={effect.tokenColors ?? []} onChange={(tokenColors) => onChange({ ...effect, tokenColors })} />
            </div>
          </div>
        </>
      )}

      {effect.kind === 'PumpBotBoard' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Power bonus" value={effect.powerBonus} onChange={(powerBonus) => onChange({ ...effect, powerBonus })} />
            <NumberField label="Toughness bonus" value={effect.toughnessBonus} onChange={(toughnessBonus) => onChange({ ...effect, toughnessBonus })} />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-300">Keywords granted</span>
            <KeywordPicker selected={effect.grantKeywords} onChange={(grantKeywords) => onChange({ ...effect, grantKeywords })} />
          </div>
        </>
      )}

      {effect.kind === 'CreatePermanent' && (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">Permanent type</span>
            <select
              value={effect.permanentType}
              onChange={(e) => onChange({ ...effect, permanentType: e.target.value as PermanentType })}
              className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            >
              {PERMANENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PERMANENT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Power bonus" value={effect.powerBonus} onChange={(powerBonus) => onChange({ ...effect, powerBonus })} />
            <NumberField label="Toughness bonus" value={effect.toughnessBonus} onChange={(toughnessBonus) => onChange({ ...effect, toughnessBonus })} />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-300">Keywords granted</span>
            <KeywordPicker selected={effect.grantKeywords} onChange={(grantKeywords) => onChange({ ...effect, grantKeywords })} />
          </div>
          <p className="text-xs text-slate-500">
            Unlike "Buff the bot board", this stays in play as its own permanent: it also buffs creatures that enter play later, and can be
            destroyed/exiled like any other card (see the "Bot permanents" section in-game).
          </p>
        </>
      )}

      {(effect.kind === 'GainLifeBot' || effect.kind === 'DrawExtraBot') && (
        <NumberField label="Amount" value={effect.amount} onChange={(amount) => onChange({ ...effect, amount })} />
      )}

      {effect.kind === 'RemovalInstruction' && (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">Target</span>
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
          {effect.mode !== 'all' && <NumberField label="How many creatures" value={effect.count} onChange={(count) => onChange({ ...effect, count })} />}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">Destroy or exile</span>
            <select
              value={effect.destroyOrExile}
              onChange={(e) => onChange({ ...effect, destroyOrExile: e.target.value as 'destroy' | 'exile' })}
              className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            >
              <option value="destroy">Destroy</option>
              <option value="exile">Exile</option>
            </select>
          </label>
        </>
      )}

      {effect.kind === 'DamageInstruction' && (
        <>
          <NumberField label="Damage amount" value={effect.amount} onChange={(amount) => onChange({ ...effect, amount })} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">Target</span>
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
          <NumberField label="Count" value={effect.count} onChange={(count) => onChange({ ...effect, count })} />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={effect.perPlayer} onChange={(e) => onChange({ ...effect, perPlayer: e.target.checked })} />
            Per player (otherwise: total among all)
          </label>
        </>
      )}
    </div>
  )
}
