import type { ReactNode } from 'react'

export type Status = 'backlog' | 'week' | 'doing' | 'review' | 'done'
export type Priority = 'high' | 'medium' | 'low'
export type ChatMode = 'coach' | 'explain' | 'quiz' | 'review'
export type ViewKey =
  | 'today'
  | 'tasks'
  | 'planning'
  | 'insights'
  | 'projects'
  | 'base'
  | 'knowledge'
  | 'automations'
  | 'assistant'
  | 'settings'
export type TaskSubView = 'board' | 'table' | 'process'
export type InsightsSection = 'overview' | 'progress' | 'workload' | 'distribution' | 'schedule'
export type SettingsSectionKey = 'general' | 'notifications' | 'startup' | 'data' | 'appearance' | 'audit' | 'guide' | 'about'
export type RouteState = {
  view: ViewKey
  taskView?: TaskSubView
  insights?: InsightsSection
  settingsSection?: SettingsSectionKey
}
export type TemplateId = 'study' | 'project' | 'coursework' | 'daily'
export type ProjectStatus = 'idea' | 'active' | 'blocked' | 'review' | 'done'
export type BaseRecordStatus = 'wishlist' | 'applied' | 'written' | 'interview' | 'offer' | 'rejected' | 'archived'
export type BaseRecordPriority = 'high' | 'medium' | 'low'
export type BaseViewMode = 'grid' | 'kanban' | 'timeline' | 'gallery' | 'stats'
export type FeishuConnectorConfig = {
  embedUrl: string
  appToken: string
  tableId: string
  viewId: string
  appId: string
  tenant: 'feishu' | 'lark'
  updatedAt: string
}

export type ChecklistItem = { id: string; text: string; done: boolean }

export type Task = {
  id: string
  title: string
  area: string
  status: Status
  priority: Priority
  startDate: string
  dueDate: string
  reminderAt: string
  reminderMins: number
  estimateHours: number
  progress: number
  tags: string[]
  notes: string
  checklist: ChecklistItem[]
  createdAt: string
  remindedAt?: string
  /** Custom task color (#RRGGBB). Undefined = derived from area. */
  color?: string
}

export type Note = {
  id: string
  title: string
  content: string
  tags: string[]
  linkedTaskIds: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export type ManagedProject = {
  id: string
  name: string
  objective: string
  status: ProjectStatus
  priority: Priority
  owner: string
  startDate: string
  dueDate: string
  linkedTaskIds: string[]
  tags: string[]
  notes: string
  createdAt: string
  updatedAt: string
}

export type BaseRecord = {
  id: string
  company: string
  role: string
  status: BaseRecordStatus
  priority: BaseRecordPriority
  city: string
  channel: string
  owner: string
  applyDate: string
  deadline: string
  nextAction: string
  nextActionAt: string
  salaryRange: string
  tags: string[]
  notes: string
  link: string
  createdAt: string
  updatedAt: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode?: ChatMode
  provider?: string
  createdAt: string
}

export type AutomationTrigger = 'task_created' | 'record_updated' | 'condition_matched' | 'due_time'
export type AutomationAction = 'set_status' | 'set_priority' | 'add_tag' | 'set_reminder' | 'notify'
export type AutomationField = 'status' | 'priority' | 'area' | 'dueDate'

export type AutomationRule = {
  id: string
  name: string
  active: boolean
  trigger: AutomationTrigger
  triggerField: AutomationField
  conditionEnabled: boolean
  conditionField: AutomationField
  conditionValue: string
  action: AutomationAction
  actionValue: string
  createdAt: string
  updatedAt: string
  runCount: number
}

export type AutomationLog = {
  id: string
  ruleId: string
  ruleName: string
  taskId: string
  taskTitle: string
  result: 'Succeeded' | 'Skipped'
  detail: string
  createdAt: string
}

export type AppSettings = {
  notificationsEnabled: boolean
  reminderChecksEnabled: boolean
  automationNotificationsEnabled: boolean
  launchAtStartup: boolean
  confirmDestructiveActions: boolean
  defaultView: ViewKey
  interfaceDensity: 'comfortable' | 'compact'
  weekStartsOn: 'Sunday' | 'Monday'
}

export type StartupStatus = {
  supported: boolean
  enabled: boolean
  path: string | null
  error?: string
}

export type ChatModeMeta = { id: ChatMode; label: string; icon: ReactNode }
