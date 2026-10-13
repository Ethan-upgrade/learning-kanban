import { useState } from 'react'
import { Badge, Progress, Select, Table, Tag } from '@arco-design/web-react'
import { ChevronDown, Columns3, Hash, ListFilter, Plus, SlidersHorizontal, Table2, Trash2, Workflow } from 'lucide-react'
import clsx from 'clsx'
import type { Priority, Status, Task, TaskSubView } from '../types'
import { columns, priorityMeta, statusMeta } from '../constants'
import { dueLabel, getRiskLevel, getTaskProgress, reminderLabel } from '../utils'
import { areaColor, resolveTaskColor, withAlpha } from '../colors'
import { ColorDot } from '../components/ColorPicker'
import { BoardView } from '../components/BoardView'
import { ProcessView } from '../components/ProcessView'
import type { BoardData } from '../hooks/useBoardData'
import { PageHeader, SubNav } from './PageHeader'

const subViews: { key: TaskSubView; label: string; icon: React.ReactNode }[] = [
  { key: 'board', label: 'Board', icon: <Columns3 size={15} /> },
  { key: 'table', label: 'Table', icon: <Table2 size={15} /> },
  { key: 'process', label: 'Process', icon: <Workflow size={15} /> },
]

export function TasksPage({ data, taskView, onTaskViewChange }: {
  data: BoardData
  taskView: TaskSubView
  onTaskViewChange: (view: TaskSubView) => void
}) {
  const activeFilterCount = [
    data.area !== 'All',
    data.statusFilter !== 'all',
    data.priorityFilter !== 'all',
    data.tagFilter !== 'all',
  ].filter(Boolean).length
  const [filtersOpen, setFiltersOpen] = useState(activeFilterCount > 0)

  const clearFilters = () => {
    data.setArea('All')
    data.setStatusFilter('all')
    data.setPriorityFilter('all')
    data.setTagFilter('all')
  }

  const tableColumns = [
    {
      title: 'Task',
      dataIndex: 'title',
      width: 260,
      render: (_: unknown, record: Task) => (
        <button type="button" className="tableTaskButton" onClick={() => data.openTaskDetail(record.id)}>
          <strong><ColorDot color={resolveTaskColor(record)} /> {record.title}</strong>
          <span>{record.tags.slice(0, 3).join(' / ') || 'No tags'}</span>
        </button>
      ),
    },
    {
      title: 'Area',
      dataIndex: 'area',
      width: 120,
      render: (value: string) => {
        const color = areaColor(value)
        return <Tag style={{ color, background: withAlpha(color, 0.12), borderColor: 'transparent' }}>{value}</Tag>
      },
    },
    {
      title: 'Stage',
      dataIndex: 'status',
      width: 120,
      render: (value: Status) => <Badge color={statusMeta[value].color} text={statusMeta[value].title} />,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      width: 90,
      render: (value: Priority) => <Tag color={priorityMeta[value].color}>{priorityMeta[value].label}</Tag>,
    },
    { title: 'Start', dataIndex: 'startDate', width: 110 },
    { title: 'Due', dataIndex: 'dueDate', width: 110, render: (value: string) => dueLabel(value) },
    { title: 'Reminder', dataIndex: 'reminderAt', width: 130, render: (value: string) => reminderLabel(value) },
    { title: 'Progress', width: 150, render: (_: unknown, record: Task) => <Progress percent={getTaskProgress(record)} size="small" /> },
    {
      title: 'Risk',
      width: 100,
      render: (_: unknown, record: Task) => {
        const risk = getRiskLevel(record)
        const color = risk === 'Overdue' ? 'red' : risk === 'High risk' ? 'orangered' : 'green'
        return <Tag color={color}>{risk}</Tag>
      },
    },
  ]

  return (
    <section className="pageBody">
      <PageHeader
        eyebrow="Tasks"
        title={data.area === 'All' ? 'All tasks' : data.area}
        description={`${data.filteredTasks.length} of ${data.tasks.length} tasks shown`}
        actions={(
          <>
            <Tag color={data.overdueCount ? 'red' : 'green'}>Overdue {data.overdueCount}</Tag>
            <Tag color={data.dueSoonCount ? 'orange' : 'green'}>Due in 3d {data.dueSoonCount}</Tag>
          </>
        )}
      />

      <div className="tasksToolbar">
        <SubNav label="Task views" items={subViews} active={taskView} onChange={onTaskViewChange} />
        <button
          type="button"
          className={clsx('filterToggle', filtersOpen && 'active')}
          onClick={() => setFiltersOpen((current) => !current)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={15} />
          <span>Filters</span>
          {activeFilterCount > 0 && <small className="filterCount">{activeFilterCount}</small>}
          <ChevronDown size={14} className={clsx('filterChevron', filtersOpen && 'expanded')} />
        </button>
      </div>

      {filtersOpen && (
        <section className="filterBand">
          <div className="filterTitle"><ListFilter size={16} /><span>Scope</span></div>
          <Select
            value={data.area}
            onChange={(value) => data.setArea(String(value))}
            showSearch
            style={{ minWidth: 180 }}
          >
            <Select.Option value="All">All areas ({data.tasks.length})</Select.Option>
            {data.filteredAreaTree.parents.filter((item) => item !== 'All').map((item) => (
              <Select.Option key={item} value={item}>{item} ({data.areaCounts[item] || 0})</Select.Option>
            ))}
            {data.filteredAreaTree.children.map((child) => (
              <Select.Option key={child} value={child}>Learning / {child} ({data.areaCounts[child] || 0})</Select.Option>
            ))}
          </Select>
          <Select value={data.statusFilter} onChange={(value) => data.setStatusFilter(value as Status | 'all')}>
            <Select.Option value="all">All stages</Select.Option>
            {columns.map((column) => <Select.Option key={column.id} value={column.id}>{column.title}</Select.Option>)}
          </Select>
          <Select value={data.priorityFilter} onChange={(value) => data.setPriorityFilter(value as Priority | 'all')}>
            <Select.Option value="all">All priorities</Select.Option>
            <Select.Option value="high">High priority</Select.Option>
            <Select.Option value="medium">Medium priority</Select.Option>
            <Select.Option value="low">Low priority</Select.Option>
          </Select>
          <Select value={data.tagFilter} onChange={(value) => data.setTagFilter(String(value))}>
            <Select.Option value="all">All tags</Select.Option>
            {data.taskTagOptions.map((tag) => <Select.Option key={tag} value={tag}>{tag}</Select.Option>)}
          </Select>
          <form className="customTagControl" onSubmit={(event) => { event.preventDefault(); data.addCustomTag() }}>
            <Hash size={14} />
            <input value={data.tagDraft} onChange={(event) => data.setTagDraft(event.target.value)} placeholder="Custom tag" />
            <button type="submit" aria-label="Add custom tag"><Plus size={14} /></button>
          </form>
          {data.tagFilter !== 'all' && data.customTags.includes(data.tagFilter) && (
            <button type="button" className="removeTagButton" onClick={() => data.deleteCustomTag(data.tagFilter)} title="Remove selected custom tag">
              <Trash2 size={14} />
            </button>
          )}
          {activeFilterCount > 0 && (
            <button type="button" className="clearFiltersButton" onClick={clearFilters}>Clear filters</button>
          )}
        </section>
      )}

      <section className="presetBand">
        <button type="button" onClick={() => { data.setPriorityFilter('high'); data.setStatusFilter('all'); onTaskViewChange('table') }}>
          <strong>Risk View</strong>
          <span>High priority work in the table</span>
        </button>
        <button type="button" onClick={() => { data.setStatusFilter('doing'); data.setPriorityFilter('all'); onTaskViewChange('board') }}>
          <strong>Execution View</strong>
          <span>Only active work on the board</span>
        </button>
        <button type="button" onClick={() => { data.setStatusFilter('review'); data.setPriorityFilter('all'); onTaskViewChange('board') }}>
          <strong>Review Queue</strong>
          <span>Tasks waiting for review</span>
        </button>
        <button type="button" onClick={clearFilters}>
          <strong>Everything</strong>
          <span>Reset all filters</span>
        </button>
      </section>

      {taskView === 'board' && (
        <BoardView
          filteredTasks={data.filteredTasks}
          selectedTask={data.selectedTask}
          scope={data.area}
          onDragEnd={data.onDragEnd}
          setSelectedId={data.openTaskDetail}
        />
      )}
      {taskView === 'table' && (
        <section className="tablePanel">
          <Table rowKey="id" columns={tableColumns} data={data.filteredTasks} pagination={false} scroll={{ x: 1160, y: 560 }} />
        </section>
      )}
      {taskView === 'process' && <ProcessView tasks={data.filteredTasks} />}
    </section>
  )
}
