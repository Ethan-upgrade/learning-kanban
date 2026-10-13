import { useMemo } from 'react'
import { Button, Empty, Progress } from '@arco-design/web-react'
import { PanelRightOpen, Search, Upload, X } from 'lucide-react'
import { buildTimelineOption } from '../components/chartBuilders'
import { ChartCard } from '../components/common'
import { getTaskProgress } from '../utils'
import { resolveTaskColor } from '../colors'
import { ColorDot } from '../components/ColorPicker'
import type { BoardData } from '../hooks/useBoardData'
import { PageHeader } from './PageHeader'

export function PlanningPage({ data }: { data: BoardData }) {
  const tasks = data.filteredTasks
  const timelineOption = useMemo(() => buildTimelineOption(tasks), [tasks])
  const timelineHeight = Math.max(320, Math.min(680, tasks.length * 36 + 130))
  const upcoming = useMemo(
    () => [...tasks].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 10),
    [tasks],
  )

  return (
    <section className="pageBody">
      <PageHeader
        eyebrow="Planning"
        title="Timeline & templates"
        description="See how scheduled work lines up, then seed new plans from templates or import an external schedule."
        actions={(
          <Button type="primary" size="small" icon={<Upload size={14} />} onClick={() => data.setImportOpen(true)}>
            Import schedule
          </Button>
        )}
      />

      <ChartCard title="Timeline" subtitle={`${tasks.length} tasks in the current scope`} option={timelineOption} height={timelineHeight} className="chartWide">
        <div className="timelineTaskList">
          {upcoming.length ? upcoming.map((task) => (
            <button type="button" key={task.id} onClick={() => data.openTaskDetail(task.id)}>
              <span><ColorDot color={resolveTaskColor(task)} /> {task.title}</span>
              <strong>{task.startDate} - {task.dueDate}</strong>
              <Progress percent={getTaskProgress(task)} size="small" />
              <PanelRightOpen size={15} />
            </button>
          )) : <Empty description="No tasks in this scope" />}
        </div>
      </ChartCard>

      <section className="templateCenter">
        <header className="templateCenterHeader">
          <div>
            <h3>Template center</h3>
            <span>{data.filteredTemplates.length} templates — applying one adds its tasks to Tasks.</span>
          </div>
          <label className="sideSearch templateSearch">
            <Search size={14} />
            <input value={data.templateQuery} onChange={(event) => data.setTemplateQuery(event.target.value)} placeholder="Find templates" />
            {data.templateQuery && <button type="button" onClick={() => data.setTemplateQuery('')} aria-label="Clear template search"><X size={13} /></button>}
          </label>
        </header>
        <div className="templateGrid">
          {data.filteredTemplates.map((template) => (
            <button key={template.id} type="button" className="templateCard" onClick={() => data.applyTemplate(template.id)}>
              <strong>{template.title}</strong>
              <span>{template.subtitle}</span>
              <small>Apply template</small>
            </button>
          ))}
          {!data.filteredTemplates.length && <Empty description="No matching templates" />}
        </div>
      </section>
    </section>
  )
}
