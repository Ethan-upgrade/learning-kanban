// Run: node --test scripts/import.test.ts   (Node ≥ 22.18 strips TS types natively)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { parseDelimited, parseJson, readXlsx, tableFromMatrix, parsePastedText, sniffDelimiter } from '../src/importing/parsers.ts'
import { autoMapColumns, buildImportPreview, parseDateValue, parseHours, parseProgress, parseTime, missingRequired } from '../src/importing/normalize.ts'
import { defaultImportSpec, sanitizeImportSpec } from '../src/importing/spec.ts'
import { buildCsvTemplate, buildJsonTemplate, buildXlsxTemplate } from '../src/importing/templates.ts'

const spec = defaultImportSpec
const today = new Date(2026, 9, 10)
let n = 0
const makeId = () => `id-${++n}`
const preview = (table: ReturnType<typeof parseDelimited>, extra = {}) =>
  buildImportPreview(table, { spec, mapping: autoMapColumns(table.headers, spec), makeId, today, ...extra })

test('dates: many formats', () => {
  const d = (v: string | number, dayFirst = true) => parseDateValue(v, dayFirst, today)
  assert.deepEqual(d('2026-10-12'), { date: '2026-10-12', time: undefined })
  assert.equal(d('2026/1/5')?.date, '2026-01-05')
  assert.equal(d('2026.1.5')?.date, '2026-01-05')
  assert.equal(d('2026年1月5日')?.date, '2026-01-05')
  assert.equal(d('20260105')?.date, '2026-01-05')
  assert.equal(d('03/04/2026')?.date, '2026-04-03')
  assert.equal(d('03/04/2026', false)?.date, '2026-03-04')
  assert.equal(d('13/04/2026', false)?.date, '2026-04-13', 'day>12 forces day-first')
  assert.equal(d('04/13/2026')?.date, '2026-04-13', 'month-first when second part >12')
  assert.equal(d('12 Oct 2026')?.date, '2026-10-12')
  assert.equal(d('Oct 12, 2026')?.date, '2026-10-12')
  assert.equal(d('Mon, 12 Oct 2026')?.date, '2026-10-12')
  assert.equal(d('3月4日')?.date, '2026-03-04')
  assert.equal(d('tomorrow')?.date, '2026-10-11')
  assert.equal(d('明天 下午3点')?.time, '15:00')
  assert.deepEqual(d('2026-10-12 09:30'), { date: '2026-10-12', time: '09:30' })
  assert.deepEqual(d('2026-10-12T18:00'), { date: '2026-10-12', time: '18:00' })
  assert.equal(d(46307)?.date, '2026-10-12', 'excel serial number')
  assert.deepEqual(d('@xlsdate:46307.375'), { date: '2026-10-12', time: '09:00' })
  assert.equal(d('46307')?.date, '2026-10-12', 'serial as text')
  assert.equal(d('2026-02-30'), null)
  assert.equal(d('not a date'), null)
  assert.equal(d(3), null, 'small numbers are not dates')
})

test('time, hours, progress', () => {
  assert.equal(parseTime('9am'), '09:00')
  assert.equal(parseTime('3:30 pm'), '15:30')
  assert.equal(parseTime('15点30分'), '15:30')
  assert.equal(parseHours('2h', 8), 2)
  assert.equal(parseHours('90min', 8), 1.5)
  assert.equal(parseHours('1.5小时', 8), 1.5)
  assert.equal(parseHours('1d', 8), 8)
  assert.equal(parseHours('1h 30m', 8), 1.5)
  assert.equal(parseHours('1:30', 8), 1.5)
  assert.equal(parseHours('abc', 8), null)
  assert.equal(parseProgress('50%'), 50)
  assert.equal(parseProgress(0.4), 40)
  assert.equal(parseProgress('1'), 1)
  assert.equal(parseProgress('150'), 100)
  assert.equal(parseProgress(true), 100)
})

test('csv: BOM, quotes, newlines, delimiter sniffing', () => {
  const csv = '\uFEFFtitle,notes,tags\r\n"Write, edit","line1\nline2","a; b"\r\n"He said ""hi""",,\r\n'
  const t = parseDelimited(csv)
  assert.deepEqual(t.headers, ['title', 'notes', 'tags'])
  assert.equal(t.rows.length, 2)
  assert.equal(t.rows[0].title, 'Write, edit')
  assert.equal(t.rows[0].notes, 'line1\nline2')
  assert.equal(t.rows[1].title, 'He said "hi"')
  assert.equal(sniffDelimiter('a;b;c\n1;2;3'), ';')
  assert.equal(sniffDelimiter('a\tb\n1\t2'), '\t')
  assert.equal(parseDelimited('标题;截止日期\n买菜;2026-10-12').rows[0]['截止日期'], '2026-10-12')
})

test('header detection skips a title row; duplicate headers made unique', () => {
  const t = tableFromMatrix([['My schedule export'], [], ['Title', 'Tags', 'Tags'], ['A', 'x', 'y']], 'csv')
  assert.deepEqual(t.headers, ['Title', 'Tags', 'Tags (2)'])
  assert.equal(t.rows.length, 1)
})

test('json: array, wrapped, NDJSON, array-of-arrays, legacy export', () => {
  assert.equal(parseJson('[{"title":"a"}]').rows.length, 1)
  assert.equal(parseJson('{"tasks":[{"title":"a"},{"title":"b"}]}').rows.length, 2)
  assert.equal(parseJson('{"events":[{"summary":"a"}]}').rows[0].summary, 'a')
  assert.equal(parseJson('{"title":"x"}\n{"title":"y"}').rows.length, 2)
  assert.deepEqual(parseJson('[["title","due"],["a","2026-10-12"]]').headers, ['title', 'due'])
  const legacy = parseJson(JSON.stringify([{ id: 'x', title: 'Old', status: 'doing', tags: ['a', 'b'], checklist: [{ id: '1', text: 'c', done: true }] }]))
  const p = preview(legacy)
  assert.equal(p.tasks[0].status, 'doing')
  assert.deepEqual(p.tasks[0].tags, ['a', 'b'])
  assert.deepEqual(p.tasks[0].checklist.map((c) => [c.text, c.done]), [['c', true]])
  assert.throws(() => parseJson('{oops'))
})

test('auto-mapping: english, chinese, messy headers', () => {
  const m = autoMapColumns(['任务名称', '截止日期', '优先级', 'Due_Date', 'Weird', ' Start Time ', '% Complete'], spec)
  assert.equal(m['任务名称'], 'title')
  assert.equal(m['截止日期'], 'dueDate')
  assert.equal(m['Due_Date'], null, 'field only mapped once')
  assert.equal(m['优先级'], 'priority')
  assert.equal(m[' Start Time '], 'startDate')
  assert.equal(m['% Complete'], 'progress')
  assert.equal(m['Weird'], null)
  assert.deepEqual(missingRequired({ a: 'dueDate' }, spec).map((f) => f.key), ['title'])
})

test('normalization end-to-end', () => {
  const t = parsePastedText('任务\t状态\t优先级\t领域\t开始\t截止\t预计\t进度\t标签\t备注\t房间\n' +
    '复习线代\t进行中\tP1\t学习 / Python\t2026/10/12\t2026/10/14\t90min\t50%\t考试、数学\t第三章\tA101\n' +
    '\t\t\t\t\t\t\t\t\t\t\n' +
    '\t完成\t\t\t\t\t\t\t\t\t\n' +
    '开会\tunknown\t高\tMarketing\t\t15/10/2026 14:00\t\t\t\t\t\n' +
    '反向日期\t\t\t\t2026-10-20\t2026-10-18\t\t\t\t\t\n')
  const p = preview(t)
  assert.equal(p.tasks.length, 3)
  assert.equal(p.skipped, 1, 'fully blank rows are dropped by the parser; the title-less row is skipped')
  const [a, b, c] = p.tasks
  assert.equal(a.status, 'doing')
  assert.equal(a.priority, 'high')
  assert.equal(a.area, 'Python')
  assert.equal(a.estimateHours, 1.5)
  assert.equal(a.progress, 50)
  assert.deepEqual(a.tags, ['考试', '数学'])
  assert.match(a.notes, /第三章[\s\S]*房间: A101/)
  assert.equal(b.status, 'backlog')
  assert.equal(b.area, 'Schedule')
  assert.ok(b.tags.includes('Marketing'))
  assert.equal(b.dueDate, '2026-10-15')
  assert.equal(b.startDate, '2026-10-15')
  assert.equal(b.reminderAt, '2026-10-15T14:00')
  assert.equal(c.startDate, '2026-10-18')
  assert.equal(c.dueDate, '2026-10-20')
  assert.equal(p.issues.filter((i) => i.level === 'error').length, 1, 'row with data but no title')
  assert.ok(p.issues.some((i) => i.field === 'status'))
})

test('duplicates against existing tasks', () => {
  const t = parseDelimited('title,due\nA,2026-10-12\nB,2026-10-12')
  const existing = [{ title: 'a', dueDate: '2026-10-12' }]
  assert.equal(preview(t, { existing }).duplicates, 1)
  const skipped = preview(t, { existing, skipDuplicates: true })
  assert.equal(skipped.tasks.length, 1)
  assert.equal(skipped.tasks[0].title, 'B')
})

test('custom spec changes the contract', () => {
  const { spec: custom, errors } = sanitizeImportSpec({
    fields: [{ key: 'title', aliases: ['课程名'], required: false }],
    statusMap: { 搁置: 'review', bogus: 'nope' },
    dayFirst: false,
    defaults: { area: 'Project', status: 'week', reminderTime: '8:15' },
  })
  assert.equal(errors.length, 1, 'bogus status flagged')
  assert.equal(custom.fields.find((f) => f.key === 'title')?.required, true, 'title stays required')
  assert.equal(custom.defaults.reminderTime, '08:15')
  const t = parseDelimited('课程名,状态,due\n线代,搁置,03/04/2026\nX,进行中,')
  const p = buildImportPreview(t, { spec: custom, mapping: autoMapColumns(t.headers, custom), makeId, today })
  assert.equal(p.tasks[0].status, 'review')
  assert.equal(p.tasks[0].dueDate, '2026-03-04', 'month-first')
  assert.equal(p.tasks[0].area, 'Project')
  assert.equal(p.tasks[1].status, 'week', 'statusMap replaced → falls back to default')
  assert.ok(sanitizeImportSpec('nope').errors.length)
})

test('templates round-trip through the parsers', async () => {
  const csv = parseDelimited(buildCsvTemplate(spec))
  const fromCsv = preview(csv)
  assert.equal(fromCsv.tasks.length, 3)
  assert.equal(fromCsv.issues.length, 0, JSON.stringify(fromCsv.issues))
  assert.equal(fromCsv.tasks[2].estimateHours, 16)
  assert.equal(fromCsv.tasks[0].checklist[0].done, true)
  assert.deepEqual(fromCsv.tasks.map((t) => t.color), ['#34C724', '#F54A45', undefined], 'template colors')

  const fromJson = preview(parseJson(buildJsonTemplate(spec)))
  assert.equal(fromJson.tasks.length, 3)
  assert.equal(fromJson.issues.length, 0, JSON.stringify(fromJson.issues))
  assert.deepEqual(fromJson.tasks[0].tags, fromCsv.tasks[0].tags)

  const xlsx = buildXlsxTemplate(spec)
  const sheets = await readXlsx(xlsx.buffer.slice(xlsx.byteOffset, xlsx.byteOffset + xlsx.byteLength) as ArrayBuffer)
  assert.deepEqual(sheets.map((s) => s.name), ['Tasks', 'Spec'])
  const fromXlsx = preview(tableFromMatrix(sheets[0].matrix, 'xlsx'))
  assert.equal(fromXlsx.tasks.length, 3)
  assert.deepEqual(fromXlsx.tasks.map((t) => t.dueDate), fromCsv.tasks.map((t) => t.dueDate))
  assert.deepEqual(fromXlsx.tasks.map((t) => t.color), fromCsv.tasks.map((t) => t.color))
})

test('color column: names, hex, Chinese header, bad values warn and fall back', () => {
  const t = parseDelimited('标题,颜色,due\nA,蓝色,2026-10-12\nB,#abc,2026-10-12\nC,sparkly,2026-10-12\nD,,2026-10-12')
  const mapping = autoMapColumns(t.headers, spec)
  assert.equal(mapping['颜色'], 'color')
  const p = preview(t)
  assert.deepEqual(p.tasks.map((x) => x.color), ['#3370FF', '#AABBCC', undefined, undefined])
  const warnings = p.issues.filter((i) => i.field === 'color')
  assert.equal(warnings.length, 1)
  assert.equal(warnings[0].level, 'warning')
  assert.equal(warnings[0].row, 3)
  assert.ok(!('color' in p.tasks[3]), 'no empty color key written')
})

test('real Excel file written by openpyxl (dates, numbers, shared strings)', { skip: !existsSync('scripts/fixtures/real.xlsx') }, async () => {
  const buf = readFileSync('scripts/fixtures/real.xlsx')
  const sheets = await readXlsx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer)
  const t = tableFromMatrix(sheets[0].matrix, 'xlsx')
  const p = preview(t)
  assert.equal(p.tasks.length, 3, JSON.stringify(p.issues))
  assert.equal(p.tasks[0].title, '论文初稿')
  assert.equal(p.tasks[0].dueDate, '2026-10-20')
  assert.equal(p.tasks[0].reminderAt, '2026-10-19T09:30')
  assert.equal(p.tasks[0].estimateHours, 3)
  assert.equal(p.tasks[0].progress, 25)
  assert.equal(p.tasks[1].startDate, '2026-11-02')
  assert.equal(p.tasks[2].priority, 'low')
})
