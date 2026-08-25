import { useMemo } from 'react'
import { Alert, Empty, Progress, Tag } from '@arco-design/web-react'
import { PanelRightOpen } from 'lucide-react'
import { buildCharts, buildTimelineOption } from './chartBuilders'
import { getTaskProgress } from '../utils'
import { ChartCard } from './common'
import type { Task } from '../types'

export function ChartsView({
  tasks,
  totalTasks,
  totalHours,
  weightedProgress,
  overdueCount,
  dueSoonCount,
  setSelectedId,
}: {
  tasks: Task[]
  totalTasks: number
  totalHours: number
  weightedProgress: number
  overdueCount: number
  dueSoonCount: number
  setSelectedId: (id: string) => void
}) {
  const charts = useMemo(() => buildCharts(tasks), [tasks])
  const timelineOption = useMemo(() => buildTimelineOption(tasks), [tasks])
  const doneCount = tasks.filter((task) => task.status === 'done').length
  const remainingCount = Math.max(0, totalTasks - doneCount)
  const highPriorityCount = tasks.filter((task) => task.priority === 'high' && task.status !== 'done').length
  const activeCount = tasks.filter((task) => task.status !== 'done').length
  const timelineHeight = Math.max(320, Math.min(680, tasks.length * 36 + 130))
  const sortedTimelineTasks = useMemo(
    () => [...tasks].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 10),
    [tasks],
  )

  return (
    <section className="chartsPanel analyticsDashboard">
      <header className="analyticsHeader">
        <div>
          <p className="eyebrow">Task Analytics</p>
          <h2>Dashboard</h2>
          <span>Charts, proportions, progress, workload, risk, and timeline live in one tool.</span>
        </div>
        <div className="analyticsHeaderBadges">
          <Tag color="blue">Charts</Tag>
          <Tag color="purple">Timeline included</Tag>
          <Tag color={overdueCount ? 'red' : 'green'}>{overdueCount ? `${overdueCount} overdue` : 'On track'}</Tag>
        </div>
      </header>
      <Alert
        type={overdueCount ? 'warning' : 'success'}
        content={overdueCount ? `${overdueCount} items are overdue. Prioritize due-soon and high-risk work.` : 'No overdue items. Keep the current pace.'}
      />
      <div className="chartKpiGrid">
        <article className="chartKpi kpiBlue"><span>Total Tasks</span><strong>{totalTasks}</strong><small>{activeCount} active</small></article>
        <article className="chartKpi kpiGreen"><span>Completed</span><strong>{doneCount}</strong><small>{remainingCount} remaining</small></article>
        <article className="chartKpi kpiOrange"><span>Progress</span><strong>{weightedProgress}%</strong><small>Status and checklist based</small></article>
        <article className="chartKpi kpiRed"><span>Risk</span><strong>{overdueCount + dueSoonCount}</strong><small>{highPriorityCount} high priority open</small></article>
        <article className="chartKpi kpiViolet"><span>Planned Hours</span><strong>{totalHours}h</strong><small>Filtered workload</small></article>
      </div>
      <div className="chartGrid chartDashboardGrid">
        <ChartCard title="Stage Mix" subtitle="Proportion by workflow stage" option={charts.statusPie} />
        <ChartCard title="Progress Gauge" subtitle="Weighted task completion" option={charts.progressGauge} />
        <ChartCard title="Priority Split" subtitle="Open and closed task priority mix" option={charts.priorityPie} />
        <ChartCard title="Risk Profile" subtitle="Overdue, due soon, normal, and done" option={charts.riskBar} />
        <ChartCard title="Area Hours" subtitle="Estimated hours by area or Learning section" option={charts.areaBar} />
        <ChartCard title="Daily Load" subtitle="Active items and due items by date" option={charts.loadLine} />
        <ChartCard title="Completion Trend" subtitle="Planned completion versus actual done" option={charts.burnupLine} />
        <ChartCard title="Timeline" subtitle="Schedule and duration integrated into Charts" option={timelineOption} height={timelineHeight} className="chartWide">
          <div className="timelineTaskList">
            {sortedTimelineTasks.length ? sortedTimelineTasks.map((task) => (
              <button type="button" key={task.id} onClick={() => setSelectedId(task.id)}>
                <span>{task.title}</span>
                <strong>{task.startDate} - {task.dueDate}</strong>
                <Progress percent={getTaskProgress(task)} size="small" />
                <PanelRightOpen size={15} />
              </button>
            )) : <Empty description="No tasks in this filter" />}
          </div>
        </ChartCard>
      </div>
    </section>
  )
}
