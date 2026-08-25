import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { Button, Empty, Progress, Tag } from '@arco-design/web-react'
import { CalendarClock, Flame, PanelRightOpen, Play, Plus, Search, Target, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { priorityMeta, projectStatusMeta, projectStatuses, statusMeta } from '../constants'
import { dueLabel, getProjectProgress, getProjectRisk, getProjectTasks, getRiskLevel, getTaskProgress } from '../utils'
import { buildProjectPortfolioCharts, buildSelectedProjectCharts } from './chartBuilders'
import { Metric, PanelTitle } from './common'
import type { ManagedProject, Priority, ProjectStatus, Task } from '../types'

export function ProjectManagementView({
  projects,
  allProjects,
  tasks,
  selectedProject,
  projectQuery,
  setProjectQuery,
  setSelectedProjectId,
  setSelectedTaskId,
  addProject,
  updateProject,
  deleteProject,
}: {
  projects: ManagedProject[]
  allProjects: ManagedProject[]
  tasks: Task[]
  selectedProject?: ManagedProject
  projectQuery: string
  setProjectQuery: (query: string) => void
  setSelectedProjectId: (id: string) => void
  setSelectedTaskId: (id: string) => void
  addProject: () => void
  updateProject: (projectId: string, patch: Partial<ManagedProject>) => void
  deleteProject: (projectId: string) => void
}) {
  const [taskLinkQuery, setTaskLinkQuery] = useState('')
  const activeProjects = allProjects.filter((project) => project.status !== 'done')
  const blockedProjects = allProjects.filter((project) => project.status === 'blocked')
  const avgProgress = allProjects.length
    ? Math.round(allProjects.reduce((sum, project) => sum + getProjectProgress(project, tasks), 0) / allProjects.length)
    : 0
  const dueSoonProjects = allProjects.filter((project) => {
    const diff = differenceInCalendarDays(parseISO(project.dueDate), new Date())
    return project.status !== 'done' && diff >= 0 && diff <= 14
  })
  const selectedTasks = selectedProject ? getProjectTasks(selectedProject, tasks) : []
  const selectedProgress = selectedProject ? getProjectProgress(selectedProject, tasks) : 0
  const selectedRisk = selectedProject ? getProjectRisk(selectedProject, tasks) : 'Normal'
  const completedLinkedTasks = selectedTasks.filter((task) => task.status === 'done').length
  const remainingLinkedTasks = Math.max(0, selectedTasks.length - completedLinkedTasks)
  const overdueLinkedTasks = selectedTasks.filter((task) => getRiskLevel(task) === 'Overdue').length
  const selectedTaskIds = new Set(selectedProject?.linkedTaskIds || [])
  const taskNeedle = taskLinkQuery.trim().toLowerCase()
  const filteredTaskOptions = tasks.filter((task) =>
    !taskNeedle ||
    [task.title, task.area, task.notes, ...task.tags].join(' ').toLowerCase().includes(taskNeedle),
  )
  const portfolioCharts = useMemo(() => buildProjectPortfolioCharts(allProjects, tasks), [allProjects, tasks])
  const selectedProjectCharts = useMemo(
    () => buildSelectedProjectCharts(selectedProject, tasks),
    [selectedProject, tasks],
  )
  const toggleLinkedTask = (taskId: string) => {
    if (!selectedProject) return
    const nextIds = selectedTaskIds.has(taskId)
      ? selectedProject.linkedTaskIds.filter((id) => id !== taskId)
      : [...selectedProject.linkedTaskIds, taskId]
    updateProject(selectedProject.id, { linkedTaskIds: nextIds })
  }

  return (
    <section className="projectsPage">
      <header className="projectsHeader">
        <div>
          <p className="eyebrow">Project Operations</p>
          <h2>Project Management</h2>
          <span>Generic portfolio tracking for learning, career preparation, coursework, and product work.</span>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={addProject}>New Project</Button>
      </header>

      <div className="projectMetrics">
        <Metric icon={<Target size={18} />} label="Projects" value={`${allProjects.length}`} />
        <Metric icon={<Play size={18} />} label="Active" value={`${activeProjects.length}`} />
        <Metric icon={<Flame size={18} />} label="Blocked" value={`${blockedProjects.length}`} />
        <Metric icon={<CalendarClock size={18} />} label="Due in 14d" value={`${dueSoonProjects.length}`} />
      </div>

      <div className="projectWorkspace">
        <aside className="projectPortfolio">
          <label className="knowledgeSearch">
            <Search size={15} />
            <input value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} placeholder="Search projects, tags, notes" />
          </label>
          <div className="projectStageBoard">
            {projectStatuses.map((status) => {
              const stageProjects = projects.filter((project) => project.status === status)
              return (
                <section key={status} className="projectStageColumn">
                  <header>
                    <div><strong>{projectStatusMeta[status].title}</strong><span>{projectStatusMeta[status].hint}</span></div>
                    <b>{stageProjects.length}</b>
                  </header>
                  <div className="projectCardList">
                    {stageProjects.map((project) => (
                      <button
                        type="button"
                        key={project.id}
                        className={clsx(selectedProject?.id === project.id && 'active')}
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        <div className="projectCardTop">
                          <Tag color={priorityMeta[project.priority].color}>{priorityMeta[project.priority].label}</Tag>
                          <span>{dueLabel(project.dueDate)}</span>
                        </div>
                        <strong>{project.name}</strong>
                        <small>{project.objective || 'No objective yet'}</small>
                        <Progress percent={getProjectProgress(project, tasks)} size="small" />
                        <span className="detailOpenIcon" aria-hidden="true"><PanelRightOpen size={15} /></span>
                      </button>
                    ))}
                    {!stageProjects.length && <span className="projectEmpty">No projects</span>}
                  </div>
                </section>
              )
            })}
          </div>
        </aside>

        <section className="projectDetailPanel">
          {selectedProject ? (
            <>
              <div className="projectDetailHeader">
                <div>
                  <input value={selectedProject.name} onChange={(event) => updateProject(selectedProject.id, { name: event.target.value })} aria-label="Project name" />
                  <span>{selectedProject.owner} · Updated {format(parseISO(selectedProject.updatedAt), 'MM-dd HH:mm')}</span>
                </div>
                <Button status="danger" icon={<Trash2 size={15} />} onClick={() => deleteProject(selectedProject.id)}>Delete</Button>
              </div>

              <div className="projectDetailStats">
                <div><strong>{selectedProgress}%</strong><span>Progress</span></div>
                <div><strong>{selectedTasks.length}</strong><span>Linked tasks</span></div>
                <div><strong>{selectedRisk}</strong><span>Risk</span></div>
              </div>

              <div className="projectFormGrid">
                <label>Status<select value={selectedProject.status} onChange={(event) => updateProject(selectedProject.id, { status: event.target.value as ProjectStatus })}>{projectStatuses.map((status) => <option key={status} value={status}>{projectStatusMeta[status].title}</option>)}</select></label>
                <label>Priority<select value={selectedProject.priority} onChange={(event) => updateProject(selectedProject.id, { priority: event.target.value as Priority })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
                <label>Owner<input value={selectedProject.owner} onChange={(event) => updateProject(selectedProject.id, { owner: event.target.value })} /></label>
                <label>Start<input type="date" value={selectedProject.startDate} onChange={(event) => updateProject(selectedProject.id, { startDate: event.target.value })} /></label>
                <label>Due<input type="date" value={selectedProject.dueDate} onChange={(event) => updateProject(selectedProject.id, { dueDate: event.target.value })} /></label>
                <label>Tags<input value={selectedProject.tags.join(', ')} onChange={(event) => updateProject(selectedProject.id, { tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></label>
              </div>

              <label className="projectObjective">Objective<textarea value={selectedProject.objective} onChange={(event) => updateProject(selectedProject.id, { objective: event.target.value })} /></label>
              <label className="projectObjective">Notes<textarea value={selectedProject.notes} onChange={(event) => updateProject(selectedProject.id, { notes: event.target.value })} /></label>

              <section className="projectLinkedTasks">
                <PanelTitle title="Linked tasks" subtitle="Project progress is calculated from these tasks" />
                <div className="linkedTaskPicker">
                  <label className="linkedTaskSearch">
                    <Search size={15} />
                    <input value={taskLinkQuery} onChange={(event) => setTaskLinkQuery(event.target.value)} placeholder="Search tasks to link" />
                    <span>{selectedTaskIds.size} selected</span>
                  </label>
                  <div className="linkedTaskOptions" role="listbox" aria-label="Link project tasks">
                    {filteredTaskOptions.map((task) => (
                      <label key={task.id} className={clsx(selectedTaskIds.has(task.id) && 'checked')}>
                        <input type="checkbox" checked={selectedTaskIds.has(task.id)} onChange={() => toggleLinkedTask(task.id)} />
                        <span>
                          <strong>{task.area} / {task.title}</strong>
                          <small>{statusMeta[task.status].title} · {dueLabel(task.dueDate)} · {getTaskProgress(task)}%</small>
                        </span>
                      </label>
                    ))}
                    {!filteredTaskOptions.length && <p className="emptyText">No matching tasks.</p>}
                  </div>
                </div>
                <div className="projectTaskList">
                  {selectedTasks.map((task) => (
                    <button type="button" key={task.id} onClick={() => setSelectedTaskId(task.id)}>
                      <div><strong>{task.title}</strong><span>{statusMeta[task.status].title} · {dueLabel(task.dueDate)}</span></div>
                      <Progress percent={getTaskProgress(task)} size="small" />
                      <span className="detailOpenIcon" aria-hidden="true"><PanelRightOpen size={15} /></span>
                    </button>
                  ))}
                  {!selectedTasks.length && <Empty description="No linked tasks" />}
                </div>
              </section>

              <section className="projectMiniDashboard">
                <PanelTitle title="Project dashboard" subtitle="Linked task completion and workload" />
                <div className="projectMiniStats">
                  <div><strong>{completedLinkedTasks}</strong><span>Done</span></div>
                  <div><strong>{remainingLinkedTasks}</strong><span>Remaining</span></div>
                  <div><strong>{overdueLinkedTasks}</strong><span>Overdue</span></div>
                  <div><strong>{selectedProgress}%</strong><span>Progress</span></div>
                </div>
                <ReactECharts option={selectedProjectCharts} style={{ height: 220 }} />
              </section>
            </>
          ) : (
            <div className="emptyKnowledge">
              <Target size={34} />
              <p>No project selected. Create a project to start tracking progress.</p>
              <Button type="primary" onClick={addProject}>New Project</Button>
            </div>
          )}
        </section>
      </div>

      <div className="projectFooterInsights">
        <section className="managementPanel">
          <PanelTitle title="Portfolio dashboard" subtitle="All projects, linked tasks, and completion state" />
          <div className="portfolioSummary">
            <div><strong>{avgProgress}%</strong><span>Average progress</span></div>
            <div><strong>{tasks.filter((task) => task.status === 'done').length}</strong><span>Tasks done</span></div>
            <div><strong>{tasks.filter((task) => task.status !== 'done').length}</strong><span>Tasks remaining</span></div>
          </div>
          <ReactECharts option={portfolioCharts} style={{ height: 260 }} />
        </section>
        <section className="managementPanel">
          <PanelTitle title="Recommended use" subtitle="Generic workflow" />
          <div className="usageDoc">
            <p><strong>Plan: </strong>Create a project for any multi-step effort, then link tasks from Board or Table.</p>
            <p><strong>Review: </strong>Use stage, risk, due date, and linked-task progress for weekly check-ins.</p>
            <p><strong>Reuse: </strong>This can cover learning tracks, job-search preparation, portfolio projects, coursework, or product work.</p>
          </div>
        </section>
      </div>
    </section>
  )
}
