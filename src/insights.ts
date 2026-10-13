// Insights analytics: pure data shaping for the Insights page.
// Pure module: only type imports + colors.ts, so it runs under plain `node --test`.
// All dates are 'YYYY-MM-DD' strings and all date math is done in UTC day numbers,
// which keeps results independent of the machine time zone.

import type { Priority, Status, Task } from './types.ts'
import { areaColor } from './colors.ts'

export type InsightRange = 7 | 14 | 30 | 90 | 'all'
export const INSIGHT_RANGES: InsightRange[] = [7, 14, 30, 90, 'all']

export const STATUS_ORDER: Status[] = ['backlog', 'week', 'doing', 'review', 'done']
export const STATUS_LABELS: Record<Status, string> = {
  backlog: 'Backlog',
  week: 'This Week',
  doing: 'In Progress',
  review: 'Review',
  done: 'Done',
}
export const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low']
export const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' }

const STATUS_PROGRESS: Record<Status, number> = { backlog: 0, week: 18, doing: 45, review: 82, done: 100 }
const DAY_MS = 86_400_000
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ---------- date helpers ----------

/** UTC day number for a 'YYYY-MM-DD…' string, or undefined when it is not a real date. */
export const dayNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return undefined
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const time = Date.UTC(year, month - 1, day)
  const check = new Date(time)
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return undefined
  return Math.floor(time / DAY_MS)
}

export const isoFromDayNumber = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10)

export const addDays = (iso: string, amount: number) => isoFromDayNumber((dayNumber(iso) ?? 0) + amount)

/** 0 = Sunday … 6 = Saturday. */
export const weekdayOf = (day: number) => (((day + 4) % 7) + 7) % 7

/** First day of the week containing `day`. */
export const weekStartOf = (day: number, weekStartsOn: 'Sunday' | 'Monday' = 'Monday') => {
  const weekday = weekdayOf(day)
  return day - (weekStartsOn === 'Monday' ? (weekday + 6) % 7 : weekday)
}

const round1 = (value: number) => Math.round(value * 10) / 10
const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)
const hoursOf = (task: Task) => {
  const hours = Number(task.estimateHours)
  return Number.isFinite(hours) && hours > 0 ? hours : 0
}

// ---------- per-task metrics (mirrors utils.ts, kept local so this module stays pure) ----------

export const taskProgress = (task: Task): number => {
  if (task.status === 'done') return 100
  const checklist = Array.isArray(task.checklist) ? task.checklist : []
  const checklistPercent = checklist.length ? percent(checklist.filter((item) => item.done).length, checklist.length) : 0
  return Math.max(STATUS_PROGRESS[task.status] ?? 0, checklistPercent)
}

export const remainingHours = (task: Task) => hoursOf(task) * (1 - taskProgress(task) / 100)

export type RiskLevel = 'Done' | 'Overdue' | 'High risk' | 'Due soon' | 'Normal'

export const riskLevel = (task: Task, today: string): RiskLevel => {
  if (task.status === 'done') return 'Done'
  const due = dayNumber(task.dueDate)
  const now = dayNumber(today)
  if (due === undefined || now === undefined) return 'Normal'
  const diff = due - now
  if (diff < 0) return 'Overdue'
  if (task.priority === 'high' && diff <= 2) return 'High risk'
  if (diff <= 3) return 'Due soon'
  return 'Normal'
}

// ---------- range filter ----------

/**
 * Keep tasks whose schedule touches the window [today - days, today + days].
 * A task's schedule is startDate…dueDate (either may be missing). Tasks with no
 * usable date are kept only for 'all', because they cannot be placed in time.
 */
export const filterByRange = (tasks: Task[], range: InsightRange, today: string): Task[] => {
  if (range === 'all') return tasks
  const now = dayNumber(today)
  if (now === undefined) return tasks
  const from = now - range
  const to = now + range
  return tasks.filter((task) => {
    const due = dayNumber(task.dueDate)
    const start = dayNumber(task.startDate)
    const first = start ?? due
    const last = due ?? start
    if (first === undefined || last === undefined) return false
    return Math.min(first, last) <= to && Math.max(first, last) >= from
  })
}

export const rangeLabel = (range: InsightRange) => (range === 'all' ? 'All time' : `±${range} days`)

// ---------- summary KPIs ----------

export type InsightSummary = {
  total: number
  done: number
  open: number
  completionRate: number
  avgProgress: number
  totalHours: number
  remainingHours: number
  overdue: number
  overdueRate: number
  dueSoon: number
  highOpen: number
  checklistTotal: number
  checklistDone: number
  checklistRate: number
  avgEstimate: number
  untagged: number
  unscheduled: number
}

export const summarize = (tasks: Task[], today: string): InsightSummary => {
  const done = tasks.filter((task) => task.status === 'done').length
  const open = tasks.length - done
  const totalHours = tasks.reduce((sum, task) => sum + hoursOf(task), 0)
  const weighted = tasks.reduce((sum, task) => sum + taskProgress(task) * (hoursOf(task) || 1), 0)
  const weight = tasks.reduce((sum, task) => sum + (hoursOf(task) || 1), 0)
  const risks = tasks.map((task) => riskLevel(task, today))
  const overdue = risks.filter((risk) => risk === 'Overdue').length
  const checklistTotal = tasks.reduce((sum, task) => sum + (task.checklist?.length ?? 0), 0)
  const checklistDone = tasks.reduce((sum, task) => sum + (task.checklist?.filter((item) => item.done).length ?? 0), 0)
  return {
    total: tasks.length,
    done,
    open,
    completionRate: percent(done, tasks.length),
    avgProgress: weight ? Math.round(weighted / weight) : 0,
    totalHours: round1(totalHours),
    remainingHours: round1(tasks.reduce((sum, task) => sum + remainingHours(task), 0)),
    overdue,
    overdueRate: percent(overdue, open),
    dueSoon: risks.filter((risk) => risk === 'Due soon' || risk === 'High risk').length,
    highOpen: tasks.filter((task) => task.priority === 'high' && task.status !== 'done').length,
    checklistTotal,
    checklistDone,
    checklistRate: percent(checklistDone, checklistTotal),
    avgEstimate: tasks.length ? round1(totalHours / tasks.length) : 0,
    untagged: tasks.filter((task) => !task.tags?.length).length,
    unscheduled: tasks.filter((task) => dayNumber(task.dueDate) === undefined).length,
  }
}

// ---------- distributions ----------

export type StatusCount = { status: Status; label: string; count: number; hours: number }

export const statusFunnel = (tasks: Task[]): StatusCount[] =>
  STATUS_ORDER.map((status) => {
    const matching = tasks.filter((task) => task.status === status)
    return { status, label: STATUS_LABELS[status], count: matching.length, hours: round1(matching.reduce((sum, task) => sum + hoursOf(task), 0)) }
  })

export type MatrixCell = { priority: Priority; status: Status; count: number }

/** Priority × status counts, always 3 × 5 cells (zero-filled). */
export const priorityStatusMatrix = (tasks: Task[]): MatrixCell[] =>
  PRIORITY_ORDER.flatMap((priority) =>
    STATUS_ORDER.map((status) => ({
      priority,
      status,
      count: tasks.filter((task) => task.priority === priority && task.status === status).length,
    })),
  )

export type AreaStat = {
  area: string
  color: string
  count: number
  done: number
  open: number
  hours: number
  remainingHours: number
  avgProgress: number
  overdue: number
}

/** Per-area rollup, sorted by task count (desc) then name. */
export const areaBreakdown = (tasks: Task[], today: string): AreaStat[] => {
  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    const area = task.area?.trim() || 'Unassigned'
    groups.set(area, [...(groups.get(area) ?? []), task])
  }
  return [...groups.entries()]
    .map(([area, items]) => {
      const done = items.filter((task) => task.status === 'done').length
      return {
        area,
        color: areaColor(area),
        count: items.length,
        done,
        open: items.length - done,
        hours: round1(items.reduce((sum, task) => sum + hoursOf(task), 0)),
        remainingHours: round1(items.reduce((sum, task) => sum + remainingHours(task), 0)),
        avgProgress: Math.round(items.reduce((sum, task) => sum + taskProgress(task), 0) / items.length),
        overdue: items.filter((task) => riskLevel(task, today) === 'Overdue').length,
      }
    })
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area))
}

export type TagStat = { tag: string; count: number; done: number; open: number; hours: number }

/** Tag usage (case-insensitive merge, first spelling wins), top `limit` by count. */
export const tagStats = (tasks: Task[], limit = 12): TagStat[] => {
  const stats = new Map<string, TagStat>()
  for (const task of tasks) {
    const seen = new Set<string>()
    for (const raw of task.tags ?? []) {
      const tag = String(raw).trim()
      const key = tag.toLowerCase()
      if (!tag || seen.has(key)) continue
      seen.add(key)
      const entry = stats.get(key) ?? { tag, count: 0, done: 0, open: 0, hours: 0 }
      entry.count += 1
      if (task.status === 'done') entry.done += 1
      else entry.open += 1
      entry.hours = round1(entry.hours + hoursOf(task))
      stats.set(key, entry)
    }
  }
  return [...stats.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)).slice(0, Math.max(0, limit))
}

export type Bucket = { label: string; count: number }

const ESTIMATE_BUCKETS: { label: string; max: number }[] = [
  { label: 'No estimate', max: 0 },
  { label: '≤ 1h', max: 1 },
  { label: '1–2h', max: 2 },
  { label: '2–4h', max: 4 },
  { label: '4–8h', max: 8 },
  { label: '> 8h', max: Number.POSITIVE_INFINITY },
]

export const estimateBuckets = (tasks: Task[]): Bucket[] => {
  const counts = ESTIMATE_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 }))
  for (const task of tasks) {
    const hours = hoursOf(task)
    const index = ESTIMATE_BUCKETS.findIndex((bucket) => hours <= bucket.max)
    counts[index].count += 1
  }
  return counts
}

const AGING_BUCKETS: { label: string; max: number }[] = [
  { label: '1–3 days', max: 3 },
  { label: '4–7 days', max: 7 },
  { label: '8–14 days', max: 14 },
  { label: '15+ days', max: Number.POSITIVE_INFINITY },
]

/** How late the open, overdue tasks are. */
export const overdueAging = (tasks: Task[], today: string): Bucket[] => {
  const counts = AGING_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 }))
  const now = dayNumber(today)
  if (now === undefined) return counts
  for (const task of tasks) {
    if (task.status === 'done') continue
    const due = dayNumber(task.dueDate)
    if (due === undefined || due >= now) continue
    const late = now - due
    counts[AGING_BUCKETS.findIndex((bucket) => late <= bucket.max)].count += 1
  }
  return counts
}

export type ChecklistStat = { area: string; color: string; total: number; done: number; rate: number }

/** Checklist completion per area (areas without checklist items are omitted). */
export const checklistByArea = (tasks: Task[]): ChecklistStat[] => {
  const stats = new Map<string, ChecklistStat>()
  for (const task of tasks) {
    const items = task.checklist ?? []
    if (!items.length) continue
    const area = task.area?.trim() || 'Unassigned'
    const entry = stats.get(area) ?? { area, color: areaColor(area), total: 0, done: 0, rate: 0 }
    entry.total += items.length
    entry.done += items.filter((item) => item.done).length
    entry.rate = percent(entry.done, entry.total)
    stats.set(area, entry)
  }
  return [...stats.values()].sort((a, b) => b.total - a.total || a.area.localeCompare(b.area))
}

// ---------- time series ----------

export type DueDay = { date: string; count: number; open: number; hours: number }

/** Tasks due per day for every day in [from, to] (zero-filled). */
export const dueCalendar = (tasks: Task[], from: string, to: string): DueDay[] => {
  const start = dayNumber(from)
  const end = dayNumber(to)
  if (start === undefined || end === undefined || end < start) return []
  const days: DueDay[] = []
  for (let day = start; day <= end; day += 1) days.push({ date: isoFromDayNumber(day), count: 0, open: 0, hours: 0 })
  for (const task of tasks) {
    const due = dayNumber(task.dueDate)
    if (due === undefined || due < start || due > end) continue
    const entry = days[due - start]
    entry.count += 1
    if (task.status !== 'done') entry.open += 1
    entry.hours = round1(entry.hours + hoursOf(task))
  }
  return days
}

export type WeekStat = { weekStart: string; label: string; due: number; done: number; open: number; hours: number }

/**
 * Tasks grouped by the week of their due date, for `weeksBack` weeks before and
 * `weeksAhead` weeks after the current week. `done` = due that week and finished.
 */
export const weeklyDelivery = (
  tasks: Task[],
  today: string,
  weeksBack = 4,
  weeksAhead = 3,
  weekStartsOn: 'Sunday' | 'Monday' = 'Monday',
): WeekStat[] => {
  const now = dayNumber(today)
  if (now === undefined) return []
  const current = weekStartOf(now, weekStartsOn)
  const first = current - weeksBack * 7
  const total = weeksBack + weeksAhead + 1
  const weeks: WeekStat[] = Array.from({ length: total }, (_, index) => {
    const weekStart = isoFromDayNumber(first + index * 7)
    return { weekStart, label: weekStart.slice(5), due: 0, done: 0, open: 0, hours: 0 }
  })
  for (const task of tasks) {
    const due = dayNumber(task.dueDate)
    if (due === undefined) continue
    const index = (weekStartOf(due, weekStartsOn) - first) / 7
    if (index < 0 || index >= total) continue
    const week = weeks[index]
    week.due += 1
    if (task.status === 'done') week.done += 1
    else week.open += 1
    week.hours = round1(week.hours + hoursOf(task))
  }
  return weeks
}

export type WeekdayStat = { weekday: string; count: number; hours: number }

/** Due-date load by weekday, ordered from the configured first day of the week. */
export const weekdayLoad = (tasks: Task[], weekStartsOn: 'Sunday' | 'Monday' = 'Monday'): WeekdayStat[] => {
  const stats = WEEKDAYS.map((weekday) => ({ weekday, count: 0, hours: 0 }))
  for (const task of tasks) {
    const due = dayNumber(task.dueDate)
    if (due === undefined) continue
    const entry = stats[weekdayOf(due)]
    entry.count += 1
    entry.hours = round1(entry.hours + hoursOf(task))
  }
  return weekStartsOn === 'Monday' ? [...stats.slice(1), stats[0]] : stats
}

export type ForecastDay = { date: string; hours: number; tasks: number }
export type Forecast = { days: ForecastDay[]; overdueHours: number; overdueTasks: number; laterHours: number; unscheduledHours: number }

/**
 * Remaining hours of open tasks spread evenly over each task's remaining working
 * window (max(start, today) … due) for the next `horizon` days.
 * Overdue work is reported separately instead of being hidden in day one.
 */
export const forecastLoad = (tasks: Task[], today: string, horizon = 14): Forecast => {
  const now = dayNumber(today)
  const empty: Forecast = { days: [], overdueHours: 0, overdueTasks: 0, laterHours: 0, unscheduledHours: 0 }
  if (now === undefined || horizon <= 0) return empty
  const raw = Array.from({ length: horizon }, (_, index) => ({ date: isoFromDayNumber(now + index), hours: 0, tasks: 0 }))
  let overdueHours = 0
  let overdueTasks = 0
  let laterHours = 0
  let unscheduledHours = 0
  for (const task of tasks) {
    if (task.status === 'done') continue
    const remaining = remainingHours(task)
    const due = dayNumber(task.dueDate)
    if (due === undefined) {
      unscheduledHours += remaining
      continue
    }
    if (due < now) {
      overdueHours += remaining
      overdueTasks += 1
      continue
    }
    const start = Math.min(due, Math.max(now, dayNumber(task.startDate) ?? now))
    const perDay = remaining / (due - start + 1)
    for (let day = start; day <= due; day += 1) {
      const index = day - now
      if (index >= horizon) {
        laterHours += perDay
        continue
      }
      raw[index].hours += perDay
      raw[index].tasks += 1
    }
  }
  return {
    days: raw.map((day) => ({ ...day, hours: round1(day.hours) })),
    overdueHours: round1(overdueHours),
    overdueTasks,
    laterHours: round1(laterHours),
    unscheduledHours: round1(unscheduledHours),
  }
}

// ---------- attention list + report ----------

export type AttentionItem = { id: string; title: string; area: string; risk: RiskLevel; dueDate: string; daysLeft: number | null; progress: number }

const RISK_RANK: Record<RiskLevel, number> = { Overdue: 0, 'High risk': 1, 'Due soon': 2, Normal: 3, Done: 4 }

/** Open tasks that need attention first: overdue → high risk → due soon, earliest due first. */
export const attentionList = (tasks: Task[], today: string, limit = 6): AttentionItem[] => {
  const now = dayNumber(today)
  return tasks
    .map((task) => {
      const due = dayNumber(task.dueDate)
      return {
        id: task.id,
        title: task.title,
        area: task.area,
        risk: riskLevel(task, today),
        dueDate: task.dueDate,
        daysLeft: due === undefined || now === undefined ? null : due - now,
        progress: taskProgress(task),
      }
    })
    .filter((item) => item.risk === 'Overdue' || item.risk === 'High risk' || item.risk === 'Due soon')
    .sort((a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk] || (a.daysLeft ?? 0) - (b.daysLeft ?? 0) || a.title.localeCompare(b.title))
    .slice(0, Math.max(0, limit))
}

/** Plain-Markdown status report for pasting into a doc or chat. */
export const buildReport = (tasks: Task[], today: string, scope = 'All areas', range: InsightRange = 'all'): string => {
  const summary = summarize(tasks, today)
  const lines = [
    `# CJ Board report — ${today}`,
    '',
    `Scope: ${scope} · Window: ${rangeLabel(range)}`,
    '',
    '## Summary',
    `- Tasks: ${summary.total} (${summary.done} done, ${summary.open} open, ${summary.completionRate}% complete)`,
    `- Weighted progress: ${summary.avgProgress}%`,
    `- Hours: ${summary.totalHours}h planned, ${summary.remainingHours}h remaining`,
    `- Risk: ${summary.overdue} overdue, ${summary.dueSoon} due soon, ${summary.highOpen} high priority open`,
    `- Checklist: ${summary.checklistDone}/${summary.checklistTotal} items (${summary.checklistRate}%)`,
  ]
  const areas = areaBreakdown(tasks, today)
  if (areas.length) {
    lines.push('', '## By area', '| Area | Tasks | Done | Hours | Remaining | Progress | Overdue |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |')
    for (const area of areas) {
      lines.push(`| ${area.area.replace(/\|/g, '/')} | ${area.count} | ${area.done} | ${area.hours}h | ${area.remainingHours}h | ${area.avgProgress}% | ${area.overdue} |`)
    }
  }
  const attention = attentionList(tasks, today, 10)
  if (attention.length) {
    lines.push('', '## Needs attention')
    for (const item of attention) {
      const when = item.daysLeft === null ? '' : item.daysLeft < 0 ? `${-item.daysLeft}d late` : item.daysLeft === 0 ? 'due today' : `due in ${item.daysLeft}d`
      lines.push(`- [${item.risk}] ${item.title} (${item.area}) — ${when}, ${item.progress}%`)
    }
  }
  return lines.join('\n')
}
