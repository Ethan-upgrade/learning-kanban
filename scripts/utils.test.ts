import assert from 'node:assert/strict'
import test from 'node:test'
import { addDays, format } from 'date-fns'
import { areas } from '../src/constants'
import {
  createTemplateTasks,
  getRiskLevel,
  getRiskScore,
  getTaskProgress,
  matchesAutomationCondition,
  normalizeBaseRecord,
  normalizeNote,
  normalizeProject,
  normalizeTask,
} from '../src/utils'
import type { AutomationRule, ChecklistItem, Task } from '../src/types'

const day = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd')

const isoDate = /^\d{4}-\d{2}-\d{2}$/
const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'A task',
  area: 'Project',
  status: 'backlog',
  priority: 'medium',
  startDate: day(0),
  dueDate: day(5),
  reminderAt: `${day(5)}T20:00`,
  reminderMins: 120,
  estimateHours: 1,
  progress: 0,
  tags: [],
  notes: '',
  checklist: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const makeRule = (overrides: Partial<AutomationRule> = {}): AutomationRule => ({
  id: 'rule-1',
  name: 'Rule',
  active: true,
  trigger: 'task_created',
  triggerField: 'status',
  conditionEnabled: false,
  conditionField: 'priority',
  conditionValue: '',
  action: 'notify',
  actionValue: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  runCount: 0,
  ...overrides,
})

const checklist = (...done: boolean[]): ChecklistItem[] =>
  done.map((value, index) => ({ id: `item-${index}`, text: `Item ${index}`, done: value }))

// Test-only escape hatch for deliberately malformed persisted data.
const asUnknown = <T>(value: Record<string, unknown>): T => value as unknown as T

test('normalizeTask fills defaults for a minimal record', () => {
  const task = normalizeTask({ id: 't1', title: 'Write notes' })

  assert.equal(task.id, 't1')
  assert.equal(task.title, 'Write notes')
  assert.equal(task.area, 'Project')
  assert.equal(task.status, 'backlog')
  assert.equal(task.priority, 'medium')
  assert.equal(task.reminderMins, 120)
  assert.equal(task.estimateHours, 1)
  assert.equal(task.progress, 0)
  assert.deepEqual(task.tags, [])
  assert.deepEqual(task.checklist, [])
  assert.equal(task.notes, '')
  assert.equal(task.dueDate, day(2))
  assert.equal(task.startDate, day(1))
  assert.equal(task.reminderAt, `${day(2)}T21:00`)
  assert.match(task.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
})

test('normalizeTask falls back to placeholder text and a valid area', () => {
  const task = normalizeTask({ id: 't2', title: '', area: 'Not An Area' })

  assert.equal(task.title, 'Untitled Task')
  assert.equal(task.area, 'Project')

  const known = normalizeTask({ id: 't3', title: 'Python drills', area: 'Python' })
  assert.equal(known.area, 'Python')
})

test('normalizeTask coerces malformed numbers and derives startDate from the due date', () => {
  const task = normalizeTask(
    asUnknown<Parameters<typeof normalizeTask>[0]>({
      id: 't4',
      title: 'Legacy row',
      dueDate: '2026-05-10',
      estimateHours: '3',
      progress: '35',
    }),
  )

  assert.equal(task.estimateHours, 3)
  assert.equal(task.progress, 35)
  assert.equal(task.startDate, '2026-05-07')
  assert.equal(task.reminderAt, '2026-05-10T21:00')

  const zeroed = normalizeTask({ id: 't5', title: 'Zero hours', estimateHours: 0 })
  assert.equal(zeroed.estimateHours, 1)

  const badProgress = normalizeTask(
    asUnknown<Parameters<typeof normalizeTask>[0]>({
      id: 't6',
      title: 'Bad progress',
      dueDate: '2026-05-10',
      startDate: '2026-05-09',
      progress: 'lots',
    }),
  )
  assert.equal(badProgress.progress, 0)
})

test('normalizeTask keeps provided values', () => {
  const task = normalizeTask({
    id: 't6',
    title: 'Review PR',
    area: 'Learning',
    status: 'review',
    priority: 'high',
    startDate: '2026-05-01',
    dueDate: '2026-05-04',
    reminderAt: '2026-05-03T09:30',
    reminderMins: 30,
    estimateHours: 2,
    progress: 60,
    tags: ['code'],
    notes: 'Check the diff',
    checklist: checklist(true, false),
    createdAt: '2026-04-01T00:00:00.000Z',
    remindedAt: '2026-05-02T09:30',
  })

  assert.equal(task.status, 'review')
  assert.equal(task.priority, 'high')
  assert.equal(task.startDate, '2026-05-01')
  assert.equal(task.reminderAt, '2026-05-03T09:30')
  assert.equal(task.remindedAt, '2026-05-02T09:30')
  assert.deepEqual(task.tags, ['code'])
  assert.equal(task.checklist.length, 2)
})

test('normalizeNote fills defaults and coerces pinned to a boolean', () => {
  const note = normalizeNote({ id: 'n1', title: 'Ideas' })

  assert.equal(note.title, 'Ideas')
  assert.equal(note.content, '')
  assert.deepEqual(note.tags, [])
  assert.deepEqual(note.linkedTaskIds, [])
  assert.equal(note.pinned, false)
  assert.match(note.createdAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(note.createdAt, note.updatedAt)

  const pinned = normalizeNote(asUnknown<Parameters<typeof normalizeNote>[0]>({ id: 'n2', title: 'Pinned', pinned: 'yes' }))
  assert.equal(pinned.pinned, true)

  const unpinned = normalizeNote(asUnknown<Parameters<typeof normalizeNote>[0]>({ id: 'n3', title: 'Plain', pinned: 0 }))
  assert.equal(unpinned.pinned, false)
})

test('normalizeNote falls back to a placeholder title and keeps content', () => {
  const note = normalizeNote({ id: 'n4', title: '', content: '# Body', tags: ['cs'], linkedTaskIds: ['t1'] })

  assert.equal(note.title, 'Untitled Note')
  assert.equal(note.content, '# Body')
  assert.deepEqual(note.tags, ['cs'])
  assert.deepEqual(note.linkedTaskIds, ['t1'])
})

test('normalizeProject fills defaults for a minimal record', () => {
  const project = normalizeProject({ id: 'p1', name: 'Portfolio' })

  assert.equal(project.name, 'Portfolio')
  assert.equal(project.objective, '')
  assert.equal(project.status, 'idea')
  assert.equal(project.priority, 'medium')
  assert.equal(project.owner, 'Novak')
  assert.deepEqual(project.linkedTaskIds, [])
  assert.deepEqual(project.tags, [])
  assert.equal(project.notes, '')
  assert.equal(project.startDate, day(0))
  assert.equal(project.dueDate, day(14))
  assert.match(project.createdAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(project.createdAt, project.updatedAt)
})

test('normalizeProject rejects unknown statuses and non-array relations', () => {
  const project = normalizeProject(
    asUnknown<Parameters<typeof normalizeProject>[0]>({
      id: 'p2',
      name: '',
      status: 'archived',
      linkedTaskIds: 't1,t2',
      tags: 'learning',
    }),
  )

  assert.equal(project.name, 'Untitled Project')
  assert.equal(project.status, 'idea')
  assert.deepEqual(project.linkedTaskIds, [])
  assert.deepEqual(project.tags, [])
})

test('normalizeProject keeps every valid project status', () => {
  for (const status of ['idea', 'active', 'blocked', 'review', 'done'] as const) {
    const project = normalizeProject({ id: `p-${status}`, name: status, status, priority: 'high' })
    assert.equal(project.status, status)
    assert.equal(project.priority, 'high')
  }
})

test('normalizeBaseRecord fills defaults for a minimal record', () => {
  const record = normalizeBaseRecord({ id: 'b1' })

  assert.equal(record.company, 'Untitled Company')
  assert.equal(record.role, 'Untitled Role')
  assert.equal(record.status, 'wishlist')
  assert.equal(record.priority, 'medium')
  assert.equal(record.owner, 'Novak')
  assert.equal(record.city, '')
  assert.equal(record.channel, '')
  assert.equal(record.nextAction, '')
  assert.equal(record.salaryRange, '')
  assert.equal(record.notes, '')
  assert.equal(record.link, '')
  assert.deepEqual(record.tags, [])
  assert.equal(record.applyDate, day(0))
  assert.equal(record.deadline, day(14))
  assert.equal(record.nextActionAt, `${day(1)}T20:00`)
  assert.match(record.createdAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(record.createdAt, record.updatedAt)
})

test('normalizeBaseRecord rejects unknown statuses and non-array tags', () => {
  const record = normalizeBaseRecord(
    asUnknown<Parameters<typeof normalizeBaseRecord>[0]>({
      id: 'b2',
      company: 'Acme',
      role: 'Intern',
      status: 'ghosted',
      tags: 'backend',
    }),
  )

  assert.equal(record.company, 'Acme')
  assert.equal(record.role, 'Intern')
  assert.equal(record.status, 'wishlist')
  assert.deepEqual(record.tags, [])

  const offer = normalizeBaseRecord({ id: 'b3', status: 'offer' })
  assert.equal(offer.status, 'offer')
})

test('getTaskProgress uses the stage floor when there is no checklist', () => {
  assert.equal(getTaskProgress(makeTask({ status: 'backlog' })), 0)
  assert.equal(getTaskProgress(makeTask({ status: 'week' })), 18)
  assert.equal(getTaskProgress(makeTask({ status: 'doing' })), 45)
  assert.equal(getTaskProgress(makeTask({ status: 'review' })), 82)
  assert.equal(getTaskProgress(makeTask({ status: 'done' })), 100)
})

test('getTaskProgress never drops below the stage floor', () => {
  assert.equal(getTaskProgress(makeTask({ status: 'doing', checklist: checklist(false, false, false) })), 45)
  assert.equal(getTaskProgress(makeTask({ status: 'review', checklist: checklist(true, false, false, false, false) })), 82)
  assert.equal(getTaskProgress(makeTask({ status: 'week', checklist: checklist(false, false) })), 18)
})

test('getTaskProgress lets a checklist raise progress and rounds to a whole percent', () => {
  assert.equal(getTaskProgress(makeTask({ status: 'backlog', checklist: checklist(true, false) })), 50)
  assert.equal(getTaskProgress(makeTask({ status: 'backlog', checklist: checklist(true, true, false) })), 67)
  assert.equal(getTaskProgress(makeTask({ status: 'backlog', checklist: checklist(true, true) })), 100)
})

test('getTaskProgress returns 100 for a done task regardless of its checklist', () => {
  assert.equal(getTaskProgress(makeTask({ status: 'done', checklist: checklist(false, false) })), 100)
  assert.equal(getTaskProgress(makeTask({ status: 'done', checklist: [] })), 100)
})

test('getRiskLevel reports Done first, then Overdue', () => {
  assert.equal(getRiskLevel(makeTask({ status: 'done', dueDate: day(-3) })), 'Done')
  assert.equal(getRiskLevel(makeTask({ status: 'doing', dueDate: day(-1) })), 'Overdue')
})

test('getRiskLevel flags high priority work due within two days', () => {
  assert.equal(getRiskLevel(makeTask({ priority: 'high', dueDate: day(0) })), 'High risk')
  assert.equal(getRiskLevel(makeTask({ priority: 'high', dueDate: day(2) })), 'High risk')
  assert.equal(getRiskLevel(makeTask({ priority: 'medium', dueDate: day(2) })), 'Due soon')
})

test('getRiskLevel falls back to Due soon and Normal', () => {
  assert.equal(getRiskLevel(makeTask({ priority: 'medium', dueDate: day(3) })), 'Due soon')
  assert.equal(getRiskLevel(makeTask({ priority: 'high', dueDate: day(3) })), 'Due soon')
  assert.equal(getRiskLevel(makeTask({ priority: 'low', dueDate: day(1) })), 'Due soon')
  assert.equal(getRiskLevel(makeTask({ priority: 'medium', dueDate: day(4) })), 'Normal')
  assert.equal(getRiskLevel(makeTask({ priority: 'high', dueDate: day(10) })), 'Normal')
})

test('getRiskScore orders overdue before imminent before distant work', () => {
  const overdue = makeTask({ priority: 'high', status: 'backlog', dueDate: day(-1) })
  const highSoon = makeTask({ priority: 'high', status: 'doing', dueDate: day(2) })
  const mediumSoon = makeTask({ priority: 'medium', status: 'doing', dueDate: day(2) })
  const lowDistant = makeTask({ priority: 'low', status: 'backlog', dueDate: day(30) })

  assert.equal(getRiskScore(overdue), 110)
  assert.equal(getRiskScore(highSoon), 44.375)
  assert.equal(getRiskScore(mediumSoon), 34.375)
  assert.equal(getRiskScore(lowDistant), 10)

  const sorted = [lowDistant, mediumSoon, overdue, highSoon].sort((a, b) => getRiskScore(b) - getRiskScore(a))
  assert.deepEqual(
    sorted.map((task) => task.id),
    [overdue.id, highSoon.id, mediumSoon.id, lowDistant.id],
  )
})

test('getRiskScore decreases as checklist progress increases', () => {
  const empty = makeTask({ dueDate: day(5), checklist: [] })
  const done = makeTask({ dueDate: day(5), checklist: checklist(true, true, true, true) })

  assert.equal(getRiskScore(empty), 23)
  assert.equal(getRiskScore(done), 10.5)
  assert.ok(getRiskScore(done) < getRiskScore(empty))
})

test('matchesAutomationCondition is always true when the condition is disabled', () => {
  const task = makeTask({ priority: 'low' })
  assert.equal(matchesAutomationCondition(task, makeRule({ conditionEnabled: false, conditionValue: 'high' })), true)
})

test('matchesAutomationCondition compares trimmed, case-insensitive field values', () => {
  const task = makeTask({ priority: 'high', status: 'week' })

  assert.equal(matchesAutomationCondition(task, makeRule({ conditionEnabled: true, conditionField: 'priority', conditionValue: 'HIGH' })), true)
  assert.equal(matchesAutomationCondition(task, makeRule({ conditionEnabled: true, conditionField: 'priority', conditionValue: '  High  ' })), true)
  assert.equal(matchesAutomationCondition(task, makeRule({ conditionEnabled: true, conditionField: 'status', conditionValue: 'Week' })), true)
  assert.equal(matchesAutomationCondition(task, makeRule({ conditionEnabled: true, conditionField: 'priority', conditionValue: 'low' })), false)
  assert.equal(matchesAutomationCondition(task, makeRule({ conditionEnabled: true, conditionField: 'area', conditionValue: 'Learning' })), false)
})

test('matchesAutomationCondition matches the due date exactly', () => {
  const dueDate = '2026-06-01'
  const task = makeTask({ dueDate })
  assert.equal(matchesAutomationCondition(task, makeRule({ conditionEnabled: true, conditionField: 'dueDate', conditionValue: dueDate })), true)
  assert.equal(matchesAutomationCondition(task, makeRule({ conditionEnabled: true, conditionField: 'dueDate', conditionValue: '2026-06-02' })), false)
})

test('createTemplateTasks builds the four plan templates', () => {
  const expected: Array<[Parameters<typeof createTemplateTasks>[0], number]> = [
    ['study', 4],
    ['project', 4],
    ['coursework', 4],
    ['daily', 3],
  ]

  for (const [templateId, count] of expected) {
    const tasks = createTemplateTasks(templateId)
    assert.equal(tasks.length, count, `${templateId} should create ${count} tasks`)

    const ids = new Set(tasks.map((task) => task.id))
    assert.equal(ids.size, count, `${templateId} task ids must be unique`)

    for (const task of tasks) {
      assert.ok(task.id)
      assert.ok(task.title.length > 0)
      assert.ok(['backlog', 'week', 'doing', 'review', 'done'].includes(task.status))
      assert.ok(['high', 'medium', 'low'].includes(task.priority))
      assert.ok(areas.includes(task.area), `${task.area} should be a known area`)
      assert.ok(task.tags.length > 0)
      assert.match(task.startDate, isoDate)
      assert.match(task.dueDate, isoDate)
      assert.ok(task.startDate <= task.dueDate)
      assert.equal(task.reminderAt, `${task.dueDate}T20:00`)
      assert.match(task.reminderAt, isoDateTime)
      assert.equal(task.reminderMins, 120)
      assert.equal(task.progress, 0)
      assert.match(task.createdAt, /^\d{4}-\d{2}-\d{2}T/)
      for (const item of task.checklist) {
        assert.ok(item.id)
        assert.ok(item.text.length > 0)
        assert.equal(item.done, false)
      }
    }
  }
})

test('createTemplateTasks seeds the expected statuses and checklists', () => {
  const study = createTemplateTasks('study')
  assert.equal(study[0].status, 'week')
  assert.deepEqual(study.map((task) => task.checklist.length), [2, 0, 3, 0])

  const project = createTemplateTasks('project')
  assert.equal(project[0].status, 'week')
  assert.deepEqual(project.map((task) => task.checklist.length), [0, 0, 0, 0])

  const coursework = createTemplateTasks('coursework')
  assert.deepEqual(coursework.map((task) => task.checklist.length), [0, 0, 0, 0])

  const daily = createTemplateTasks('daily')
  assert.equal(daily[0].status, 'doing')
  assert.deepEqual(daily.map((task) => task.checklist.length), [0, 0, 0])
  assert.ok(daily.every((task) => task.startDate === task.dueDate))
})
