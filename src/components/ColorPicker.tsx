import { useState } from 'react'
import { Check, Pipette, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { TASK_COLOR_PRESETS, colorLabel, normalizeHexColor } from '../colors'
import { cssVars } from '../cssVars'

type ColorPickerProps = {
  /** Current custom color (#RRGGBB) or empty/undefined for "Auto". */
  value?: string
  /** Color shown when value is empty (usually the area color). */
  autoColor: string
  onChange: (color: string | undefined) => void
  compact?: boolean
  label?: string
}

/** Feishu-style color picker: preset swatches + system picker + hex input + auto reset. */
export function ColorPicker({ value, autoColor, onChange, compact, label = 'Task color' }: ColorPickerProps) {
  const current = normalizeHexColor(value)
  // While the user is typing we hold a draft; otherwise the field mirrors the current value.
  const [hexDraft, setHexDraft] = useState<string | null>(null)
  const hexText = hexDraft ?? (current ?? '')

  const commitHex = (text: string) => {
    const next = normalizeHexColor(text)
    if (next) onChange(next)
    setHexDraft(null)
  }

  const isCustom = Boolean(current) && !TASK_COLOR_PRESETS.some((preset) => preset.hex === current)

  return (
    <div className={clsx('colorPicker', compact && 'compact')} role="group" aria-label={label}>
      <div className="colorPickerHead">
        <span className="colorPickerLabel">{label}</span>
        <span className="colorPickerValue">
          <i style={{ background: current ?? autoColor }} />
          {current ? colorLabel(current) : 'Auto (by area)'}
        </span>
      </div>
      <div className="colorSwatches">
        <button
          type="button"
          className={clsx('colorSwatch autoSwatch', !current && 'active')}
          style={cssVars({ '--swatch': autoColor })}
          title="Auto: use area color"
          aria-label="Auto color"
          aria-pressed={!current}
          onClick={() => onChange(undefined)}
        >
          {!current ? <Check size={12} /> : <RotateCcw size={11} />}
        </button>
        {TASK_COLOR_PRESETS.map((preset) => {
          const active = current === preset.hex
          return (
            <button
              key={preset.id}
              type="button"
              className={clsx('colorSwatch', active && 'active')}
              style={cssVars({ '--swatch': preset.hex })}
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={active}
              onClick={() => onChange(preset.hex)}
            >
              {active && <Check size={12} />}
            </button>
          )
        })}
        <label
          className={clsx('colorSwatch customSwatch', isCustom && 'active')}
          style={isCustom ? cssVars({ '--swatch': current }) : undefined}
          title="Custom color"
        >
          {isCustom ? <Check size={12} /> : <Pipette size={12} />}
          <input
            type="color"
            aria-label="Pick custom color"
            value={current ?? autoColor.toLowerCase()}
            onChange={(event) => onChange(normalizeHexColor(event.target.value))}
          />
        </label>
      </div>
      {!compact && (
        <div className="colorHexRow">
          <span>#</span>
          <input
            aria-label="Hex color"
            placeholder="3370FF"
            maxLength={7}
            value={hexText.replace(/^#/, '')}
            onChange={(event) => setHexDraft(event.target.value)}
            onBlur={(event) => {
              if (hexDraft !== null) commitHex(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitHex((event.target as HTMLInputElement).value)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}

/** Small round color dot used in lists and tables. */
export function ColorDot({ color, size = 10 }: { color: string; size?: number }) {
  return <i className="colorDot" style={{ background: color, width: size, height: size }} aria-hidden="true" />
}
