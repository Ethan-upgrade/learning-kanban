import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, InputNumber, Radio, Tag } from '@arco-design/web-react'
import { format } from 'date-fns'
import { Activity, CalendarDays, ClipboardCopy, Gauge, LayoutDashboard, PieChart } from 'lucide-react'
import { buildCharts } from '../components/chartBuilders'
import { ChartCard } from '../components/common'
import {
  INSIGHT_COLORS,
  areaProgressOption,
  areaTreemapOption,
  bucketOption,
  checklistOption,
  dueCalendarOption,
  forecastOption,
  funnelOption,
  matrixOption,
  tagOption,
  weekdayOption,
  weeklyOption,
} from '../components/insightCharts'
import {
  INSIGHT_RANGES,
  PRIORITY_ORDER,
  STATUS_ORDER,
  addDays,
  areaBreakdown,
  attentionList,
  buildReport,
  checklistByArea,
  dayNumber,
  dueCalendar,
  estimateBuckets,
  filterByRange,
  forecastLoad,
  isoFromDayNumber,
  overdueAging,
  priorityStatusMatrix,
  rangeLabel,
  statusFunnel,
  summarize,
  tagStats,
  weekStartOf,
  weekdayLoad,
  weeklyDelivery,
} from '../insights'
import type { InsightRange, RiskLevel } from '../insights'
import type { InsightsSection, Status } from '../types'
import type { BoardData } from '../hooks/useBoardData'
import { PageHeader, SubNav } from './PageHeader'

const sections: { key: InsightsSection; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
  { key: 'progress', label: 'Progress', icon: <Activity size={15} /> },
  { key: 'workload', label: 'Workload', icon: <Gauge size={15} /> },
  { key: 'distribution', label: 'Distribution', icon: <PieChart size={15} /> },
  { key: 'schedule', label: 'Schedule', icon: <CalendarDays size={15} /> },
]

const RANGE_KEY = 'cj-board-insights-range-v1'
const CAPACITY_KEY = 'cj-board-insights-capacity-v1'

const loadRange = (): InsightRange => {
  try {
    const raw = localStorage.getItem(RANGE_KEY)
    const value = raw === 'all' ? 'all' : Number(raw)
    return INSIGHT_RANGES.includes(value as InsightRange) ? (value as InsightRange) : 'all'
  } catch {
    return 'all'
  }
}

const loadCapacity = () => {
  try {
    const value = Number(localStorage.getItem(CAPACITY_KEY))
    return Number.isFinite(value) && value > 0 && value <= 24 ? value : 4
  } catch {
    return 4
  }
}

const riskTagColor: Record<RiskLevel, string> = {
  Overdue: 'red',
  'High risk': 'orangered',
  'Due soon': 'orange',
  Normal: 'gray',
  Done: 'green',
}

const dueText = (daysLeft: number | null) => {
  if (daysLeft === null) return 'No due date'
  if (daysLeft < 0) return `${-daysLeft}d overdue`
  if (daysLeft === 0) return 'Due today'
  return `Due in ${daysLeft}d`
}

const round1 = (value: number) => Math.round(value * 10) / 10

export function InsightsPage({ data, section, onSectionChange, onOpenTasks, onOpenTask }: {
  data: BoardData
  section: InsightsSection
  onSectionChange: (section: InsightsSection) => void
  /** Jump to the task table (filters are set before this is called). */
  onOpenTasks: () => void
  onOpenTask: (taskId: string) => void
}) {
  const [range, setRange] = useState<InsightRange>(loadRange)
  const [capacity, setCapacity] = useState<number>(loadCapacity)

  useEffect(() => {
    try { localStorage.setItem(RANGE_KEY, String(range)) } catch { /* storage unavailable */ }
  }, [range])
  useEffect(() => {
    try { localStorage.setItem(CAPACITY_KEY, String(capacity)) } catch { /* storage unavailable */ }
  }, [capacity])

  const today = format(new Date(), 'yyyy-MM-dd')
  const weekStartsOn = data.appSettings.weekStartsOn
  const allTasks = data.filteredTasks
  const tasks = useMemo(() => filterByRange(allTasks, range, today), [allTasks, range, today])
  const hiddenByRange = allTasks.length - tasks.length

  const charts = useMemo(() => buildCharts(tasks), [tasks])
  const summary = useMemo(() => summarize(tasks, today), [tasks, today])
  const attention = useMemo(() => attentionList(tasks, today, 6), [tasks, today])
  const areas = useMemo(() => areaBreakdown(tasks, today), [tasks, today])
  const tags = useMemo(() => tagStats(tasks, 12), [tasks])
  const forecast = useMemo(() => forecastLoad(tasks, today, 14), [tasks, today])
  const weeks = useMemo(() => weeklyDelivery(tasks, today, 4, 3, weekStartsOn), [tasks, today, weekStartsOn])
  const currentWeek = isoFromDayNumber(weekStartOf(dayNumber(today) ?? 0, weekStartsOn))
  const calendarDays = useMemo(() => dueCalendar(tasks, addDays(today, -28), addDays(today, 84)), [tasks, today])

  const options = useMemo(() => ({
    funnel: funnelOption(statusFunnel(tasks)),
    matrix: matrixOption(priorityStatusMatrix(tasks)),
    calendar: dueCalendarOption(calendarDays),
    weekly: weeklyOption(weeks, currentWeek),
    treemap: areaTreemapOption(areas),
    areaProgress: areaProgressOption(areas),
    tags: tagOption(tags),
    estimates: bucketOption(estimateBuckets(tasks), INSIGHT_COLORS.indigo),
    aging: bucketOption(overdueAging(tasks, today), INSIGHT_COLORS.red, 'Overdue tasks'),
    weekday: weekdayOption(weekdayLoad(tasks, weekStartsOn)),
    checklist: checklistOption(checklistByArea(tasks)),
  }), [tasks, today, calendarDays, weeks, currentWeek, areas, tags, weekStartsOn])
  const forecastChart = useMemo(() => forecastOption(forecast, capacity), [forecast, capacity])

  const overloadedDays = forecast.days.filter((day) => day.hours > capacity).length
  const forecastHours = round1(forecast.days.reduce((sum, day) => sum + day.hours, 0))
  const scope = data.area === 'All' ? 'All areas' : data.area

  // --- click-through: set task filters, then open the task table -------------
  const openStatus = (status: Status) => {
    data.setStatusFilter(status)
    data.setPriorityFilter('all')
    onOpenTasks()
  }
  const funnelEvents = {
    click: (params: { data?: { status?: Status } }) => {
      if (params.data?.status) openStatus(params.data.status)
    },
  }
  const matrixEvents = {
    click: (params: { data?: [number, number, number] }) => {
      const cell = params.data
      if (!Array.isArray(cell)) return
      const status = STATUS_ORDER[cell[0]]
      const priority = PRIORITY_ORDER[cell[1]]
      if (!status || !priority) return
      data.setStatusFilter(status)
      data.setPriorityFilter(priority)
      onOpenTasks()
    },
  }
  const treemapEvents = {
    click: (params: { data?: { stat?: { area: string } } }) => {
      const area = params.data?.stat?.area
      if (!area) return
      data.setArea(area)
      data.setToast(`Scoped to ${area}`)
    },
  }
  const tagEvents = {
    click: (params: { dataIndex?: number }) => {
      const tag = tags[params.dataIndex ?? -1]
      if (!tag) return
      data.setTagFilter(tag.tag)
      onOpenTasks()
    },
  }

  const copyReport = async () => {
    const report = buildReport(tasks, today, scope, range)
    try {
      await navigator.clipboard.writeText(report)
      data.setToast('Status report copied as Markdown')
    } catch {
      data.setToast('Clipboard is unavailable in this window')
    }
  }

  const riskCount = summary.overdue + summary.dueSoon

  return (
    <section className="pageBody chartsPanel analyticsDashboard">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description={`${scope} · ${rangeLabel(range)} · ${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
        actions={(
          <>
            <Radio.Group
              type="button"
              size="small"
              className="insightRange"
              value={range}
              onChange={(value: InsightRange) => setRange(value)}
              aria-label="Time range"
            >
              {INSIGHT_RANGES.map((item) => (
                <Radio key={String(item)} value={item}>{item === 'all' ? 'All' : `${item}d`}</Radio>
              ))}
            </Radio.Group>
            <Button size="small" icon={<ClipboardCopy size={14} />} onClick={copyReport}>Copy report</Button>
          </>
        )}
      />
      <SubNav label="Insight sections" items={sections} active={section} onChange={onSectionChange} />

      {hiddenByRange > 0 && (
        <div className="insightScopeNote">
          {hiddenByRange} task{hiddenByRange === 1 ? '' : 's'} outside {rangeLabel(range)} (or without dates) {hiddenByRange === 1 ? 'is' : 'are'} hidden.
          <button type="button" onClick={() => setRange('all')}>Show all</button>
        </div>
      )}

      {section === 'overview' && (
        <>
          <Alert
            type={summary.overdue ? 'warning' : 'success'}
            content={summary.overdue ? `${summary.overdue} items are overdue. Prioritize due-soon and high-risk work.` : 'No overdue items. Keep the current pace.'}
          />
          <div className="chartKpiGrid">
            <article className="chartKpi kpiBlue"><span>Total Tasks</span><strong>{summary.total}</strong><small>{summary.open} active</small></article>
            <article className="chartKpi kpiGreen"><span>Completed</span><strong>{summary.done}</strong><small>{summary.completionRate}% completion rate</small></article>
            <article className="chartKpi kpiOrange"><span>Progress</span><strong>{summary.avgProgress}%</strong><small>Weighted by estimated hours</small></article>
            <article className="chartKpi kpiRed"><span>Risk</span><strong>{riskCount}</strong><small>{summary.overdue} overdue · {summary.dueSoon} due soon</small></article>
            <article className="chartKpi kpiViolet"><span>Planned Hours</span><strong>{summary.totalHours}h</strong><small>{summary.remainingHours}h remaining</small></article>
            <article className="chartKpi kpiRed"><span>High Priority Open</span><strong>{summary.highOpen}</strong><small>{summary.overdueRate}% of open work is overdue</small></article>
            <article className="chartKpi kpiGreen"><span>Checklist</span><strong>{summary.checklistRate}%</strong><small>{summary.checklistDone}/{summary.checklistTotal} items done</small></article>
            <article className="chartKpi kpiBlue"><span>Avg Estimate</span><strong>{summary.avgEstimate}h</strong><small>Per task</small></article>
            <article className="chartKpi kpiOrange"><span>Next 14 Days</span><strong>{forecastHours}h</strong><small>{overloadedDays} day{overloadedDays === 1 ? '' : 's'} over {capacity}h capacity</small></article>
            <article className="chartKpi kpiViolet"><span>Hygiene</span><strong>{summary.unscheduled + summary.untagged}</strong><small>{summary.unscheduled} unscheduled · {summary.untagged} untagged</small></article>
          </div>
          <div className="chartGrid chartDashboardGrid">
            <article className="chartCard attentionCard">
              <div className="chartCardHeader">
                <h3>Needs Attention</h3>
                <span>Overdue, high-risk and due-soon work — click to open</span>
              </div>
              {attention.length ? (
                <ul className="attentionList">
                  {attention.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => onOpenTask(item.id)}>
                        <span className="attentionMain">
                          <strong>{item.title}</strong>
                          <small>{item.area} · {dueText(item.daysLeft)}</small>
                        </span>
                        <span className="attentionMeta">
                          <Tag size="small" color={riskTagColor[item.risk]}>{item.risk}</Tag>
                          <em>{item.progress}%</em>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="attentionEmpty">Nothing urgent in this scope.</p>
              )}
            </article>
            <ChartCard title="Workflow Funnel" subtitle="Tasks per stage — click a stage to open it in the table" option={options.funnel} onEvents={funnelEvents} />
            <ChartCard title="Stage Mix" subtitle="Proportion by workflow stage" option={charts.statusPie} />
            <ChartCard title="Progress Gauge" subtitle="Weighted task completion" option={charts.progressGauge} />
          </div>
        </>
      )}

      {section === 'progress' && (
        <div className="chartGrid chartDashboardGrid">
          <ChartCard title="Completion Trend" subtitle="Planned completion versus actual done" option={charts.burnupLine} className="chartWide" />
          <ChartCard title="Weekly Delivery" subtitle="Tasks by due week: done vs still open, with planned hours" option={options.weekly} />
          <ChartCard title="Area Health" subtitle="Average progress and hours left per area" option={options.areaProgress} height={Math.max(280, areas.length * 34 + 80)} />
          <ChartCard title="Daily Load" subtitle="Active items and due items by date" option={charts.loadLine} />
          <ChartCard title="Checklist Completion" subtitle="Checklist items done per area" option={options.checklist} />
        </div>
      )}

      {section === 'workload' && (
        <div className="chartGrid chartDashboardGrid">
          <ChartCard
            title="14-Day Workload Forecast"
            subtitle="Remaining hours spread evenly from today to each task's due date"
            option={forecastChart}
            className="chartWide"
          >
            <div className="chartFooter">
              <label className="capacityInput">
                Daily capacity
                <InputNumber size="mini" min={1} max={24} step={0.5} value={capacity} suffix="h" onChange={(value) => setCapacity(Number(value) || 4)} />
              </label>
              <span><b>{round1(forecast.overdueHours)}h</b> overdue ({forecast.overdueTasks} tasks)</span>
              <span><b>{round1(forecast.laterHours)}h</b> after 14 days</span>
              <span><b>{round1(forecast.unscheduledHours)}h</b> unscheduled</span>
              <span className={overloadedDays ? 'chartFooterWarn' : undefined}><b>{overloadedDays}</b> overloaded day{overloadedDays === 1 ? '' : 's'}</span>
            </div>
          </ChartCard>
          <ChartCard title="Hours by Area" subtitle="Sized by planned hours — click an area to scope the workspace" option={options.treemap} onEvents={treemapEvents} />
          <ChartCard title="Area Hours" subtitle="Estimated hours by area or Learning section" option={charts.areaBar} />
          <ChartCard title="Estimate Sizes" subtitle="How big tasks are — large ones are worth splitting" option={options.estimates} />
          <ChartCard title="Weekday Load" subtitle="Which weekdays your due dates pile up on" option={options.weekday} />
        </div>
      )}

      {section === 'distribution' && (
        <div className="chartGrid chartDashboardGrid">
          <ChartCard title="Priority × Stage" subtitle="Click a cell to open those tasks in the table" option={options.matrix} onEvents={matrixEvents} />
          <ChartCard title="Priority Split" subtitle="Open and closed task priority mix" option={charts.priorityPie} />
          <ChartCard title="Risk Profile" subtitle="Overdue, due soon, normal, and done" option={charts.riskBar} />
          <ChartCard title="Overdue Aging" subtitle="How late the open overdue tasks are" option={options.aging} />
          <ChartCard
            title="Top Tags"
            subtitle="Open vs done per tag — click a bar to filter the table"
            option={options.tags}
            className="chartWide"
            height={Math.max(260, tags.length * 28 + 80)}
            onEvents={tagEvents}
          />
        </div>
      )}

      {section === 'schedule' && (
        <div className="chartGrid chartDashboardGrid">
          <ChartCard
            title="Due-Date Calendar"
            subtitle="Tasks due per day, 4 weeks back to 12 weeks ahead"
            option={options.calendar}
            className="chartWide"
            height={230}
          />
          <ChartCard title="Weekly Delivery" subtitle="Tasks by due week: done vs still open, with planned hours" option={options.weekly} />
          <ChartCard title="Weekday Load" subtitle="Which weekdays your due dates pile up on" option={options.weekday} />
          <ChartCard title="Daily Load" subtitle="Active items and due items by date" option={charts.loadLine} className="chartWide" />
        </div>
      )}
    </section>
  )
}
