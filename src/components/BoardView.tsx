import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { Empty } from '@arco-design/web-react'
import { Bell, PanelRightOpen } from 'lucide-react'
import clsx from 'clsx'
import { columns, priorityMeta } from '../constants'
import { dueLabel, getTaskProgress, reminderLabel } from '../utils'
import type { Task } from '../types'
import { resolveTaskColor, withAlpha } from '../colors'
import { cssVars } from '../cssVars'

export function BoardView({
  filteredTasks,
  selectedTask,
  scope,
  onDragEnd,
  setSelectedId,
}: {
  filteredTasks: Task[]
  selectedTask?: Task
  scope: string
  onDragEnd: (result: DropResult) => void
  setSelectedId: (id: string) => void
}) {
  const boardProgress = filteredTasks.length
    ? Math.round(filteredTasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / filteredTasks.length)
    : 0
  const boardHours = filteredTasks.reduce((sum, task) => sum + task.estimateHours, 0)
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="boardView">
        <header className="boardContextBar">
          <div><strong>Task Board</strong><span>{scope === 'All' ? 'All work' : scope}</span></div>
          <dl><div><dt>Tasks</dt><dd>{filteredTasks.length}</dd></div><div><dt>Progress</dt><dd>{boardProgress}%</dd></div><div><dt>Planned</dt><dd>{boardHours}h</dd></div></dl>
        </header>
        <section className="board">
          {columns.map((column) => {
          const columnTasks = filteredTasks.filter((task) => task.status === column.id)
          return (
            <Droppable droppableId={column.id} key={column.id}>
              {(provided, snapshot) => (
                <div className={clsx('column', `column-${column.id}`, snapshot.isDraggingOver && 'dragOver')} ref={provided.innerRef} {...provided.droppableProps}>
                  <div className="columnHeader">
                    <div><h2><i className="statusDot" />{column.title}</h2><span>{column.hint}</span></div>
                    <strong>{columnTasks.length}</strong>
                  </div>
                  <div className="cardStack">
                    {columnTasks.map((task, index) => (
                      <Draggable draggableId={task.id} index={index} key={task.id}>
                        {(dragProvided, dragSnapshot) => {
                          const taskColor = resolveTaskColor(task)
                          const cardStyle = cssVars(
                            { '--task-color': taskColor, '--task-tint': withAlpha(taskColor, 0.1) },
                            dragProvided.draggableProps.style,
                          )
                          return (
                          <button type="button" className={clsx('taskCard', task.color && 'customColor', selectedTask?.id === task.id && 'selected', dragSnapshot.isDragging && 'dragging')} ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps} style={cardStyle} onClick={() => setSelectedId(task.id)}>
                            <div className="cardTop">
                              <span className={clsx('priority', priorityMeta[task.priority].className)}>{priorityMeta[task.priority].label}</span>
                              <span className="dueText">{dueLabel(task.dueDate)}</span>
                            </div>
                            <h3>{task.title}</h3>
                            <span className="cardDetailIcon" aria-hidden="true"><PanelRightOpen size={15} /></span>
                            <p><span className="areaChip">{task.area}</span> {task.startDate} to {task.dueDate}</p>
                            <div className="reminderLine"><Bell size={13} />{reminderLabel(task.reminderAt)}</div>
                            <div className="progressTrack"><span style={{ width: `${getTaskProgress(task)}%` }} /></div>
                            <div className="tagRow">{task.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
                          </button>
                          )
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {!columnTasks.length && <Empty description="No tasks" />}
                  </div>
                </div>
              )}
            </Droppable>
          )
          })}
        </section>
      </div>
    </DragDropContext>
  )
}
