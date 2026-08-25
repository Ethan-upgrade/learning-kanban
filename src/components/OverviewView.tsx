import { Empty, Progress, Tag } from '@arco-design/web-react'
import { CheckCircle2, Database, ListFilter, Network, PanelRightOpen, Target, Workflow } from 'lucide-react'
import clsx from 'clsx'
import { columns, priorityMeta, statusMeta } from '../constants'
import { dueLabel, getRiskScore, getTaskProgress, riskClass } from '../utils'
import { sumBy } from './chartBuilders'
import { PanelTitle } from './common'
import type { Priority, Task, ViewKey } from '../types'

export function OverviewView({
  tasks,
  totalTasks,
  completion,
  overdueCount,
  dueSoonCount,
  weightedProgress,
  setSelectedId,
  onNavigate,
  summary,
}: {
  tasks: Task[]
  totalTasks: number
  completion: number
  overdueCount: number
  dueSoonCount: number
  weightedProgress: number
  setSelectedId: (id: string) => void
  onNavigate: (view: ViewKey) => void
  summary: {
    taskCount: number
    projectCount: number
    baseRecordCount: number
    noteCount: number
    automationCount: number
  }
}) {
  const focusTasks = [...tasks]
    .filter((task) => task.status !== 'done')
    .sort((a, b) => {
      const riskA = getRiskScore(a)
      const riskB = getRiskScore(b)
      if (riskA !== riskB) return riskB - riskA
      return a.dueDate.localeCompare(b.dueDate)
    })
    .slice(0, 5)
  const activeTasks = tasks
    .filter((task) => task.status === 'doing' || task.status === 'week')
    .slice(0, 5)
  const areaWorkload = Object.entries(
    sumBy(tasks, (task) => task.area, (task) => task.estimateHours),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const health =
    overdueCount > 0 ? 'Needs attention' : dueSoonCount > 2 ? 'Busy week' : 'On track'

  return (
    <section className="overviewPanel">
      <div className="executiveBand">
        <div>
          <p className="eyebrow">Executive Snapshot</p>
          <h2>{health}</h2>
          <span>
            Showing {tasks.length} items out of {totalTasks} total.
          </span>
        </div>
        <div className="healthGauge">
          <Progress type="circle" percent={completion} width={92} />
          <div>
            <strong>{weightedProgress}%</strong>
            <span>Completion</span>
          </div>
        </div>
      </div>

      <section className="workspaceDirectory">
        {[
          { key: 'board' as ViewKey, title: 'Tasks', subtitle: 'Board, table, timeline', count: summary.taskCount, icon: <ListFilter size={18} /> },
          { key: 'projects' as ViewKey, title: 'Projects', subtitle: 'Portfolio planning', count: summary.projectCount, icon: <Target size={18} /> },
          { key: 'base' as ViewKey, title: 'Base', subtitle: 'Multiview records', count: summary.baseRecordCount, icon: <Database size={18} /> },
          { key: 'knowledge' as ViewKey, title: 'Knowledge', subtitle: 'Notes and graph', count: summary.noteCount, icon: <Network size={18} /> },
          { key: 'automations' as ViewKey, title: 'Automations', subtitle: 'Rules and logs', count: summary.automationCount, icon: <Workflow size={18} /> },
          { key: 'audit' as ViewKey, title: 'Audit', subtitle: 'Health and UX checks', count: overdueCount + dueSoonCount, icon: <CheckCircle2 size={18} /> },
        ].map((item) => (
          <button type="button" key={item.key} onClick={() => onNavigate(item.key)}>
            <span>{item.icon}</span>
            <strong>{item.title}</strong>
            <small>{item.subtitle}</small>
            <b>{item.count}</b>
          </button>
        ))}
      </section>

      <div className="overviewGrid">
        <section className="managementPanel focusPanel">
          <PanelTitle title="Focus queue" subtitle="Risk, priority, and due date" />
          <div className="focusList">
            {focusTasks.map((task) => (
              <button type="button" key={task.id} onClick={() => setSelectedId(task.id)}>
                <span className={clsx('riskDot', riskClass(task))} />
                <div>
                  <strong>{task.title}</strong>
                  <small>{task.area} · {dueLabel(task.dueDate)} · {task.estimateHours}h</small>
                </div>
                <Tag color={priorityMeta[task.priority].color}>
                  {priorityMeta[task.priority].label}
                </Tag>
                <span className="detailOpenIcon" aria-hidden="true"><PanelRightOpen size={15} /></span>
              </button>
            ))}
            {!focusTasks.length && <Empty description="No items" />}
          </div>
        </section>

        <section className="managementPanel">
          <PanelTitle title="Execution" subtitle="Active items" />
          <div className="compactTaskList">
            {activeTasks.map((task) => (
              <button type="button" key={task.id} onClick={() => setSelectedId(task.id)}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{statusMeta[task.status].title} · {task.startDate} - {task.dueDate}</span>
                </div>
                <Progress percent={getTaskProgress(task)} size="small" />
                <span className="detailOpenIcon" aria-hidden="true"><PanelRightOpen size={15} /></span>
              </button>
            ))}
            {!activeTasks.length && <Empty description="No items" />}
          </div>
        </section>

        <section className="managementPanel">
          <PanelTitle title="Workload" subtitle="Area and planned hours" />
          <div className="workloadList">
            {areaWorkload.map(([area, hours]) => (
              <div key={area}>
                <span>{area}</span>
                <Progress
                  percent={Math.min(100, Math.round((hours / Math.max(1, areaWorkload[0]?.[1] || 1)) * 100))}
                  size="small"
                  formatText={() => `${hours}h`}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="managementPanel">
          <PanelTitle title="Priority matrix" subtitle="Stage and priority" />
          <div className="priorityMatrix">
            {(['high', 'medium', 'low'] as Priority[]).map((priority) => (
              <div key={priority}>
                <strong>{priorityMeta[priority].label}</strong>
                {columns.map((column) => (
                  <span key={column.id}>
                    {tasks.filter((task) => task.priority === priority && task.status === column.id).length}
                  </span>
                ))}
              </div>
            ))}
            <div className="matrixFooter">
              <strong />
              {columns.map((column) => <span key={column.id}>{column.title}</span>)}
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}
