// Task color system (Feishu / Lark-style palette).
// Pure module: no React / DOM imports so it can be tested with plain Node.

export type TaskColorPreset = {
  id: string
  label: string
  hex: string
  aliases: string[]
}

/** Preset swatches modelled on the Feishu suite palette. Order = picker order. */
export const TASK_COLOR_PRESETS: TaskColorPreset[] = [
  { id: 'blue', label: 'Blue', hex: '#3370FF', aliases: ['blue', '蓝', '蓝色'] },
  { id: 'wathet', label: 'Sky', hex: '#14C0FF', aliases: ['wathet', 'sky', 'light blue', 'cyan', '天蓝', '浅蓝'] },
  { id: 'turquoise', label: 'Turquoise', hex: '#2EC4B6', aliases: ['turquoise', 'teal', '青', '青色', '绿松石'] },
  { id: 'green', label: 'Green', hex: '#34C724', aliases: ['green', '绿', '绿色'] },
  { id: 'lime', label: 'Lime', hex: '#B3D600', aliases: ['lime', '黄绿', '青柠'] },
  { id: 'yellow', label: 'Yellow', hex: '#FFC60A', aliases: ['yellow', '黄', '黄色'] },
  { id: 'orange', label: 'Orange', hex: '#FF8800', aliases: ['orange', '橙', '橙色'] },
  { id: 'red', label: 'Red', hex: '#F54A45', aliases: ['red', '红', '红色'] },
  { id: 'carmine', label: 'Pink', hex: '#F01D94', aliases: ['carmine', 'pink', 'magenta', '粉', '粉色', '洋红'] },
  { id: 'violet', label: 'Violet', hex: '#D136D1', aliases: ['violet', '紫红'] },
  { id: 'purple', label: 'Purple', hex: '#7F3BF5', aliases: ['purple', '紫', '紫色'] },
  { id: 'indigo', label: 'Indigo', hex: '#4954E6', aliases: ['indigo', '靛', '靛蓝'] },
  { id: 'grey', label: 'Grey', hex: '#8F959E', aliases: ['grey', 'gray', '灰', '灰色'] },
]

/** Stable default color per area so uncolored tasks are still distinguishable. */
export const AREA_COLOR_IDS: Record<string, string> = {
  Schedule: 'orange',
  Project: 'blue',
  Learning: 'green',
  'Computer Science Basics': 'indigo',
  Python: 'wathet',
  'C++': 'purple',
  'SQL/Database': 'turquoise',
  Algorithms: 'red',
  'Machine Learning': 'violet',
  NLP: 'carmine',
  'Project Practice': 'lime',
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_RE.test(value.trim())

/** "#abc" | "abc" | "#AABBCC" → "#AABBCC"; anything else → undefined. */
export const normalizeHexColor = (value: unknown): string | undefined => {
  if (!isHexColor(value)) return undefined
  let hex = value.trim().replace(/^#/, '')
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  return `#${hex.toUpperCase()}`
}

const presetById = new Map(TASK_COLOR_PRESETS.map((preset) => [preset.id, preset]))

/** Accept hex, preset id or a localized color name (used by imports). */
export const parseColorValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined
  const text = String(value).trim()
  if (!text) return undefined
  const hex = normalizeHexColor(text)
  if (hex) return hex
  const key = text.toLowerCase()
  const preset = TASK_COLOR_PRESETS.find((item) => item.id === key || item.aliases.includes(key))
  return preset?.hex
}

const hashString = (text: string) => {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  return hash
}

export const areaColor = (area: string): string => {
  const id = AREA_COLOR_IDS[area]
  if (id) return presetById.get(id)!.hex
  const palette = TASK_COLOR_PRESETS.slice(0, -1) // never fall back to grey
  return palette[hashString(area || 'Project') % palette.length].hex
}

/** Custom color wins; otherwise the area's stable color. */
export const resolveTaskColor = (task: { color?: string; area: string }): string =>
  normalizeHexColor(task.color) ?? areaColor(task.area)

export const presetForHex = (hex: string | undefined) => {
  const normalized = normalizeHexColor(hex)
  return normalized ? TASK_COLOR_PRESETS.find((preset) => preset.hex === normalized) : undefined
}

export const colorLabel = (hex: string | undefined) => presetForHex(hex)?.label ?? normalizeHexColor(hex) ?? 'Auto'

const toRgb = (hex: string) => {
  const normalized = normalizeHexColor(hex) ?? '#3370FF'
  const int = Number.parseInt(normalized.slice(1), 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

/** Translucent tint for backgrounds, e.g. withAlpha('#3370FF', 0.1). */
export const withAlpha = (hex: string, alpha: number) => {
  const { r, g, b } = toRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`
}

/** Pick black/white text for a solid fill using relative luminance. */
export const readableTextColor = (hex: string) => {
  const { r, g, b } = toRgb(hex)
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  return luminance > 0.45 ? '#1F2329' : '#FFFFFF'
}
