// Mapping + value normalization: RawTable rows -> Task objects, following an ImportSpec.
// Pure module (no React/DOM) so it can be tested in Node.
import type { ChecklistItem, Priority, Status, Task } from '../types.ts'
import type { RawCell, RawRow, RawTable } from './parsers.ts'
import { normalizeKey, type ImportFieldKey, type ImportSpec } from './spec.ts'
import { parseColorValue } from '../colors.ts'

export type ColumnMapping = Record<string, ImportFieldKey | null>

export type RowIssue = {
  row: number // 1-based data row number (header excluded)
  field?: ImportFieldKey
  level: 'error' | 'warning'
  message: string
}

export type ImportPreview = {
  tasks: Task[]
  /** index in tasks -> source row number */
  sourceRows: number[]
  issues: RowIssue[]
  skipped: number
  duplicates: number
}

export const DEFAULT_KNOWN_AREAS = [
  'Schedule', 'Project', 'Learning', 'Computer Science Basics', 'Python', 'C++',
  'SQL/Database', 'Algorithms', 'Machine Learning', 'NLP', 'Project Practice',
]

/* ---------------- column mapping ---------------- */

/** Auto-map headers to spec fields by alias. Each field is used at most once (first match wins). */
export const autoMapColumns = (headers: string[], spec: ImportSpec): ColumnMapping => {
  const mapping: ColumnMapping = {}
  const used = new Set<ImportFieldKey>()
  const lookup = new Map<string, ImportFieldKey>()
  // exact field keys first, then aliases in spec order
  for (const field of spec.fields) lookup.set(normalizeKey(field.key), field.key)
  for (const field of spec.fields) {
    for (const alias of [field.label, ...field.aliases]) {
      const key = normalizeKey(alias)
      if (key && !lookup.has(key)) lookup.set(key, field.key)
    }
  }
  for (const header of headers) {
    const target = lookup.get(normalizeKey(header))
    if (target && !used.has(target)) {
      mapping[header] = target
      used.add(target)
    } else mapping[header] = null
  }
  return mapping
}

export const missingRequired = (mapping: ColumnMapping, spec: ImportSpec) => {
  const mapped = new Set(Object.values(mapping).filter(Boolean))
  return spec.fields.filter((field) => field.required && !mapped.has(field.key))
}

/* ---------------- value parsers ---------------- */

const pad = (value: number) => String(value).padStart(2, '0')
const ymd = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const isValidYmd = (y: number, m: number, d: number) => {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false
  return d <= new Date(y, m, 0).getDate()
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}

export type ParsedDate = { date: string; time?: string }

/** Parse a time fragment: 09:00, 9:00:00, 9am, 3:30 pm, 下午3点, 15点30分. */
export const parseTime = (input: string): string | undefined => {
  const text = input.trim().toLowerCase()
  if (!text) return undefined
  let m = text.match(/(上午|下午|晚上|中午|早上)?\s*(\d{1,2})\s*(?:[:：时点])\s*(\d{1,2})?\s*(?:分)?(?::\d{1,2})?\s*(am|pm)?/)
  if (!m) m = text.match(/(上午|下午|晚上|中午|早上)?\s*(\d{1,2})()\s*(am|pm)/)
  if (!m) return undefined
  let hour = Number(m[2])
  const minute = Number(m[3] || 0)
  const marker = m[4] || m[1]
  if ((marker === 'pm' || marker === '下午' || marker === '晚上') && hour < 12) hour += 12
  if (marker === 'am' && hour === 12) hour = 0
  if (marker === '中午' && hour < 11) hour += 12
  if (hour > 23 || minute > 59) return undefined
  return `${pad(hour)}:${pad(minute)}`
}

const fromExcelSerial = (serial: number): ParsedDate | null => {
  if (!Number.isFinite(serial) || serial < 1 || serial > 120000) return null
  // Excel epoch 1899-12-30 (accounts for the 1900 leap-year bug for serials > 60)
  const ms = Math.round((serial - 25569) * 86400 * 1000)
  const date = new Date(ms)
  const result: ParsedDate = { date: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` }
  const fraction = serial - Math.floor(serial)
  if (fraction > 1e-6) {
    const minutes = Math.round(fraction * 1440)
    result.time = `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`
  }
  return result
}

/**
 * Parse many real-world date shapes into yyyy-MM-dd (+ optional HH:mm).
 * Order matters: unambiguous formats first; d/M vs M/d resolved by spec.dayFirst unless one part > 12.
 */
export const parseDateValue = (value: RawCell, dayFirst: boolean, today = new Date()): ParsedDate | null => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  if (typeof value === 'number') {
    // plain numbers: Excel serial (≈ 1955–2119) or yyyymmdd
    if (value >= 19000101 && value <= 22001231) return parseDateValue(String(value), dayFirst, today)
    return value > 20000 && value < 80000 ? fromExcelSerial(value) : null
  }
  const raw = String(value).normalize('NFKC').trim()
  if (!raw) return null
  if (raw.startsWith('@xlsdate:')) return fromExcelSerial(Number(raw.slice(9)))
  const lower = raw.toLowerCase()

  const relative: Record<string, number> = { today: 0, 今天: 0, 今日: 0, tomorrow: 1, 明天: 1, 明日: 1, yesterday: -1, 昨天: -1, 后天: 2, 'day after tomorrow': 2 }
  for (const [word, offset] of Object.entries(relative)) {
    if (lower === word || lower.startsWith(`${word} `)) {
      const date = new Date(today)
      date.setDate(date.getDate() + offset)
      return { date: ymd(date), time: parseTime(lower.slice(word.length)) }
    }
  }

  const build = (y: number, mo: number, d: number, rest: string): ParsedDate | null => {
    if (y < 100) y += 2000
    if (!isValidYmd(y, mo, d)) return null
    return { date: `${y}-${pad(mo)}-${pad(d)}`, time: parseTime(rest) }
  }

  // ISO with timezone -> local
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const date = new Date(raw)
    if (!Number.isNaN(date.getTime())) return { date: ymd(date), time: `${pad(date.getHours())}:${pad(date.getMinutes())}` }
  }
  // yyyy-MM-dd, yyyy/M/d, yyyy.M.d, yyyy年M月d日
  let m = raw.match(/^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?(.*)$/)
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]), m[4].replace(/^t/i, ' '))
  // yyyymmdd
  m = raw.match(/^(\d{4})(\d{2})(\d{2})(?:[t\s](.*))?$/i)
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]), m[4] || '')
  // M月d日 (current year)
  m = raw.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?(.*)$/)
  if (m) return build(today.getFullYear(), Number(m[1]), Number(m[2]), m[3])
  // a/b/yyyy, a-b-yy, a.b.yyyy
  m = raw.match(/^(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4}|\d{2})(?!\d)(.*)$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    const dayFirstHere = a > 12 ? true : b > 12 ? false : dayFirst
    return dayFirstHere ? build(Number(m[3]), b, a, m[4]) : build(Number(m[3]), a, b, m[4])
  }
  // 12 Oct 2026 / Oct 12, 2026 / Mon, 12 Oct 2026
  const cleaned = lower.replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s*/, '')
  m = cleaned.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{4})(.*)$/)
  if (m && MONTHS[m[2]]) return build(Number(m[3]), MONTHS[m[2]], Number(m[1]), m[4])
  m = cleaned.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(.*)$/)
  if (m && MONTHS[m[1]]) return build(Number(m[3]), MONTHS[m[1]], Number(m[2]), m[4])
  // numeric string that is an Excel serial (e.g. CSV exported from Excel without formatting)
  if (/^\d{5}(\.\d+)?$/.test(raw)) return fromExcelSerial(Number(raw))
  return null
}

/** Hours: 2 | 2h | 1.5 hrs | 90min | 30分钟 | 1.5小时 | 1d | 1天 | 1:30 */
export const parseHours = (value: RawCell, hoursPerDay: number): number | null => {
  if (value === null || value === '' || typeof value === 'boolean') return null
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null
  const text = String(value).normalize('NFKC').trim().toLowerCase().replace(/,/g, '.')
  let m = text.match(/^(\d+):(\d{2})$/)
  if (m) return Number(m[1]) + Number(m[2]) / 60
  let total = 0
  let matched = false
  for (const part of text.matchAll(/(\d+(?:\.\d+)?)\s*(d|day|days|天|h|hr|hrs|hour|hours|小时|个小时|时|m|min|mins|minute|minutes|分钟|分)?/g)) {
    if (!part[1]) continue
    matched = true
    const amount = Number(part[1])
    const unit = part[2] || 'h'
    if (['d', 'day', 'days', '天'].includes(unit)) total += amount * hoursPerDay
    else if (['m', 'min', 'mins', 'minute', 'minutes', '分钟', '分'].includes(unit)) total += amount / 60
    else total += amount
  }
  m = text.match(/^\d/)
  return matched && m ? Math.round(total * 100) / 100 : null
}

/** Progress: 50 | 50% | 0.5 | "0.5" -> 0–100 integer. */
export const parseProgress = (value: RawCell): number | null => {
  if (value === null || value === '') return null
  if (typeof value === 'boolean') return value ? 100 : 0
  const text = String(value).normalize('NFKC').trim()
  const percent = text.endsWith('%')
  const num = Number(text.replace(/%$/, '').trim())
  if (!Number.isFinite(num)) return null
  const scaled = !percent && num > 0 && num < 1 ? num * 100 : num
  return Math.max(0, Math.min(100, Math.round(scaled)))
}

const lookupMap = <T>(map: Record<string, T>, value: RawCell): T | undefined => {
  if (value === null) return undefined
  const key = normalizeKey(value)
  if (!key) return undefined
  for (const [alias, target] of Object.entries(map)) if (normalizeKey(alias) === key) return target
  return undefined
}

const splitList = (value: RawCell, separators: string) => {
  if (value === null || value === '') return []
  const escaped = separators.replace(/[\\\]^-]/g, '\\$&').replace(/\n/g, '\\n')
  return String(value).split(new RegExp(`[${escaped}\\r]+`)).map((item) => item.trim()).filter(Boolean)
}

export const parseChecklist = (value: RawCell, separators: string, makeId: () => string): ChecklistItem[] =>
  splitList(value, separators).map((item) => {
    const m = item.match(/^(?:[-*•]\s*)?(\[( |x|X|✓|√)?\]|☑|✅|☐|□)?\s*(.*)$/)
    const box = m?.[1] || ''
    const done = /x|X|✓|√|☑|✅/.test(box)
    return { id: makeId(), text: (m?.[3] || item).trim(), done }
  }).filter((item) => item.text)

/* ---------------- row -> task ---------------- */

export type BuildOptions = {
  spec: ImportSpec
  mapping: ColumnMapping
  knownAreas?: string[]
  existing?: Pick<Task, 'title' | 'dueDate'>[]
  skipDuplicates?: boolean
  makeId?: () => string
  today?: Date
}

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(y, m - 1, d + days)
  return ymd(next)
}

export const buildImportPreview = (table: RawTable, options: BuildOptions): ImportPreview => {
  const { spec, mapping } = options
  const makeId = options.makeId || (() => crypto.randomUUID())
  const today = options.today || new Date()
  const knownAreas = options.knownAreas || DEFAULT_KNOWN_AREAS
  const areaLookup = new Map(knownAreas.map((area) => [normalizeKey(area), area]))
  const dupKey = (title: string, due: string) => `${normalizeKey(title)}|${due}`
  const seen = new Set((options.existing || []).map((task) => dupKey(task.title, task.dueDate)))

  const columnsFor = (field: ImportFieldKey) => Object.entries(mapping).filter(([, key]) => key === field).map(([header]) => header)
  const pick = (row: RawRow, field: ImportFieldKey): RawCell => {
    for (const header of columnsFor(field)) {
      const value = row[header]
      if (value !== null && value !== undefined && String(value).trim() !== '') return value
    }
    return null
  }
  const unmappedHeaders = Object.entries(mapping).filter(([, key]) => !key).map(([header]) => header)

  const tasks: Task[] = []
  const sourceRows: number[] = []
  const issues: RowIssue[] = []
  let skipped = 0
  let duplicates = 0
  const d = spec.defaults

  table.rows.forEach((row, index) => {
    const rowNo = index + 1
    const warn = (field: ImportFieldKey, message: string) => issues.push({ row: rowNo, field, level: 'warning', message })
    const titleCell = pick(row, 'title')
    const title = titleCell === null ? '' : String(titleCell).trim()
    if (!title) {
      // silently drop fully-empty rows; flag rows that have data but no title
      if (Object.values(row).some((value) => value !== null && String(value).trim() !== '')) {
        issues.push({ row: rowNo, field: 'title', level: 'error', message: 'Missing title — row skipped' })
      }
      skipped += 1
      return
    }

    // status
    const statusCell = pick(row, 'status')
    let status: Status = d.status
    if (statusCell !== null) {
      const mapped = lookupMap(spec.statusMap, statusCell)
      if (mapped) status = mapped
      else warn('status', `Unknown status "${statusCell}" → ${d.status}`)
    }

    // priority
    const priorityCell = pick(row, 'priority')
    let priority: Priority = d.priority
    if (priorityCell !== null) {
      const mapped = lookupMap(spec.priorityMap, priorityCell)
      if (mapped) priority = mapped
      else warn('priority', `Unknown priority "${priorityCell}" → ${d.priority}`)
    }

    // tags (collected early so unknown area can be preserved)
    const tags = splitList(pick(row, 'tags'), spec.tagSeparators)

    // area: "Parent / Child" -> try child, then parent, then areaMap, then default
    const areaCell = pick(row, 'area')
    let area = d.area
    if (areaCell !== null) {
      const text = String(areaCell).trim()
      const candidates = [...text.split(/\s*[/>\\]\s*/).reverse(), text]
      const hit = candidates
        .map((candidate) => areaLookup.get(normalizeKey(candidate)) || lookupMap(spec.areaMap, candidate))
        .find((candidate) => candidate && areaLookup.has(normalizeKey(candidate)))
      if (hit) area = hit
      else {
        if (!tags.includes(text)) tags.unshift(text)
        warn('area', `Unknown area "${text}" → ${d.area} (kept as tag)`)
      }
    }

    // dates
    const parseField = (field: 'startDate' | 'dueDate' | 'reminderAt') => {
      const cell = pick(row, field)
      if (cell === null) return null
      const parsed = parseDateValue(cell, spec.dayFirst, today)
      if (!parsed) warn(field, `Unrecognised date "${cell}" — ignored`)
      return parsed
    }
    const start = parseField('startDate')
    const due = parseField('dueDate')
    const reminder = parseField('reminderAt')

    const estimateCell = pick(row, 'estimateHours')
    let estimateHours = d.estimateHours
    if (estimateCell !== null) {
      const hours = parseHours(estimateCell, spec.hoursPerDay)
      if (hours === null) warn('estimateHours', `Unrecognised estimate "${estimateCell}" → ${d.estimateHours}h`)
      else estimateHours = hours || d.estimateHours
    }

    let startDate = start?.date || ''
    let dueDate = due?.date || ''
    if (!startDate && !dueDate) {
      startDate = ymd(today)
      dueDate = addDays(startDate, d.durationDays)
      if (columnsFor('startDate').length || columnsFor('dueDate').length) warn('dueDate', `No date — scheduled for ${startDate}`)
    } else if (!dueDate) dueDate = addDays(startDate, d.durationDays)
    else if (!startDate) startDate = addDays(dueDate, -d.durationDays)
    if (startDate > dueDate) {
      warn('dueDate', 'Due date before start date — swapped')
      ;[startDate, dueDate] = [dueDate, startDate]
    }

    const reminderTime = reminder?.time || due?.time || d.reminderTime
    const reminderAt = `${reminder?.date || dueDate}T${reminderTime}`

    const minsCell = pick(row, 'reminderMins')
    const reminderMins = minsCell !== null && Number.isFinite(Number(minsCell)) ? Math.max(0, Number(minsCell)) : d.reminderMins

    const progressCell = pick(row, 'progress')
    let progress = status === 'done' ? 100 : 0
    if (progressCell !== null) {
      const parsed = parseProgress(progressCell)
      if (parsed === null) warn('progress', `Unrecognised progress "${progressCell}" → ${progress}%`)
      else progress = parsed
    }

    const colorCell = pick(row, 'color')
    let color: string | undefined
    if (colorCell !== null && String(colorCell).trim() !== '') {
      const parsed = parseColorValue(String(colorCell))
      if (parsed) color = parsed
      else warn('color', `Unrecognised color "${colorCell}" → area color`)
    }

    let notes = pick(row, 'notes') === null ? '' : String(pick(row, 'notes'))
    // keep unmapped column data so nothing from the source is lost
    const extras = unmappedHeaders
      .map((header) => [header, row[header]] as const)
      .filter(([, value]) => value !== null && String(value).trim() !== '')
      .map(([header, value]) => `${header}: ${value}`)
    if (extras.length) notes = [notes, extras.join('\n')].filter(Boolean).join('\n\n')

    const checklist = parseChecklist(pick(row, 'checklist'), spec.checklistSeparators, makeId)

    const key = dupKey(title, dueDate)
    if (seen.has(key)) {
      duplicates += 1
      if (options.skipDuplicates) {
        issues.push({ row: rowNo, level: 'warning', message: `Duplicate of an existing task (${title}, ${dueDate}) — skipped` })
        skipped += 1
        return
      }
    }
    seen.add(key)

    tasks.push({
      id: makeId(),
      title,
      area,
      status,
      priority,
      startDate,
      dueDate,
      reminderAt,
      reminderMins,
      estimateHours,
      progress,
      tags,
      notes,
      checklist,
      ...(color ? { color } : {}),
      createdAt: new Date().toISOString(),
    })
    sourceRows.push(rowNo)
  })

  return { tasks, sourceRows, issues, skipped, duplicates }
}
