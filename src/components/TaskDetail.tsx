import { Progress, Tooltip } from '@arco-design/web-react'
import { BookOpen, CheckCircle2, PanelRightClose, PanelRightOpen, Plus } from 'lucide-react'
import { columns } from '../constants'
import { getProgressReason, getTaskProgress } from '../utils'
import type { Priority, Status, Task } from '../types'

export function TaskDetail({
  selectedTask,
  updateTask,
  addChecklistItem,
  collapsed,
  setCollapsed,
}: {
  selectedTask?: Task
  updateTask: (taskId: string, patch: Partial<Task>) => void
  addChecklistItem: (taskId: string) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}) {
  const computedProgress = selectedTask ? getTaskProgress(selectedTask) : 0

  if (collapsed) {
    return (
      <aside className="detailRail">
        <Tooltip content="Expand task details" position="left">
          <button
            type="button"
            className="railToggleButton"
            onClick={() => setCollapsed(false)}
            aria-label="Expand task details"
          >
            <PanelRightOpen size={17} />
          </button>
        </Tooltip>
      </aside>
    )
  }

  return (
    <aside className="detailPanel">
      <Tooltip content="Collapse task details" position="left">
        <button
          type="button"
          className="detailEdgeToggle"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse task details"
        >
          <PanelRightClose size={16} />
        </button>
      </Tooltip>
      {selectedTask ? (
        <>
          <div className="detailHeader">
            <span>{selectedTask.area}</span>
            <div className="detailHeaderActions">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <input className="detailTitle" value={selectedTask.title} onChange={(event) => updateTask(selectedTask.id, { title: event.target.value })} />
          <textarea value={selectedTask.notes} onChange={(event) => updateTask(selectedTask.id, { notes: event.target.value })} placeholder="Context, review notes, blockers, or decisions" />
          <div className="detailGrid">
            <label>Status
              <select value={selectedTask.status} onChange={(event) => updateTask(selectedTask.id, { status: event.target.value as Status })}>
                {columns.map((column) => <option value={column.id} key={column.id}>{column.title}</option>)}
              </select>
            </label>
            <label>Priority
              <select value={selectedTask.priority} onChange={(event) => updateTask(selectedTask.id, { priority: event.target.value as Priority })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>Start date
              <input type="date" value={selectedTask.startDate} onChange={(event) => updateTask(selectedTask.id, { startDate: event.target.value })} />
            </label>
            <label>Due date
              <input type="date" value={selectedTask.dueDate} onChange={(event) => updateTask(selectedTask.id, { dueDate: event.target.value })} />
            </label>
            <label>Reminder
              <input type="datetime-local" value={selectedTask.reminderAt} onChange={(event) => updateTask(selectedTask.id, { reminderAt: event.target.value, remindedAt: undefined })} />
            </label>
            <label>Planned hours
              <input type="number" min={0.5} step={0.5} value={selectedTask.estimateHours} onChange={(event) => updateTask(selectedTask.id, { estimateHours: Number(event.target.value) })} />
            </label>
          </div>
          <section className="computedProgress">
            <div>
              <strong>Auto progress</strong>
              <span>{computedProgress}%</span>
            </div>
            <Progress percent={computedProgress} size="small" />
            <p>{getProgressReason(selectedTask)}</p>
          </section>
          <section className="checklist">
            <div className="checklistHeader"><strong>Checklist</strong><button type="button" onClick={() => addChecklistItem(selectedTask.id)}><Plus size={15} /></button></div>
            {selectedTask.checklist.map((item) => (
              <label className="checkItem" key={item.id}>
                <input type="checkbox" checked={item.done} onChange={() => updateTask(selectedTask.id, { checklist: selectedTask.checklist.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry) })} />
                <span>{item.text}</span>
              </label>
            ))}
            {!selectedTask.checklist.length && <p className="emptyText">No checklist items.</p>}
          </section>
        </>
      ) : (
        <div className="emptyDetail"><BookOpen size={32} /><p>Select a task to view details</p></div>
      )}
    </aside>
  )
}
