import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Task } from '../src/types.ts'
import {
  areaBreakdown,
  attentionList,
  buildReport,
  checklistByArea,
  dayNumber,
  dueCalendar,
  estimateBuckets,
  filterByRange,
  forecastLoad,
  overdueAging,
  priorityStatusMatrix,
  riskLevel,
  statusFunnel,
  summarize,
  tagStats,
  weekdayLoad,
  weekdayOf,
  weeklyDelivery,
} from '../src/insights.ts'

// 2026-03-04 is a Wednesday.
const TODAY = '2026-03-04'

let seq = 0
const task = (patch: Partial<Task> = {}): Task => ({
  id: `t${++seq}`,
  title: `Task ${seq}`,
  area: 'Study',
  status: 'backlog',
  priority: 'medium',
  startDate: '',
  dueDate: '',
  reminderAt: '',
  reminderMins: 0,
  estimateHours: 0,
  progress: 0,
  tags: [],
  notes: '',
  checklist: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  ...patch,
} as Task)

test('date helpers reject invalid dates and know weekdays', () => {
  assert.equal(dayNumber('2026-02-30'), undefined)
  assert.equal(dayNumber('nope'), undefined)
  assert.equal(dayNumber(undefined), undefined)
  assert.equal(weekdayOf(dayNumber(TODAY)!), 3)
  assert.equal(weekdayOf(dayNumber('1970-01-01')!), 4)
})

test('riskLevel classifies overdue / high risk / due soon', () => {
  assert.equal(riskLevel(task({ dueDate: '2026-03-01' }), TODAY), 'Overdue')
  assert.equal(riskLevel(task({ dueDate: '2026-03-06', priority: 'high' }), TODAY), 'High risk')
  assert.equal(riskLevel(task({ dueDate: '2026-03-07' }), TODAY), 'Due soon')
  assert.equal(riskLevel(task({ dueDate: '2026-03-20' }), TODAY), 'Normal')
  assert.equal(riskLevel(task({ dueDate: '2026-03-01', status: 'done' }), TODAY), 'Done')
})

test('filterByRange keeps tasks whose schedule overlaps the window', () => {
  const inside = task({ dueDate: '2026-03-08' })
  const spanning = task({ startDate: '2026-01-01', dueDate: '2026-06-01' })
  const outside = task({ dueDate: '2026-05-01' })
  const undated = task()
  const kept = filterByRange([inside, spanning, outside, undated], 7, TODAY)
  assert.deepEqual(kept.map((t) => t.id), [inside.id, spanning.id])
  assert.equal(filterByRange([inside, undated], 'all', TODAY).length, 2)
})

test('summarize computes KPIs', () => {
  const tasks = [
    task({ status: 'done', estimateHours: 2, tags: ['a'] }),
    task({ status: 'doing', estimateHours: 4, dueDate: '2026-03-01', priority: 'high', checklist: [{ id: 'c1', text: 'x', done: true }, { id: 'c2', text: 'y', done: false }] }),
    task({ status: 'backlog', dueDate: '2026-03-05' }),
  ]
  const s = summarize(tasks, TODAY)
  assert.equal(s.total, 3)
  assert.equal(s.done, 1)
  assert.equal(s.completionRate, 33)
  assert.equal(s.totalHours, 6)
  assert.equal(s.overdue, 1)
  assert.equal(s.overdueRate, 50)
  assert.equal(s.dueSoon, 1)
  assert.equal(s.highOpen, 1)
  assert.equal(s.checklistRate, 50)
  assert.equal(s.untagged, 2)
  assert.equal(s.unscheduled, 1)
  // doing = max(45, 50% checklist) → 2h remaining of 4h
  assert.equal(s.remainingHours, 2)
  assert.deepEqual(summarize([], TODAY).completionRate, 0)
})

test('statusFunnel and matrix are zero-filled', () => {
  const tasks = [task({ status: 'doing', priority: 'high', estimateHours: 3 })]
  const funnel = statusFunnel(tasks)
  assert.equal(funnel.length, 5)
  assert.deepEqual(funnel.find((s) => s.status === 'doing'), { status: 'doing', label: 'In Progress', count: 1, hours: 3 })
  const matrix = priorityStatusMatrix(tasks)
  assert.equal(matrix.length, 15)
  assert.equal(matrix.reduce((sum, cell) => sum + cell.count, 0), 1)
})

test('areaBreakdown groups and sorts areas', () => {
  const tasks = [
    task({ area: 'Math', status: 'done' }),
    task({ area: 'Math', dueDate: '2026-03-01' }),
    task({ area: 'Art' }),
    task({ area: '  ' }),
  ]
  const areas = areaBreakdown(tasks, TODAY)
  assert.deepEqual(areas.map((a) => a.area), ['Math', 'Art', 'Unassigned'])
  assert.equal(areas[0].done, 1)
  assert.equal(areas[0].overdue, 1)
  assert.match(areas[0].color, /^#/)
})

test('tagStats merges case and counts once per task', () => {
  const tags = tagStats([task({ tags: ['Exam', 'exam', ' '] }), task({ tags: ['EXAM', 'read'], status: 'done' })])
  assert.deepEqual(tags.map((t) => [t.tag, t.count, t.done]), [['Exam', 2, 1], ['read', 1, 1]])
  assert.equal(tagStats([task({ tags: ['a', 'b'] })], 1).length, 1)
})

test('estimate buckets and overdue aging', () => {
  const buckets = estimateBuckets([task(), task({ estimateHours: 1 }), task({ estimateHours: 3 }), task({ estimateHours: 20 })])
  assert.deepEqual(buckets.map((b) => b.count), [1, 1, 0, 1, 0, 1])
  const aging = overdueAging([task({ dueDate: '2026-03-03' }), task({ dueDate: '2026-02-01' }), task({ dueDate: '2026-02-01', status: 'done' })], TODAY)
  assert.deepEqual(aging.map((b) => b.count), [1, 0, 0, 1])
})

test('checklistByArea skips areas without items', () => {
  const stats = checklistByArea([task({ area: 'A', checklist: [{ id: '1', text: 'x', done: true }] }), task({ area: 'B' })])
  assert.deepEqual(stats.map((s) => [s.area, s.rate]), [['A', 100]])
})

test('dueCalendar is zero-filled across the window', () => {
  const days = dueCalendar([task({ dueDate: '2026-03-05', estimateHours: 2 }), task({ dueDate: '2026-04-01' })], TODAY, '2026-03-10')
  assert.equal(days.length, 7)
  assert.deepEqual(days[1], { date: '2026-03-05', count: 1, open: 1, hours: 2 })
  assert.deepEqual(dueCalendar([], '2026-03-10', TODAY), [])
})

test('weeklyDelivery buckets by due week (Monday start)', () => {
  const weeks = weeklyDelivery([task({ dueDate: '2026-03-02', status: 'done' }), task({ dueDate: '2026-03-08' }), task({ dueDate: '2026-03-09' })], TODAY, 1, 1)
  assert.deepEqual(weeks.map((w) => w.weekStart), ['2026-02-23', '2026-03-02', '2026-03-09'])
  assert.deepEqual(weeks.map((w) => [w.done, w.open]), [[0, 0], [1, 1], [0, 1]])
  const sunday = weeklyDelivery([task({ dueDate: '2026-03-08' })], TODAY, 0, 1, 'Sunday')
  assert.deepEqual(sunday.map((w) => [w.weekStart, w.due]), [['2026-03-01', 0], ['2026-03-08', 1]])
})

test('weekdayLoad respects week start', () => {
  const tasks = [task({ dueDate: TODAY })]
  assert.equal(weekdayLoad(tasks, 'Monday')[0].weekday, 'Mon')
  assert.equal(weekdayLoad(tasks, 'Monday')[2].count, 1)
  assert.equal(weekdayLoad(tasks, 'Sunday')[3].count, 1)
})

test('forecastLoad spreads remaining hours and separates overdue/later/unscheduled', () => {
  const tasks = [
    task({ estimateHours: 4, dueDate: '2026-03-05' }), // 2 days → 2h/day
    task({ estimateHours: 3, dueDate: '2026-03-01' }), // overdue
    task({ estimateHours: 5 }), // unscheduled
    task({ estimateHours: 10, startDate: '2026-03-06', dueDate: '2026-03-10' }), // 2h/day, 2 days beyond horizon 5
    task({ estimateHours: 8, dueDate: '2026-03-05', status: 'done' }),
  ]
  const forecast = forecastLoad(tasks, TODAY, 5)
  assert.deepEqual(forecast.days.map((d) => d.hours), [2, 2, 2, 2, 2])
  assert.equal(forecast.overdueHours, 3)
  assert.equal(forecast.overdueTasks, 1)
  assert.equal(forecast.unscheduledHours, 5)
  assert.equal(forecast.laterHours, 4)
  const total = forecast.days.reduce((s, d) => s + d.hours, 0) + forecast.overdueHours + forecast.laterHours + forecast.unscheduledHours
  assert.equal(total, 4 + 3 + 5 + 10)
})

test('attentionList orders by risk then due date', () => {
  const soon = task({ title: 'soon', dueDate: '2026-03-06' })
  const late = task({ title: 'late', dueDate: '2026-03-02' })
  const hot = task({ title: 'hot', dueDate: '2026-03-05', priority: 'high' })
  const fine = task({ title: 'fine', dueDate: '2026-04-01' })
  const items = attentionList([soon, late, hot, fine], TODAY)
  assert.deepEqual(items.map((i) => [i.title, i.daysLeft]), [['late', -2], ['hot', 1], ['soon', 2]])
  assert.equal(attentionList([soon, late, hot], TODAY, 1).length, 1)
})

test('buildReport renders markdown with areas and attention', () => {
  const report = buildReport([task({ area: 'A|B', dueDate: '2026-03-01' })], TODAY, 'All areas', 14)
  assert.match(report, /^# CJ Board report — 2026-03-04/)
  assert.match(report, /Window: ±14 days/)
  assert.match(report, /\| A\/B \| 1 \|/)
  assert.match(report, /\[Overdue\] .* 3d late/)
})
