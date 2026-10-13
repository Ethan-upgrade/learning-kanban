import { useState } from 'react'
import { Button, Tag } from '@arco-design/web-react'
import { CheckCircle2, CircleHelp, Clock3, Database, Flame } from 'lucide-react'
import clsx from 'clsx'
import { format, isBefore, parseISO } from 'date-fns'
import { parseWikiLinks } from './markdown'
import { Metric, PanelTitle } from './common'
import type {
  AppSettings,
  AutomationLog,
  AutomationRule,
  BaseRecord,
  ManagedProject,
  Note,
  StartupStatus,
  Task,
  ViewKey,
} from '../types'

export function AuditView({
  tasks,
  notes,
  projects,
  baseRecords,
  automations,
  logs,
  settings,
  startupStatus,
  notificationPermission,
  syncStatus,
  onNavigate,
  onOpenSettings,
  onRequestNotifications,
}: {
  tasks: Task[]
  notes: Note[]
  projects: ManagedProject[]
  baseRecords: BaseRecord[]
  automations: AutomationRule[]
  logs: AutomationLog[]
  settings: AppSettings
  startupStatus: StartupStatus
  notificationPermission: NotificationPermission | 'unsupported'
  syncStatus: { tasks: boolean; notes: boolean; projects: boolean; base: boolean }
  onNavigate: (view: ViewKey) => void
  onOpenSettings: () => void
  onRequestNotifications: () => void
}) {
  const [lastRunAt, setLastRunAt] = useState(() => new Date().toISOString())
  const linkedProjectCount = projects.filter((project) => project.linkedTaskIds.length > 0).length
  const notesWithLinks = notes.filter((note) => parseWikiLinks(note.content).length > 0 || note.linkedTaskIds.length > 0).length
  const activeAutomations = automations.filter((rule) => rule.active).length
  const remindersReady = settings.reminderChecksEnabled && tasks.some((task) => task.reminderAt && task.status !== 'done')
  const notificationsReady = settings.notificationsEnabled && notificationPermission === 'granted'
  const dataSyncedCount = Object.values(syncStatus).filter(Boolean).length
  const overdue = tasks.filter((task) => task.status !== 'done' && isBefore(parseISO(task.dueDate), new Date())).length
  const emptyBaseFields = baseRecords.filter((record) => !record.company || !record.role || !record.deadline).length
  const uxRisks = [
    tasks.length > 25 ? 'Task volume is high. Use Tasks filters or split work into Projects/Base.' : '',
    overdue > 0 ? `${overdue} overdue tasks need triage.` : '',
    !notificationsReady ? 'Desktop notifications are not fully enabled.' : '',
    projects.length > 0 && linkedProjectCount === 0 ? 'Projects exist but no project has linked tasks.' : '',
    baseRecords.length > 0 && emptyBaseFields > 0 ? `${emptyBaseFields} Base records have missing key fields.` : '',
  ].filter(Boolean)

  const checks = [
    {
      title: 'Local Storage Sync',
      status: dataSyncedCount === 4 ? 'Pass' : 'Review',
      detail: `${dataSyncedCount}/4 data groups are server-backed in the local desktop service.`,
      action: 'Open Settings',
      onClick: onOpenSettings,
    },
    {
      title: 'Task Detail Flow',
      status: tasks.length ? 'Pass' : 'Review',
      detail: tasks.length ? 'Task cards, focus rows, table rows, linked tasks, and timeline rows open the detail panel.' : 'Create a task to test detail flow.',
      action: 'Open Tasks',
      onClick: () => onNavigate('tasks'),
    },
    {
      title: 'Reminders',
      status: remindersReady ? 'Pass' : 'Review',
      detail: remindersReady ? 'Reminder checking is enabled and at least one active task has a reminder.' : 'Enable reminder checks and add reminder times to active tasks.',
      action: 'Settings',
      onClick: onOpenSettings,
    },
    {
      title: 'Notifications',
      status: notificationsReady ? 'Pass' : 'Review',
      detail: notificationsReady ? 'Desktop notification permission is granted.' : `Permission: ${notificationPermission}.`,
      action: 'Enable',
      onClick: onRequestNotifications,
    },
    {
      title: 'Project Planning',
      status: linkedProjectCount > 0 ? 'Pass' : 'Review',
      detail: `${linkedProjectCount}/${projects.length} projects have linked tasks for automatic progress.`,
      action: 'Open Projects',
      onClick: () => onNavigate('projects'),
    },
    {
      title: 'Base Records',
      status: baseRecords.length && emptyBaseFields === 0 ? 'Pass' : 'Review',
      detail: `${baseRecords.length} records, ${emptyBaseFields} missing core fields.`,
      action: 'Open Base',
      onClick: () => onNavigate('base'),
    },
    {
      title: 'Knowledge Graph',
      status: notesWithLinks > 0 ? 'Pass' : 'Review',
      detail: `${notesWithLinks}/${notes.length} notes have backlinks or linked tasks.`,
      action: 'Open Knowledge',
      onClick: () => onNavigate('knowledge'),
    },
    {
      title: 'Automations',
      status: activeAutomations > 0 ? 'Pass' : 'Review',
      detail: `${activeAutomations}/${automations.length} rules active, ${logs.length} activity logs.`,
      action: 'Open Automations',
      onClick: () => onNavigate('automations'),
    },
    {
      title: 'Startup Policy',
      status: !startupStatus.enabled ? 'Pass' : 'Review',
      detail: startupStatus.enabled ? 'Launch at startup is enabled.' : 'Launch at startup is disabled.',
      action: 'Startup',
      onClick: onOpenSettings,
    },
  ]
  const passCount = checks.filter((check) => check.status === 'Pass').length

  return (
    <section className="auditPage">
      <header className="auditHeader">
        <div>
          <p className="eyebrow">Workspace Quality</p>
          <h2>Audit Center</h2>
          <span>Run a practical check on data health, interaction readiness, reminders, automation, and product experience.</span>
        </div>
        <Button type="primary" icon={<CheckCircle2 size={16} />} onClick={() => setLastRunAt(new Date().toISOString())}>Run Audit</Button>
      </header>

      <div className="auditMetrics">
        <Metric icon={<CheckCircle2 size={18} />} label="Passing checks" value={`${passCount}/${checks.length}`} />
        <Metric icon={<Flame size={18} />} label="UX risks" value={`${uxRisks.length}`} />
        <Metric icon={<Clock3 size={18} />} label="Last audit" value={format(parseISO(lastRunAt), 'HH:mm')} />
        <Metric icon={<Database size={18} />} label="Data groups" value={`${dataSyncedCount}/4`} />
      </div>

      <div className="auditWorkspace">
        <section className="auditCheckGrid">
          {checks.map((check) => (
            <article key={check.title} className={clsx('auditCheckCard', check.status === 'Pass' ? 'pass' : 'review')}>
              <header>
                <span>{check.status === 'Pass' ? <CheckCircle2 size={17} /> : <CircleHelp size={17} />}</span>
                <Tag color={check.status === 'Pass' ? 'green' : 'orange'}>{check.status}</Tag>
              </header>
              <strong>{check.title}</strong>
              <p>{check.detail}</p>
              <Button onClick={check.onClick}>{check.action}</Button>
            </article>
          ))}
        </section>

        <aside className="auditUxPanel">
          <PanelTitle title="Experience review" subtitle="Reduce clutter and keep workflows obvious" />
          <div className="auditUxList">
            {uxRisks.map((risk) => <p key={risk}>{risk}</p>)}
            {!uxRisks.length && <p>No major experience risks detected from current local data.</p>}
          </div>
          <div className="usageDoc">
            <p><strong>Layout rule: </strong>Overview is now an entry page. Heavy task filters only appear in task views.</p>
            <p><strong>Detail rule: </strong>Rows and cards that represent a task or record expose a detail action.</p>
            <p><strong>Base rule: </strong>Grid, Kanban, Timeline, Gallery, and Stats are different views over the same data.</p>
          </div>
        </aside>
      </div>
    </section>
  )
}
