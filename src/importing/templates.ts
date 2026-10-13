// Downloadable import templates (CSV / JSON / XLSX) + the spec reference sheet.
import { buildXlsx } from './parsers.ts'
import type { ImportSpec } from './spec.ts'

export const templateHeaders = (spec: ImportSpec) => spec.fields.map((field) => field.key)

export const templateSampleRows = (): string[][] => [
  ['Read chapter 3 of the textbook', 'Learning', 'Planned', 'High', '2026-10-12', '2026-10-14', '2026-10-14 09:00', '120', '2', '0', 'reading; exam', 'Focus on worked examples', '[x] skim headings; take notes; summarise', 'green'],
  ['Team sync meeting', 'Schedule', 'Inbox', 'Medium', '2026-10-13', '2026-10-13', '2026-10-13 14:30', '15', '1', '', 'meeting', '', '', '#F54A45'],
  ['Ship v1 of the dashboard', 'Project', 'In Progress', 'P1', '', '2026-10-20', '', '', '2d', '40%', 'release', 'Start date auto-derived from due date', 'QA pass; release notes', ''],
]

const csvCell = (value: string) => (/[",\n\r;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

export const buildCsvTemplate = (spec: ImportSpec) =>
  '\uFEFF' + [templateHeaders(spec), ...templateSampleRows()].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'

export const buildJsonTemplate = (spec: ImportSpec) => {
  const headers = templateHeaders(spec)
  const tasks = templateSampleRows().map((row) => {
    const item: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      const value = row[index] ?? ''
      if (value === '') return
      if (header === 'tags') item[header] = value.split(/;\s*/)
      else if (header === 'checklist') item[header] = value.split(/;\s*/).map((text) => ({ text: text.replace(/^\[x\]\s*/, ''), done: text.startsWith('[x]') }))
      else if (['estimateHours', 'reminderMins'].includes(header) && /^\d+(\.\d+)?$/.test(value)) item[header] = Number(value)
      else item[header] = value
    })
    return item
  })
  return JSON.stringify({ $schema: 'cjboard-import/v1', tasks }, null, 2)
}

export const specReferenceRows = (spec: ImportSpec): string[][] => {
  const invert = (map: Record<string, string>) => {
    const grouped = new Map<string, string[]>()
    for (const [alias, target] of Object.entries(map)) grouped.set(target, [...(grouped.get(target) || []), alias])
    return [...grouped.entries()].map(([target, aliases]) => [target, aliases.join(', ')])
  }
  return [
    ['Field (column)', 'Required', 'Description', 'Example', 'Accepted column names'],
    ...spec.fields.map((field) => [field.key, field.required ? 'yes' : 'no', field.description, field.example, field.aliases.join(', ')]),
    [],
    ['Status value', 'Accepted values'],
    ...invert(spec.statusMap),
    [],
    ['Priority value', 'Accepted values'],
    ...invert(spec.priorityMap),
    [],
    ['Defaults', 'Value'],
    ['status', spec.defaults.status],
    ['priority', spec.defaults.priority],
    ['area', spec.defaults.area],
    ['durationDays (due − start when one is missing)', String(spec.defaults.durationDays)],
    ['estimateHours', String(spec.defaults.estimateHours)],
    ['reminderTime', spec.defaults.reminderTime],
    ['reminderMins', String(spec.defaults.reminderMins)],
    ['dayFirst (03/04 = 3 April)', String(spec.dayFirst)],
    ['hoursPerDay (for 1d estimates)', String(spec.hoursPerDay)],
  ].map((row) => row.map(String))
}

export const buildXlsxTemplate = (spec: ImportSpec) =>
  buildXlsx([
    { name: 'Tasks', rows: [templateHeaders(spec), ...templateSampleRows()] },
    { name: 'Spec', rows: specReferenceRows(spec) },
  ])

export const downloadBlob = (content: BlobPart, fileName: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const downloadTemplate = (kind: 'csv' | 'json' | 'xlsx' | 'spec', spec: ImportSpec) => {
  if (kind === 'csv') downloadBlob(buildCsvTemplate(spec), 'cjboard-import-template.csv', 'text/csv;charset=utf-8')
  else if (kind === 'json') downloadBlob(buildJsonTemplate(spec), 'cjboard-import-template.json', 'application/json')
  else if (kind === 'xlsx') downloadBlob(buildXlsxTemplate(spec) as BlobPart, 'cjboard-import-template.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  else downloadBlob(JSON.stringify(spec, null, 2), 'cjboard-import-spec.json', 'application/json')
}
