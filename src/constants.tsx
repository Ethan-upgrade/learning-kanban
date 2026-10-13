import { CheckCircle2, Code2, GraduationCap, MessageSquare } from 'lucide-react'
import type {
  AutomationAction,
  AutomationField,
  AutomationTrigger,
  AppSettings,
  BaseRecordStatus,
  ChatModeMeta,
  Priority,
  ProjectStatus,
  Status,
  InsightsSection,
  RouteState,
  SettingsSectionKey,
  TaskSubView,
  TemplateId,
  ViewKey,
} from './types'

export const STORAGE_KEY = 'learning-kanban-v5'
export const NOTES_STORAGE_KEY = 'studyboard-notes-v1'
export const PROJECTS_STORAGE_KEY = 'cj-board-projects-v1'
export const BASE_RECORDS_STORAGE_KEY = 'cj-board-base-records-v1'
export const FEISHU_CONNECTOR_STORAGE_KEY = 'cj-board-feishu-connector-v1'
export const CUSTOM_TAGS_STORAGE_KEY = 'cj-board-custom-tags-v1'
export const AUTOMATIONS_STORAGE_KEY = 'cj-board-automations-v1'
export const AUTOMATION_LOGS_STORAGE_KEY = 'cj-board-automation-logs-v1'
export const SETTINGS_STORAGE_KEY = 'cj-board-settings-v1'
export const STALE_REMINDER_GRACE_MS = 5 * 60 * 1000

export const defaultSettings: AppSettings = {
  notificationsEnabled: false,
  reminderChecksEnabled: true,
  automationNotificationsEnabled: true,
  launchAtStartup: false,
  confirmDestructiveActions: true,
  defaultView: 'today',
  interfaceDensity: 'comfortable',
  weekStartsOn: 'Monday',
}

export const viewKeys: ViewKey[] = ['today', 'tasks', 'planning', 'insights', 'projects', 'base', 'knowledge', 'automations', 'assistant', 'settings']

export const taskSubViews: TaskSubView[] = ['board', 'table', 'process']
export const insightsSections: InsightsSection[] = ['overview', 'progress', 'workload', 'distribution', 'schedule']
export const settingsSectionKeys: SettingsSectionKey[] = ['general', 'notifications', 'startup', 'data', 'appearance', 'audit', 'guide', 'about']

/** Maps legacy view keys (pre multi-page) onto the new route model. */
export const legacyRoute = (value?: string | null): RouteState | null => {
  if (!value) return null
  if (viewKeys.includes(value as ViewKey)) return { view: value as ViewKey }
  switch (value) {
    case 'overview': return { view: 'today' }
    case 'board':
    case 'table':
    case 'process': return { view: 'tasks', taskView: value }
    case 'gantt': return { view: 'planning' }
    case 'charts': return { view: 'insights' }
    case 'audit': return { view: 'settings', settingsSection: 'audit' }
    default: return null
  }
}

export const normalizeViewKey = (value?: string | null): ViewKey | null => legacyRoute(value)?.view ?? null

export const readRouteFromUrl = (fallback: ViewKey): Required<RouteState> => {
  const params = new URLSearchParams(window.location.search)
  const base = legacyRoute(params.get('view')) ?? (params.has('settings') ? { view: 'settings' as ViewKey } : { view: fallback })
  const tab = params.get('tab')
  const section = params.get('settingsSection') ?? params.get('section')
  return {
    view: base.view,
    taskView: base.taskView ?? (taskSubViews.includes(tab as TaskSubView) ? tab as TaskSubView : 'board'),
    insights: insightsSections.includes(tab as InsightsSection) ? tab as InsightsSection : 'overview',
    settingsSection: base.settingsSection ?? (settingsSectionKeys.includes(section as SettingsSectionKey) ? section as SettingsSectionKey : 'general'),
  }
}

export const writeRouteToUrl = (route: Required<RouteState>) => {
  const params = new URLSearchParams()
  params.set('view', route.view)
  if (route.view === 'tasks') params.set('tab', route.taskView)
  if (route.view === 'insights') params.set('tab', route.insights)
  if (route.view === 'settings') params.set('section', route.settingsSection)
  const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, '', next)
  }
}

export const statusMeta: Record<Status, { title: string; hint: string; color: string }> = {
  backlog: { title: 'Inbox', hint: 'Needs planning', color: 'gray' },
  week: { title: 'Planned', hint: 'Current cycle', color: 'blue' },
  doing: { title: 'In Progress', hint: 'Active work', color: 'arcoblue' },
  review: { title: 'Review', hint: 'Check and close', color: 'orange' },
  done: { title: 'Done', hint: 'Completed or archived', color: 'green' },
}

export const projectStatusMeta: Record<ProjectStatus, { title: string; hint: string; color: string }> = {
  idea: { title: 'Intake', hint: 'Define scope', color: 'gray' },
  active: { title: 'Active', hint: 'Execute now', color: 'blue' },
  blocked: { title: 'Blocked', hint: 'Needs decision', color: 'red' },
  review: { title: 'Review', hint: 'Validate output', color: 'orange' },
  done: { title: 'Done', hint: 'Closed', color: 'green' },
}

export const projectStatuses: ProjectStatus[] = ['idea', 'active', 'blocked', 'review', 'done']

export const baseStatuses: BaseRecordStatus[] = ['wishlist', 'applied', 'written', 'interview', 'offer', 'rejected', 'archived']

export const baseStatusMeta: Record<BaseRecordStatus, { title: string; hint: string; color: string }> = {
  wishlist: { title: 'Wishlist', hint: 'Target to evaluate', color: 'gray' },
  applied: { title: 'Applied', hint: 'Submitted', color: 'blue' },
  written: { title: 'Written Test', hint: 'Assessment stage', color: 'purple' },
  interview: { title: 'Interview', hint: 'Active interviews', color: 'orange' },
  offer: { title: 'Offer', hint: 'Won or negotiating', color: 'green' },
  rejected: { title: 'Rejected', hint: 'Closed negative', color: 'red' },
  archived: { title: 'Archived', hint: 'No action needed', color: 'gray' },
}

export const columns: Array<{ id: Status; title: string; hint: string }> = [
  { id: 'backlog', ...statusMeta.backlog },
  { id: 'week', ...statusMeta.week },
  { id: 'doing', ...statusMeta.doing },
  { id: 'review', ...statusMeta.review },
  { id: 'done', ...statusMeta.done },
]

export const areas = [
  'All',
  'Schedule',
  'Project',
  'Learning',
  'Computer Science Basics',
  'Python',
  'C++',
  'SQL/Database',
  'Algorithms',
  'Machine Learning',
  'NLP',
  'Project Practice',
]

export const learningAreas = [
  'Computer Science Basics',
  'Python',
  'C++',
  'SQL/Database',
  'Algorithms',
  'Machine Learning',
  'NLP',
  'Project Practice',
]

export const topLevelAreas = ['All', 'Schedule', 'Project', 'Learning']
export const isLearningArea = (value: string) => value === 'Learning' || learningAreas.includes(value)
export const getAreaSection = (value: string) => isLearningArea(value) ? 'Learning' : value

export const processNodes = [
  'Capture',
  'Goal Definition',
  'Task Breakdown',
  'Schedule Execution',
  'Stage Review',
  'Retrospective Archive',
]

export const planTemplates: Array<{
  id: TemplateId
  title: string
  subtitle: string
  area: string
}> = [
  {
    id: 'study',
    title: 'Learning Plan',
    subtitle: 'Concepts, practice, review',
    area: 'Learning',
  },
  {
    id: 'project',
    title: 'Project Plan',
    subtitle: 'Requirements, Development, Review',
    area: 'Project',
  },
  {
    id: 'coursework',
    title: 'Coursework',
    subtitle: 'Reading, Outline, Draft',
    area: 'Learning',
  },
  {
    id: 'daily',
    title: 'Daily Plan',
    subtitle: 'Today, reminders, review',
    area: 'Schedule',
  },
]

export const chatModes: ChatModeMeta[] = [
  { id: 'coach', label: 'Planning', icon: <GraduationCap size={15} /> },
  { id: 'explain', label: 'Explain Code', icon: <Code2 size={15} /> },
  { id: 'quiz', label: 'Step-by-step Quiz', icon: <MessageSquare size={15} /> },
  { id: 'review', label: 'Review', icon: <CheckCircle2 size={15} /> },
]

export const priorityMeta: Record<
  Priority,
  { label: string; color: string; className: string; rank: number }
> = {
  high: { label: 'High', color: 'red', className: 'priorityHigh', rank: 3 },
  medium: { label: 'Medium', color: 'orange', className: 'priorityMedium', rank: 2 },
  low: { label: 'Low', color: 'green', className: 'priorityLow', rank: 1 },
}

export const automationTriggerMeta: Record<AutomationTrigger, { label: string; description: string }> = {
  task_created: { label: 'When a task is created', description: 'Runs after a new task is added.' },
  record_updated: { label: 'When a task field updates', description: 'Runs when the selected field changes.' },
  condition_matched: { label: 'When a task matches conditions', description: 'Runs after an edit makes the condition true.' },
  due_time: { label: 'At task due time', description: 'Runs once when the task due date arrives.' },
}

export const automationActionMeta: Record<AutomationAction, { label: string; description: string }> = {
  set_status: { label: 'Update task status', description: 'Move the task to another board stage.' },
  set_priority: { label: 'Update priority', description: 'Change the task priority.' },
  add_tag: { label: 'Add tag', description: 'Append a tag without removing existing tags.' },
  set_reminder: { label: 'Schedule reminder', description: 'Set a reminder a number of minutes from now.' },
  notify: { label: 'Send desktop notification', description: 'Show an operating-system notification.' },
}

export const automationFieldLabels: Record<AutomationField, string> = {
  status: 'Status',
  priority: 'Priority',
  area: 'Area',
  dueDate: 'Due date',
}
