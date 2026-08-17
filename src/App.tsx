import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd'
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Empty,
  Input,
  Progress,
  Select,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from '@arco-design/web-react'
import {
  ArrowDownAZ,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Columns3,
  Database,
  Download,
  FileText,
  Filter,
  Flame,
  GraduationCap,
  Hash,
  LayoutDashboard,
  Link2,
  ListFilter,
  MessageSquare,
  MoreHorizontal,
  Network,
  Pause,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Upload,
  UserRound,
  Workflow,
  Zap,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import {
  differenceInCalendarDays,
  format,
  isBefore,
  isToday,
  parseISO,
  subDays,
} from 'date-fns'
import './App.css'

type Status = 'backlog' | 'week' | 'doing' | 'review' | 'done'
type Priority = 'high' | 'medium' | 'low'
type ChatMode = 'coach' | 'explain' | 'quiz' | 'review'
type ViewKey =
  | 'overview'
  | 'projects'
  | 'base'
  | 'knowledge'
  | 'audit'
  | 'board'
  | 'automations'
  | 'table'
  | 'charts'
  | 'process'
type TemplateId = 'study' | 'project' | 'coursework' | 'daily'
type ProjectStatus = 'idea' | 'active' | 'blocked' | 'review' | 'done'
type BaseRecordStatus = 'wishlist' | 'applied' | 'written' | 'interview' | 'offer' | 'rejected' | 'archived'
type BaseRecordPriority = 'high' | 'medium' | 'low'
type BaseViewMode = 'grid' | 'kanban' | 'timeline' | 'gallery' | 'stats'
type FeishuConnectorConfig = {
  embedUrl: string
  appToken: string
  tableId: string
  viewId: string
  appId: string
  tenant: 'feishu' | 'lark'
  updatedAt: string
}

type ChecklistItem = { id: string; text: string; done: boolean }

type Task = {
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
}

type Note = {
  id: string
  title: string
  content: string
  tags: string[]
  linkedTaskIds: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

type ManagedProject = {
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

type BaseRecord = {
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

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode?: ChatMode
  provider?: string
  createdAt: string
}

type AutomationTrigger = 'task_created' | 'record_updated' | 'condition_matched' | 'due_time'
type AutomationAction = 'set_status' | 'set_priority' | 'add_tag' | 'set_reminder' | 'notify'
type AutomationField = 'status' | 'priority' | 'area' | 'dueDate'

type AutomationRule = {
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

type AutomationLog = {
  id: string
  ruleId: string
  ruleName: string
  taskId: string
  taskTitle: string
  result: 'Succeeded' | 'Skipped'
  detail: string
  createdAt: string
}

type AppSettings = {
  notificationsEnabled: boolean
  reminderChecksEnabled: boolean
  automationNotificationsEnabled: boolean
  launchAtStartup: boolean
  confirmDestructiveActions: boolean
  defaultView: ViewKey
  interfaceDensity: 'comfortable' | 'compact'
  weekStartsOn: 'Sunday' | 'Monday'
}

type StartupStatus = {
  supported: boolean
  enabled: boolean
  path: string | null
  error?: string
}

const STORAGE_KEY = 'learning-kanban-v5'
const NOTES_STORAGE_KEY = 'studyboard-notes-v1'
const PROJECTS_STORAGE_KEY = 'cj-board-projects-v1'
const BASE_RECORDS_STORAGE_KEY = 'cj-board-base-records-v1'
const FEISHU_CONNECTOR_STORAGE_KEY = 'cj-board-feishu-connector-v1'
const CUSTOM_TAGS_STORAGE_KEY = 'cj-board-custom-tags-v1'
const AUTOMATIONS_STORAGE_KEY = 'cj-board-automations-v1'
const AUTOMATION_LOGS_STORAGE_KEY = 'cj-board-automation-logs-v1'
const SETTINGS_STORAGE_KEY = 'cj-board-settings-v1'
const STALE_REMINDER_GRACE_MS = 5 * 60 * 1000

const defaultSettings: AppSettings = {
  notificationsEnabled: false,
  reminderChecksEnabled: true,
  automationNotificationsEnabled: true,
  launchAtStartup: false,
  confirmDestructiveActions: true,
  defaultView: 'overview',
  interfaceDensity: 'comfortable',
  weekStartsOn: 'Monday',
}

const viewKeys: ViewKey[] = ['overview', 'projects', 'base', 'knowledge', 'audit', 'board', 'automations', 'table', 'charts', 'process']

const normalizeViewKey = (value?: string | null): ViewKey | null => {
  if (value === 'gantt') return 'charts'
  return value && viewKeys.includes(value as ViewKey) ? value as ViewKey : null
}

const statusMeta: Record<Status, { title: string; hint: string; color: string }> = {
  backlog: { title: 'Inbox', hint: 'Needs planning', color: 'gray' },
  week: { title: 'Planned', hint: 'Current cycle', color: 'blue' },
  doing: { title: 'In Progress', hint: 'Active work', color: 'arcoblue' },
  review: { title: 'Review', hint: 'Check and close', color: 'orange' },
  done: { title: 'Done', hint: 'Completed or archived', color: 'green' },
}

const projectStatusMeta: Record<ProjectStatus, { title: string; hint: string; color: string }> = {
  idea: { title: 'Intake', hint: 'Define scope', color: 'gray' },
  active: { title: 'Active', hint: 'Execute now', color: 'blue' },
  blocked: { title: 'Blocked', hint: 'Needs decision', color: 'red' },
  review: { title: 'Review', hint: 'Validate output', color: 'orange' },
  done: { title: 'Done', hint: 'Closed', color: 'green' },
}

const projectStatuses: ProjectStatus[] = ['idea', 'active', 'blocked', 'review', 'done']

const baseStatuses: BaseRecordStatus[] = ['wishlist', 'applied', 'written', 'interview', 'offer', 'rejected', 'archived']

const baseStatusMeta: Record<BaseRecordStatus, { title: string; hint: string; color: string }> = {
  wishlist: { title: 'Wishlist', hint: 'Target to evaluate', color: 'gray' },
  applied: { title: 'Applied', hint: 'Submitted', color: 'blue' },
  written: { title: 'Written Test', hint: 'Assessment stage', color: 'purple' },
  interview: { title: 'Interview', hint: 'Active interviews', color: 'orange' },
  offer: { title: 'Offer', hint: 'Won or negotiating', color: 'green' },
  rejected: { title: 'Rejected', hint: 'Closed negative', color: 'red' },
  archived: { title: 'Archived', hint: 'No action needed', color: 'gray' },
}

const columns: Array<{ id: Status; title: string; hint: string }> = [
  { id: 'backlog', ...statusMeta.backlog },
  { id: 'week', ...statusMeta.week },
  { id: 'doing', ...statusMeta.doing },
  { id: 'review', ...statusMeta.review },
  { id: 'done', ...statusMeta.done },
]

const areas = [
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

const learningAreas = [
  'Computer Science Basics',
  'Python',
  'C++',
  'SQL/Database',
  'Algorithms',
  'Machine Learning',
  'NLP',
  'Project Practice',
]

const topLevelAreas = ['All', 'Schedule', 'Project', 'Learning']
const isLearningArea = (value: string) => value === 'Learning' || learningAreas.includes(value)
const getAreaSection = (value: string) => isLearningArea(value) ? 'Learning' : value

const processNodes = [
  'Capture',
  'Goal Definition',
  'Task Breakdown',
  'Schedule Execution',
  'Stage Review',
  'Retrospective Archive',
]

const planTemplates: Array<{
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

const chatModes: Array<{ id: ChatMode; label: string; icon: ReactNode }> = [
  { id: 'coach', label: 'Planning', icon: <GraduationCap size={15} /> },
  { id: 'explain', label: 'Explain Code', icon: <Code2 size={15} /> },
  { id: 'quiz', label: 'Step-by-step Quiz', icon: <MessageSquare size={15} /> },
  { id: 'review', label: 'Review', icon: <CheckCircle2 size={15} /> },
]

const priorityMeta: Record<
  Priority,
  { label: string; color: string; className: string; rank: number }
> = {
  high: { label: 'High', color: 'red', className: 'priorityHigh', rank: 3 },
  medium: { label: 'Medium', color: 'orange', className: 'priorityMedium', rank: 2 },
  low: { label: 'Low', color: 'green', className: 'priorityLow', rank: 1 },
}

const automationTriggerMeta: Record<AutomationTrigger, { label: string; description: string }> = {
  task_created: { label: 'When a task is created', description: 'Runs after a new task is added.' },
  record_updated: { label: 'When a task field updates', description: 'Runs when the selected field changes.' },
  condition_matched: { label: 'When a task matches conditions', description: 'Runs after an edit makes the condition true.' },
  due_time: { label: 'At task due time', description: 'Runs once when the task due date arrives.' },
}

const automationActionMeta: Record<AutomationAction, { label: string; description: string }> = {
  set_status: { label: 'Update task status', description: 'Move the task to another board stage.' },
  set_priority: { label: 'Update priority', description: 'Change the task priority.' },
  add_tag: { label: 'Add tag', description: 'Append a tag without removing existing tags.' },
  set_reminder: { label: 'Schedule reminder', description: 'Set a reminder a number of minutes from now.' },
  notify: { label: 'Send desktop notification', description: 'Show an operating-system notification.' },
}

const automationFieldLabels: Record<AutomationField, string> = {
  status: 'Status',
  priority: 'Priority',
  area: 'Area',
  dueDate: 'Due date',
}

const makeId = () => crypto.randomUUID()

const datePlus = (days: number) => {
  const next = new Date()
  next.setDate(next.getDate() + days)
  return format(next, 'yyyy-MM-dd')
}

const reminderPlus = (days: number, hour = 20, minute = 0) => {
  const next = new Date()
  next.setDate(next.getDate() + days)
  next.setHours(hour, minute, 0, 0)
  return format(next, "yyyy-MM-dd'T'HH:mm")
}

const createSeedTasks = (): Task[] => [
  {
    id: makeId(),
    title: 'Set up learning environment and editor',
    area: 'Computer Science Basics',
    status: 'doing',
    priority: 'high',
    startDate: datePlus(0),
    dueDate: datePlus(1),
    reminderAt: reminderPlus(1, 9, 0),
    reminderMins: 120,
    estimateHours: 2,
    progress: 35,
    tags: ['Git', 'VS Code', 'Environment'],
    notes: 'Install Python, C++ tooling, PostgreSQL, Node, and Git.',
    checklist: [
      { id: makeId(), text: 'Create learning folders', done: true },
      { id: makeId(), text: 'Verify Python virtual environment', done: false },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: makeId(),
    title: 'Python word frequency counter',
    area: 'Python',
    status: 'week',
    priority: 'high',
    startDate: datePlus(1),
    dueDate: datePlus(3),
    reminderAt: reminderPlus(3, 20, 30),
    reminderMins: 180,
    estimateHours: 3,
    progress: 0,
    tags: ['File IO', 'dict', 'CLI'],
    notes: 'Read a txt file and print the top 20 words.',
    checklist: [
      { id: makeId(), text: 'Read file input', done: false },
      { id: makeId(), text: 'Clean punctuation and casing', done: false },
      { id: makeId(), text: 'Sort and output results', done: false },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: makeId(),
    title: 'Project: Portfolio v1',
    area: 'Project',
    status: 'backlog',
    priority: 'medium',
    startDate: datePlus(3),
    dueDate: datePlus(10),
    reminderAt: reminderPlus(5, 19, 0),
    reminderMins: 240,
    estimateHours: 8,
    progress: 0,
    tags: ['Portfolio', 'React', 'Deployment'],
    notes: 'Define requirements, build pages, deploy, and write project notes.',
    checklist: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: makeId(),
    title: 'Algorithms: 10 array and hash table exercises',
    area: 'Algorithms',
    status: 'week',
    priority: 'high',
    startDate: datePlus(2),
    dueDate: datePlus(5),
    reminderAt: reminderPlus(5, 21, 0),
    reminderMins: 120,
    estimateHours: 5,
    progress: 10,
    tags: ['LeetCode', 'Complexity'],
    notes: 'Solve problems, record time complexity and space complexity.',
    checklist: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: makeId(),
    title: 'Machine Learning: First classification model',
    area: 'Machine Learning',
    status: 'backlog',
    priority: 'medium',
    startDate: datePlus(7),
    dueDate: datePlus(14),
    reminderAt: reminderPlus(10, 20, 0),
    reminderMins: 360,
    estimateHours: 4,
    progress: 0,
    tags: ['scikit-learn', 'Classification', 'Evaluation'],
    notes: 'Train a model and compare accuracy, precision, and recall.',
    checklist: [],
    createdAt: new Date().toISOString(),
  },
]

const createSeedNotes = (): Note[] => {
  const now = new Date().toISOString()
  return [
    {
      id: makeId(),
      title: 'Knowledge Home',
      content: [
        '# Knowledge Home',
        '',
        'A home note for learning plans, project notes, and schedule management.',
        '',
        'Suggested structure: ',
        '- [[Computer Science Basics]]: Core concepts and fundamentals',
        '- [[Python Practice]]: Code snippets, error logs, and small projects',
        '- [[Project Planning]]: requirements, decisions, and delivery notes',
        '',
        'Use `[[Note Title]]` to create bidirectional links.',
      ].join('\n'),
      tags: ['MOC', 'Index'],
      linkedTaskIds: [],
      pinned: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: makeId(),
      title: 'Computer Science Basics',
      content: [
        '# Computer Science Basics',
        '',
        'Core question: How computers execute programs?',
        '',
        'To expand: ',
        '- Operating Systems',
        '- Networking',
        '- Data Structures',
        '- Database',
        '',
        'Related: [[Python Practice]]',
      ].join('\n'),
      tags: ['Learning', 'CS'],
      linkedTaskIds: [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: makeId(),
      title: 'Project Planning',
      content: [
        '# Project Planning',
        '',
        'Project decision checklist:',
        '',
        '1. What problem does this solve?',
        '2. Who will use it?',
        '3. What is the smallest useful version?',
        '4. How will success be checked?',
        '',
        'Related: [[Knowledge Home]]',
      ].join('\n'),
      tags: ['Decision', 'Project'],
      linkedTaskIds: [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

const normalizeNote = (note: Partial<Note> & { id: string; title: string }): Note => {
  const now = new Date().toISOString()
  return {
    id: note.id,
    title: note.title || 'Untitled Note',
    content: note.content || '',
    tags: note.tags || [],
    linkedTaskIds: note.linkedTaskIds || [],
    pinned: Boolean(note.pinned),
    createdAt: note.createdAt || now,
    updatedAt: note.updatedAt || now,
  }
}

const loadLocalNotes = () => {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY)
    if (!raw) return createSeedNotes()
    const parsed = JSON.parse(raw) as Note[]
    return Array.isArray(parsed) ? parsed.map(normalizeNote) : createSeedNotes()
  } catch {
    return createSeedNotes()
  }
}

const createSeedProjects = (tasks: Task[] = []): ManagedProject[] => {
  const learningTaskIds = tasks
    .filter((task) => isLearningArea(task.area))
    .slice(0, 6)
    .map((task) => task.id)
  const projectTaskIds = tasks
    .filter((task) => task.area === 'Project' || task.tags.some((tag) => tag.toLowerCase().includes('project')))
    .slice(0, 5)
    .map((task) => task.id)
  const now = new Date().toISOString()
  return [
    {
      id: makeId(),
      name: 'Learning Progress System',
      objective: 'Build a trackable technical learning routine with clear weekly output.',
      status: 'active',
      priority: 'high',
      owner: 'Novak',
      startDate: datePlus(0),
      dueDate: datePlus(28),
      linkedTaskIds: learningTaskIds,
      tags: ['Learning', 'Portfolio', 'Routine'],
      notes: 'Use this project to coordinate CS, Python, SQL, algorithms, ML, and NLP progress.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: makeId(),
      name: 'General Project Pipeline',
      objective: 'Manage reusable work that needs planning, execution, review, and delivery.',
      status: 'idea',
      priority: 'medium',
      owner: 'Novak',
      startDate: datePlus(1),
      dueDate: datePlus(45),
      linkedTaskIds: projectTaskIds,
      tags: ['Project', 'Planning'],
      notes: 'Keep this generic so it can support internship preparation, coursework, product work, or personal projects.',
      createdAt: now,
      updatedAt: now,
    },
  ]
}

const normalizeProject = (project: Partial<ManagedProject> & { id: string; name: string }): ManagedProject => {
  const status = projectStatuses.includes(project.status as ProjectStatus) ? project.status as ProjectStatus : 'idea'
  return {
    id: project.id,
    name: project.name || 'Untitled Project',
    objective: project.objective || '',
    status,
    priority: project.priority || 'medium',
    owner: project.owner || 'Novak',
    startDate: project.startDate || datePlus(0),
    dueDate: project.dueDate || datePlus(14),
    linkedTaskIds: Array.isArray(project.linkedTaskIds) ? project.linkedTaskIds : [],
    tags: Array.isArray(project.tags) ? project.tags : [],
    notes: project.notes || '',
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || new Date().toISOString(),
  }
}

const loadLocalProjects = (tasks: Task[]) => {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY)
    if (!raw) return createSeedProjects(tasks)
    const parsed = JSON.parse(raw) as ManagedProject[]
    return Array.isArray(parsed) ? parsed.map(normalizeProject) : createSeedProjects(tasks)
  } catch {
    return createSeedProjects(tasks)
  }
}

const createSeedBaseRecords = (): BaseRecord[] => {
  const now = new Date().toISOString()
  const record = (input: Omit<BaseRecord, 'id' | 'createdAt' | 'updatedAt'>): BaseRecord => ({
    ...input,
    id: makeId(),
    createdAt: now,
    updatedAt: now,
  })
  return [
    record({
      company: 'ByteDance',
      role: 'Backend Intern',
      status: 'applied',
      priority: 'high',
      city: 'Beijing',
      channel: 'Campus portal',
      owner: 'Novak',
      applyDate: datePlus(-3),
      deadline: datePlus(10),
      nextAction: 'Check written-test email and review OS basics',
      nextActionAt: reminderPlus(1, 19, 30),
      salaryRange: 'Intern package',
      tags: ['Autumn Recruiting', 'Backend'],
      notes: 'Track resume version, referral source, and next technical review.',
      link: '',
    }),
    record({
      company: 'Tencent',
      role: 'ML Intern',
      status: 'written',
      priority: 'high',
      city: 'Shenzhen',
      channel: 'Referral',
      owner: 'Novak',
      applyDate: datePlus(-7),
      deadline: datePlus(5),
      nextAction: 'Finish probability and ML evaluation practice',
      nextActionAt: reminderPlus(0, 21, 0),
      salaryRange: 'Negotiable',
      tags: ['Autumn Recruiting', 'Machine Learning'],
      notes: 'Prepare supervised learning, metrics, and Python implementation examples.',
      link: '',
    }),
    record({
      company: 'Alibaba',
      role: 'Data Platform Intern',
      status: 'interview',
      priority: 'medium',
      city: 'Hangzhou',
      channel: 'Official website',
      owner: 'Novak',
      applyDate: datePlus(-12),
      deadline: datePlus(2),
      nextAction: 'Prepare SQL, indexing, and project story',
      nextActionAt: reminderPlus(0, 16, 0),
      salaryRange: 'Intern package',
      tags: ['Autumn Recruiting', 'Database'],
      notes: 'Use STAR format for project explanation.',
      link: '',
    }),
    record({
      company: 'Microsoft',
      role: 'Software Engineer Intern',
      status: 'wishlist',
      priority: 'medium',
      city: 'Shanghai',
      channel: 'Career site',
      owner: 'Novak',
      applyDate: datePlus(0),
      deadline: datePlus(20),
      nextAction: 'Polish English resume and algorithm practice set',
      nextActionAt: reminderPlus(2, 20, 0),
      salaryRange: 'Competitive',
      tags: ['Autumn Recruiting', 'SWE'],
      notes: 'Confirm opening requirements before submitting.',
      link: '',
    }),
    record({
      company: 'Meituan',
      role: 'NLP Algorithm Intern',
      status: 'offer',
      priority: 'low',
      city: 'Beijing',
      channel: 'Campus talk',
      owner: 'Novak',
      applyDate: datePlus(-20),
      deadline: datePlus(7),
      nextAction: 'Compare offer details and timeline',
      nextActionAt: reminderPlus(3, 18, 0),
      salaryRange: 'Offer pending details',
      tags: ['Autumn Recruiting', 'NLP'],
      notes: 'Keep decision criteria visible: growth, mentor, workload, conversion chance.',
      link: '',
    }),
  ]
}

const normalizeBaseRecord = (record: Partial<BaseRecord> & { id: string }): BaseRecord => {
  const now = new Date().toISOString()
  const status = baseStatuses.includes(record.status as BaseRecordStatus) ? record.status as BaseRecordStatus : 'wishlist'
  return {
    id: record.id,
    company: record.company || 'Untitled Company',
    role: record.role || 'Untitled Role',
    status,
    priority: record.priority || 'medium',
    city: record.city || '',
    channel: record.channel || '',
    owner: record.owner || 'Novak',
    applyDate: record.applyDate || datePlus(0),
    deadline: record.deadline || datePlus(14),
    nextAction: record.nextAction || '',
    nextActionAt: record.nextActionAt || reminderPlus(1, 20, 0),
    salaryRange: record.salaryRange || '',
    tags: Array.isArray(record.tags) ? record.tags : [],
    notes: record.notes || '',
    link: record.link || '',
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
  }
}

const loadLocalBaseRecords = () => {
  try {
    const raw = localStorage.getItem(BASE_RECORDS_STORAGE_KEY)
    if (!raw) return createSeedBaseRecords()
    const parsed = JSON.parse(raw) as BaseRecord[]
    return Array.isArray(parsed) ? parsed.map(normalizeBaseRecord) : createSeedBaseRecords()
  } catch {
    return createSeedBaseRecords()
  }
}

const defaultFeishuConnectorConfig = (): FeishuConnectorConfig => ({
  embedUrl: '',
  appToken: '',
  tableId: '',
  viewId: '',
  appId: '',
  tenant: 'feishu',
  updatedAt: new Date().toISOString(),
})

const loadFeishuConnectorConfig = (): FeishuConnectorConfig => {
  try {
    const parsed = JSON.parse(localStorage.getItem(FEISHU_CONNECTOR_STORAGE_KEY) || '{}') as Partial<FeishuConnectorConfig>
    return {
      ...defaultFeishuConnectorConfig(),
      ...parsed,
      tenant: parsed.tenant === 'lark' ? 'lark' : 'feishu',
    }
  } catch {
    return defaultFeishuConnectorConfig()
  }
}

const loadCustomTags = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY) || '[]') as string[]
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.map((tag) => tag.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
      : []
  } catch {
    return []
  }
}

const createTemplateTasks = (templateId: TemplateId): Task[] => {
  const createdAt = new Date().toISOString()
  const base = (input: {
    title: string
    area: string
    status: Status
    priority: Priority
    start: number
    end: number
    hours: number
    tags: string[]
    notes: string
    checklist?: string[]
  }): Task => ({
    id: makeId(),
    title: input.title,
    area: input.area,
    status: input.status,
    priority: input.priority,
    startDate: datePlus(input.start),
    dueDate: datePlus(input.end),
    reminderAt: reminderPlus(input.end, 20, 0),
    reminderMins: 120,
    estimateHours: input.hours,
    progress: 0,
    tags: input.tags,
    notes: input.notes,
    checklist: (input.checklist || []).map((text) => ({
      id: makeId(),
      text,
      done: false,
    })),
    createdAt,
  })

  if (templateId === 'study') {
    return [
      base({
        title: 'Define learning goals and review rhythm',
        area: 'Learning',
        status: 'week',
        priority: 'high',
        start: 0,
        end: 1,
        hours: 1.5,
        tags: ['Goal Definition', 'Learning'],
        notes: 'Define target skills, review cadence, and completion criteria.',
        checklist: ['Choose 3 core topics', 'Set weekly review time'],
      }),
      base({
        title: 'Collect learning inputs',
        area: 'Learning',
        status: 'backlog',
        priority: 'medium',
        start: 1,
        end: 4,
        hours: 5,
        tags: ['Input', 'Notes'],
        notes: 'Collect readings, exercises, videos, and notes.',
      }),
      base({
        title: 'Build a practice project',
        area: 'Project Practice',
        status: 'backlog',
        priority: 'high',
        start: 4,
        end: 8,
        hours: 8,
        tags: ['Practice', 'Project Practice'],
        notes: 'Turn concepts into a small working project.',
        checklist: ['Define input and output', 'Finish core function', 'Write notes'],
      }),
      base({
        title: 'Review mistakes and blockers',
        area: 'Learning',
        status: 'backlog',
        priority: 'medium',
        start: 8,
        end: 9,
        hours: 2,
        tags: ['Retrospective Archive', 'Review'],
        notes: 'Record errors, blockers, and corrected understanding.',
      }),
    ]
  }

  if (templateId === 'project') {
    return [
      base({
        title: 'Project requirements',
        area: 'Project',
        status: 'week',
        priority: 'high',
        start: 0,
        end: 1,
        hours: 2,
        tags: ['Goal Definition', 'Requirements'],
        notes: 'Clarify users, scenarios, scope, and review criteria.',
      }),
      base({
        title: 'Break work into deliverable tasks',
        area: 'Project',
        status: 'backlog',
        priority: 'high',
        start: 1,
        end: 2,
        hours: 3,
        tags: ['Task Breakdown', 'Schedule Execution'],
        notes: 'Split work into tasks that can be finished in 0.5 to 2 hours.',
      }),
      base({
        title: 'Build core functionality',
        area: 'Project',
        status: 'backlog',
        priority: 'high',
        start: 2,
        end: 7,
        hours: 12,
        tags: ['Execution', 'Development'],
        notes: 'Implement the main workflow and save evidence.',
      }),
      base({
        title: 'Review, fix, and release',
        area: 'Project',
        status: 'backlog',
        priority: 'medium',
        start: 7,
        end: 9,
        hours: 4,
        tags: ['Stage Review', 'Release'],
        notes: 'Test behavior, fix issues, and prepare the handoff.',
      }),
    ]
  }

  if (templateId === 'coursework') {
    return [
      base({
        title: 'Collect sources and review requirements',
        area: 'Learning',
        status: 'week',
        priority: 'high',
        start: 0,
        end: 2,
        hours: 4,
        tags: ['Reading', 'Sources'],
        notes: 'Read requirements, collect sources, and record citations.',
      }),
      base({
        title: 'Design outline and argument',
        area: 'Learning',
        status: 'backlog',
        priority: 'high',
        start: 2,
        end: 3,
        hours: 3,
        tags: ['Goal Definition', 'Outline'],
        notes: 'Decide the thesis, structure, and supporting evidence.',
      }),
      base({
        title: 'Complete first draft',
        area: 'Learning',
        status: 'backlog',
        priority: 'high',
        start: 3,
        end: 6,
        hours: 8,
        tags: ['Writing', 'Draft'],
        notes: 'Complete the argument first, then refine the draft.',
      }),
      base({
        title: 'Citations, proofreading, and submission',
        area: 'Learning',
        status: 'backlog',
        priority: 'medium',
        start: 6,
        end: 7,
        hours: 3,
        tags: ['Stage Review', 'Submission'],
        notes: 'Check citations, format, spelling, and submission requirements.',
      }),
    ]
  }

  return [
    base({
      title: 'Most important task today',
      area: 'Schedule',
      status: 'doing',
      priority: 'high',
      start: 0,
      end: 0,
      hours: 2,
      tags: ['Today Focus'],
      notes: 'Protect this item first today.',
    }),
    base({
      title: 'Handle communication and admin',
      area: 'Schedule',
      status: 'week',
      priority: 'medium',
      start: 0,
      end: 0,
      hours: 1,
      tags: ['Communication', 'Admin'],
      notes: 'Handle messages, small admin tasks, and low-complexity items.',
    }),
    base({
      title: 'Evening review and tomorrow plan',
      area: 'Schedule',
      status: 'backlog',
      priority: 'medium',
      start: 0,
      end: 0,
      hours: 0.5,
      tags: ['Retrospective Archive', 'Tomorrow Plan'],
      notes: 'Review what was completed and choose tomorrow priorities.',
    }),
  ]
}

const normalizeTask = (task: Partial<Task> & { id: string; title: string }): Task => {
  const dueDate = task.dueDate || datePlus(2)
  const startDate =
    task.startDate ||
    format(subDays(parseISO(dueDate), Math.max(1, task.estimateHours || 1)), 'yyyy-MM-dd')
  return {
    id: task.id,
    title: task.title || 'Untitled Task',
    area: areas.includes(task.area || '') ? task.area! : 'Project',
    status: task.status || 'backlog',
    priority: task.priority || 'medium',
    startDate,
    dueDate,
    reminderAt:
      task.reminderAt ||
      format(parseISO(`${dueDate}T21:00:00`), "yyyy-MM-dd'T'HH:mm"),
    reminderMins: task.reminderMins || 120,
    estimateHours: Number(task.estimateHours) || 1,
    progress: Number(task.progress) || 0,
    tags: task.tags || [],
    notes: task.notes || '',
    checklist: task.checklist || [],
    createdAt: task.createdAt || new Date().toISOString(),
    remindedAt: task.remindedAt,
  }
}

const loadLocalTasks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeedTasks()
    const parsed = JSON.parse(raw) as Task[]
    return Array.isArray(parsed) ? parsed.map(normalizeTask) : createSeedTasks()
  } catch {
    return createSeedTasks()
  }
}

const loadLocalAutomations = (): AutomationRule[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTOMATIONS_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const loadLocalAutomationLogs = (): AutomationLog[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTOMATION_LOGS_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.slice(0, 300) : []
  } catch {
    return []
  }
}

const loadAppSettings = (): AppSettings => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}') as Partial<AppSettings>
    const defaultView = normalizeViewKey(parsed.defaultView) ?? defaultSettings.defaultView
    return {
      ...defaultSettings,
      ...parsed,
      defaultView,
      interfaceDensity: parsed.interfaceDensity === 'compact' ? 'compact' : 'comfortable',
      weekStartsOn: parsed.weekStartsOn === 'Sunday' ? 'Sunday' : 'Monday',
    }
  } catch {
    return defaultSettings
  }
}

async function fetchStartupStatus(): Promise<StartupStatus> {
  const response = await fetch('/api/system/startup', { cache: 'no-store' })
  const payload = (await response.json()) as StartupStatus & { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Could not read startup status')
  return payload
}

async function updateStartupStatus(enabled: boolean): Promise<StartupStatus> {
  const response = await fetch('/api/system/startup', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  const payload = (await response.json()) as StartupStatus & { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Could not update startup status')
  return payload
}

const getAutomationFieldValue = (task: Task, field: AutomationField) => String(task[field] || '')

const matchesAutomationCondition = (task: Task, rule: AutomationRule) =>
  !rule.conditionEnabled ||
  getAutomationFieldValue(task, rule.conditionField).toLowerCase() === rule.conditionValue.trim().toLowerCase()

const automationActionSummary = (rule: AutomationRule) => {
  if (rule.action === 'notify') return rule.actionValue || 'Show task notification'
  if (rule.action === 'set_reminder') return `${rule.actionValue || '30'} minutes from trigger`
  return rule.actionValue || 'Not configured'
}

const defaultDraft = () => ({
  title: '',
  area: 'Project',
  startDate: datePlus(0),
  dueDate: datePlus(2),
  reminderAt: reminderPlus(2, 20, 0),
  priority: 'medium' as Priority,
  estimateHours: 2,
  tags: '',
})

const dueLabel = (date: string) => {
  const now = new Date()
  const due = parseISO(date)
  const diff = differenceInCalendarDays(due, now)
  if (isToday(due)) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return `Overdue by ${Math.abs(diff)}d`
  return `${diff}d left`
}

const reminderLabel = (value: string) => {
  try {
    return format(parseISO(value), 'MM-dd HH:mm')
  } catch {
    return 'Not set'
  }
}

const getRiskLevel = (task: Task) => {
  const diff = differenceInCalendarDays(parseISO(task.dueDate), new Date())
  if (task.status === 'done') return 'Done'
  if (diff < 0) return 'Overdue'
  if (task.priority === 'high' && diff <= 2) return 'High risk'
  if (diff <= 3) return 'Due soon'
  return 'Normal'
}

const statusProgress: Record<Status, number> = {
  backlog: 0,
  week: 18,
  doing: 45,
  review: 82,
  done: 100,
}

const getTaskProgress = (task: Task) => {
  if (task.status === 'done') return 100
  const base = statusProgress[task.status]
  if (!task.checklist.length) return base
  const checklistDone = task.checklist.filter((item) => item.done).length
  const checklistProgress = Math.round((checklistDone / task.checklist.length) * 100)
  return Math.max(base, checklistProgress)
}

const projectStatusProgress: Record<ProjectStatus, number> = {
  idea: 5,
  active: 45,
  blocked: 35,
  review: 82,
  done: 100,
}

const getProjectTasks = (project: ManagedProject, tasks: Task[]) =>
  project.linkedTaskIds
    .map((taskId) => tasks.find((task) => task.id === taskId))
    .filter((task): task is Task => Boolean(task))

const getProjectProgress = (project: ManagedProject, tasks: Task[]) => {
  if (project.status === 'done') return 100
  const linkedTasks = getProjectTasks(project, tasks)
  if (!linkedTasks.length) return projectStatusProgress[project.status]
  return Math.round(linkedTasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / linkedTasks.length)
}

const getProjectRisk = (project: ManagedProject, tasks: Task[]) => {
  if (project.status === 'done') return 'Closed'
  if (project.status === 'blocked') return 'Blocked'
  const linkedTasks = getProjectTasks(project, tasks)
  if (linkedTasks.some((task) => getRiskLevel(task) === 'Overdue')) return 'Overdue task'
  const diff = differenceInCalendarDays(parseISO(project.dueDate), new Date())
  if (diff < 0) return 'Overdue project'
  if (project.priority === 'high' && diff <= 7) return 'High risk'
  if (diff <= 7) return 'Due soon'
  return 'Normal'
}

const getProgressReason = (task: Task) => {
  if (task.status === 'done') return 'Task status is Done.'
  if (!task.checklist.length) {
    return `Progress follows the current stage: ${statusMeta[task.status].title}.`
  }
  const checklistDone = task.checklist.filter((item) => item.done).length
  return `Checklist complete ${checklistDone}/${task.checklist.length}; stage fallback is ${statusMeta[task.status].title}.`
}

const getRiskScore = (task: Task) => {
  const diff = differenceInCalendarDays(parseISO(task.dueDate), new Date())
  const priorityScore = priorityMeta[task.priority].rank * 10
  const dueScore = diff < 0 ? 80 : Math.max(0, 18 - diff * 3)
  const statusScore = task.status === 'doing' ? 8 : task.status === 'week' ? 5 : 0
  return priorityScore + dueScore + statusScore - getTaskProgress(task) / 8
}

const riskClass = (task: Task) => {
  const risk = getRiskLevel(task)
  if (risk === 'Overdue') return 'danger'
  if (risk === 'High risk') return 'warning'
  if (risk === 'Due soon') return 'notice'
  return 'normal'
}

async function fetchServerTasks() {
  const response = await fetch('/api/tasks', { cache: 'no-store' })
  if (!response.ok) throw new Error('Cannot load server tasks')
  const payload = (await response.json()) as { tasks: Task[] | null }
  return payload.tasks?.map(normalizeTask) ?? null
}

async function saveServerTasks(tasks: Task[]) {
  await fetch('/api/tasks', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks }),
  })
}

async function fetchServerNotes() {
  const response = await fetch('/api/notes', { cache: 'no-store' })
  if (!response.ok) throw new Error('Cannot load server notes')
  const payload = (await response.json()) as { notes: Note[] | null }
  return payload.notes?.map(normalizeNote) ?? null
}

async function saveServerNotes(notes: Note[]) {
  await fetch('/api/notes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  })
}

async function fetchServerProjects() {
  const response = await fetch('/api/projects', { cache: 'no-store' })
  if (!response.ok) throw new Error('Cannot load server projects')
  const payload = (await response.json()) as { projects: ManagedProject[] | null }
  return payload.projects?.map(normalizeProject) ?? null
}

async function saveServerProjects(projects: ManagedProject[]) {
  await fetch('/api/projects', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects }),
  })
}

async function fetchServerBaseRecords() {
  const response = await fetch('/api/base-records', { cache: 'no-store' })
  if (!response.ok) throw new Error('Cannot load server base records')
  const payload = (await response.json()) as { records: BaseRecord[] | null }
  return payload.records?.map(normalizeBaseRecord) ?? null
}

async function saveServerBaseRecords(records: BaseRecord[]) {
  await fetch('/api/base-records', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  })
}

async function fetchChatMessages() {
  const response = await fetch('/api/chat', { cache: 'no-store' })
  if (!response.ok) return []
  const payload = (await response.json()) as { messages: ChatMessage[] }
  return payload.messages || []
}

function App() {
  const initialSettings = useMemo(loadAppSettings, [])
  const initialTasks = useMemo(loadLocalTasks, [])
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [notes, setNotes] = useState<Note[]>(loadLocalNotes)
  const [projects, setProjects] = useState<ManagedProject[]>(() => loadLocalProjects(initialTasks))
  const [baseRecords, setBaseRecords] = useState<BaseRecord[]>(loadLocalBaseRecords)
  const [feishuConfig, setFeishuConfig] = useState<FeishuConnectorConfig>(loadFeishuConnectorConfig)
  const [automations, setAutomations] = useState<AutomationRule[]>(loadLocalAutomations)
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>(loadLocalAutomationLogs)
  const [appSettings, setAppSettings] = useState<AppSettings>(initialSettings)
  const [startupStatus, setStartupStatus] = useState<StartupStatus>({
    supported: false,
    enabled: false,
    path: null,
  })
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported',
  )
  const [area, setArea] = useState('All')
  const [areaQuery, setAreaQuery] = useState('')
  const [areaSearchOpen, setAreaSearchOpen] = useState(false)
  const [learningExpanded, setLearningExpanded] = useState(true)
  const [templateQuery, setTemplateQuery] = useState('')
  const [templateSearchOpen, setTemplateSearchOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [customTags, setCustomTags] = useState<string[]>(loadCustomTags)
  const [tagDraft, setTagDraft] = useState('')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewKey>(() => {
    const requested = new URLSearchParams(window.location.search).get('view')
    return normalizeViewKey(requested) ?? initialSettings.defaultView
  })
  const [selectedId, setSelectedId] = useState<string | null>(tasks[0]?.id ?? null)
  const [draft, setDraft] = useState(defaultDraft)
  const [toast, setToast] = useState<string | null>(null)
  const [serverBacked, setServerBacked] = useState(false)
  const [notesServerBacked, setNotesServerBacked] = useState(false)
  const [projectsServerBacked, setProjectsServerBacked] = useState(false)
  const [baseServerBacked, setBaseServerBacked] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(() => new URLSearchParams(window.location.search).has('settings'))
  const [automationCreateRequest, setAutomationCreateRequest] = useState(0)
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [detailCollapsed, setDetailCollapsed] = useState(true)
  const [noteQuery, setNoteQuery] = useState('')
  const [projectQuery, setProjectQuery] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projects[0]?.id ?? null,
  )
  const [selectedBaseRecordId, setSelectedBaseRecordId] = useState<string | null>(
    baseRecords[0]?.id ?? null,
  )
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    notes[0]?.id ?? null,
  )
  const [chatMode, setChatMode] = useState<ChatMode>('coach')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatBusy, setChatBusy] = useState(false)
  const hasLoadedServer = useRef(false)

  useEffect(() => {
    fetchServerTasks()
      .then((serverTasks) => {
        if (serverTasks?.length) {
          setTasks(serverTasks)
          setSelectedId(serverTasks[0]?.id ?? null)
        } else {
          saveServerTasks(tasks).catch(() => undefined)
        }
        setServerBacked(true)
      })
      .catch(() => setServerBacked(false))
      .finally(() => {
        hasLoadedServer.current = true
      })
    fetchChatMessages().then(setChatMessages).catch(() => undefined)
    fetchServerNotes()
      .then((serverNotes) => {
        if (serverNotes?.length) {
          setNotes(serverNotes)
          setSelectedNoteId(serverNotes[0]?.id ?? null)
        } else {
          saveServerNotes(notes).catch(() => undefined)
        }
        setNotesServerBacked(true)
      })
      .catch(() => setNotesServerBacked(false))
    fetchServerProjects()
      .then((serverProjects) => {
        if (serverProjects?.length) {
          setProjects(serverProjects)
          setSelectedProjectId(serverProjects[0]?.id ?? null)
        } else {
          saveServerProjects(projects).catch(() => undefined)
        }
        setProjectsServerBacked(true)
      })
      .catch(() => setProjectsServerBacked(false))
    fetchServerBaseRecords()
      .then((serverRecords) => {
        if (serverRecords?.length) {
          setBaseRecords(serverRecords)
          setSelectedBaseRecordId(serverRecords[0]?.id ?? null)
        } else {
          saveServerBaseRecords(baseRecords).catch(() => undefined)
        }
        setBaseServerBacked(true)
      })
      .catch(() => setBaseServerBacked(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings))
  }, [appSettings])

  useEffect(() => {
    fetchStartupStatus()
      .then((status) => {
        setStartupStatus(status)
        setAppSettings((current) => ({ ...current, launchAtStartup: status.enabled }))
      })
      .catch((error) => {
        setStartupStatus({
          supported: false,
          enabled: false,
          path: null,
          error: String(error),
        })
      })
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    if (serverBacked && hasLoadedServer.current) {
      saveServerTasks(tasks).catch(() => setServerBacked(false))
    }
  }, [serverBacked, tasks])

  useEffect(() => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
    if (notesServerBacked && hasLoadedServer.current) {
      saveServerNotes(notes).catch(() => setNotesServerBacked(false))
    }
  }, [notes, notesServerBacked])

  useEffect(() => {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
    if (projectsServerBacked && hasLoadedServer.current) {
      saveServerProjects(projects).catch(() => setProjectsServerBacked(false))
    }
  }, [projects, projectsServerBacked])

  useEffect(() => {
    localStorage.setItem(BASE_RECORDS_STORAGE_KEY, JSON.stringify(baseRecords))
    if (baseServerBacked && hasLoadedServer.current) {
      saveServerBaseRecords(baseRecords).catch(() => setBaseServerBacked(false))
    }
  }, [baseRecords, baseServerBacked])

  useEffect(() => {
    localStorage.setItem(FEISHU_CONNECTOR_STORAGE_KEY, JSON.stringify(feishuConfig))
  }, [feishuConfig])

  useEffect(() => {
    localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(customTags))
  }, [customTags])

  useEffect(() => {
    localStorage.setItem(AUTOMATIONS_STORAGE_KEY, JSON.stringify(automations))
  }, [automations])

  useEffect(() => {
    localStorage.setItem(AUTOMATION_LOGS_STORAGE_KEY, JSON.stringify(automationLogs.slice(0, 300)))
  }, [automationLogs])

  useEffect(() => {
    const tick = () => {
      if (!appSettings.reminderChecksEnabled) return
      const now = Date.now()
      const nextTasks = tasks.map((task) => {
        if (task.status === 'done' || task.remindedAt || !task.reminderAt) return task
        const remindAt = parseISO(task.reminderAt).getTime()
        if (Number.isNaN(remindAt) || now < remindAt) return task
        if (now - remindAt > STALE_REMINDER_GRACE_MS) {
          return { ...task, remindedAt: new Date().toISOString() }
        }
        setToast(`${task.title} reminder fired`)
        if (appSettings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('CJ Board Reminder', {
            body: `${task.area} · ${reminderLabel(task.reminderAt)}`,
          })
        }
        return { ...task, remindedAt: new Date().toISOString() }
      })
      if (JSON.stringify(nextTasks) !== JSON.stringify(tasks)) setTasks(nextTasks)
    }
    const timer = window.setInterval(tick, 30_000)
    tick()
    return () => window.clearInterval(timer)
  }, [appSettings.notificationsEnabled, appSettings.reminderChecksEnabled, tasks])

  const filteredTasks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return tasks.filter((task) => {
      const areaMatch = area === 'All' || task.area === area || (area === 'Learning' && isLearningArea(task.area))
      const statusMatch = statusFilter === 'all' || task.status === statusFilter
      const priorityMatch =
        priorityFilter === 'all' || task.priority === priorityFilter
      const tagMatch = tagFilter === 'all' || task.tags.includes(tagFilter)
      const queryMatch =
        !needle ||
        [task.title, task.area, task.notes, ...task.tags]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      return areaMatch && statusMatch && priorityMatch && tagMatch && queryMatch
    })
  }, [area, priorityFilter, query, statusFilter, tagFilter, tasks])

  const filteredAreaTree = useMemo(() => {
    const needle = areaQuery.trim().toLowerCase()
    const parents = needle
      ? topLevelAreas.filter((item) => item.toLowerCase().includes(needle) ||
          (item === 'Learning' && learningAreas.some((child) => child.toLowerCase().includes(needle))))
      : topLevelAreas
    const children = needle
      ? learningAreas.filter((item) => item.toLowerCase().includes(needle))
      : learningAreas
    return { parents, children }
  }, [areaQuery])

  const filteredTemplates = useMemo(() => {
    const needle = templateQuery.trim().toLowerCase()
    return needle
      ? planTemplates.filter((template) =>
          [template.title, template.subtitle, template.area].join(' ').toLowerCase().includes(needle),
        )
      : planTemplates
  }, [templateQuery])

  const filteredNotes = useMemo(() => {
    const needle = noteQuery.trim().toLowerCase()
    return [...notes]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
      .filter((note) => {
        if (!needle) return true
        return [note.title, note.content, ...note.tags]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
  }, [noteQuery, notes])

  const selectedTask = tasks.find((task) => task.id === selectedId) ?? tasks[0]
  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? notes[0]
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0]
  const selectedBaseRecord = baseRecords.find((record) => record.id === selectedBaseRecordId) ?? baseRecords[0]
  const taskTagOptions = useMemo(() => {
    const tags = new Set<string>(customTags)
    tasks.forEach((task) => task.tags.forEach((tag) => tags.add(tag)))
    return Array.from(tags).filter(Boolean).sort((a, b) => a.localeCompare(b))
  }, [customTags, tasks])
  const filteredProjects = useMemo(() => {
    const needle = projectQuery.trim().toLowerCase()
    return projects.filter((project) => {
      if (!needle) return true
      return [project.name, project.objective, project.owner, project.notes, ...project.tags]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [projectQuery, projects])
  const filteredBaseRecords = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return baseRecords.filter((record) => {
      if (!needle) return true
      return [
        record.company,
        record.role,
        record.city,
        record.channel,
        record.owner,
        record.nextAction,
        record.notes,
        record.salaryRange,
        ...record.tags,
      ].join(' ').toLowerCase().includes(needle)
    })
  }, [baseRecords, query])
  const filteredTotalHours = filteredTasks.reduce((sum, task) => sum + task.estimateHours, 0)
  const filteredWeightedProgress = filteredTasks.length
    ? Math.round(filteredTasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / filteredTasks.length)
    : 0
  const filteredOverdueCount = filteredTasks.filter(
    (task) => task.status !== 'done' && isBefore(parseISO(task.dueDate), new Date()),
  ).length
  const filteredDueSoonCount = filteredTasks.filter((task) => {
    const diff = differenceInCalendarDays(parseISO(task.dueDate), new Date())
    return task.status !== 'done' && diff >= 0 && diff <= 3
  }).length
  const doneCount = tasks.filter((task) => task.status === 'done').length
  const overdueCount = tasks.filter(
    (task) => task.status !== 'done' && isBefore(parseISO(task.dueDate), new Date()),
  ).length
  const dueSoonCount = tasks.filter((task) => {
    const diff = differenceInCalendarDays(parseISO(task.dueDate), new Date())
    return task.status !== 'done' && diff >= 0 && diff <= 3
  }).length
  const weightedProgress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / tasks.length)
    : 0
  const completion = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const activeHours = tasks
    .filter((task) => task.status !== 'done')
    .reduce((sum, task) => sum + task.estimateHours, 0)
  const areaCounts = useMemo(() => {
    const counts = Object.fromEntries(areas.map((item) => [item, 0])) as Record<string, number>
    counts.All = tasks.length
    tasks.forEach((task) => {
      counts[task.area] = (counts[task.area] || 0) + 1
      if (isLearningArea(task.area) && task.area !== 'Learning') counts.Learning += 1
    })
    return counts
  }, [tasks])

  const applyTaskAutomations = (
    previous: Task | undefined,
    input: Task,
    event: 'created' | 'updated' | 'due' | 'manual',
    includeRule: (rule: AutomationRule) => boolean = () => true,
  ) => {
    let task = { ...input }
    const logs: AutomationLog[] = []
    const triggeredRuleIds: string[] = []
    const notifications: string[] = []

    for (const rule of automations) {
      if (!rule.active || !includeRule(rule)) continue
      const triggerMatches =
        event === 'manual' ||
        (rule.trigger === 'task_created' && event === 'created') ||
        (rule.trigger === 'record_updated' && event === 'updated' && previous &&
          getAutomationFieldValue(previous, rule.triggerField) !== getAutomationFieldValue(input, rule.triggerField)) ||
        (rule.trigger === 'condition_matched' && (event === 'created' || event === 'updated') &&
          matchesAutomationCondition(input, rule) && (!previous || !matchesAutomationCondition(previous, rule))) ||
        (rule.trigger === 'due_time' && event === 'due')
      if (!triggerMatches || !matchesAutomationCondition(task, rule)) continue

      let detail = ''
      if (rule.action === 'set_status') {
        task = { ...task, status: rule.actionValue as Status }
        detail = `Status changed to ${statusMeta[task.status]?.title || task.status}`
      } else if (rule.action === 'set_priority') {
        task = { ...task, priority: rule.actionValue as Priority }
        detail = `Priority changed to ${priorityMeta[task.priority]?.label || task.priority}`
      } else if (rule.action === 'add_tag') {
        const tag = rule.actionValue.trim()
        task = tag && !task.tags.includes(tag) ? { ...task, tags: [...task.tags, tag] } : task
        detail = tag ? `Tag added: ${tag}` : 'No tag configured'
      } else if (rule.action === 'set_reminder') {
        const minutes = Math.max(1, Number(rule.actionValue) || 30)
        const remindAt = new Date(Date.now() + minutes * 60_000)
        task = { ...task, reminderAt: format(remindAt, "yyyy-MM-dd'T'HH:mm"), remindedAt: undefined }
        detail = `Reminder scheduled in ${minutes} minutes`
      } else {
        detail = rule.actionValue.trim() || `Automation ran for ${task.title}`
        notifications.push(detail)
      }

      triggeredRuleIds.push(rule.id)
      logs.push({
        id: makeId(),
        ruleId: rule.id,
        ruleName: rule.name,
        taskId: task.id,
        taskTitle: task.title,
        result: 'Succeeded',
        detail,
        createdAt: new Date().toISOString(),
      })
    }

    return { task, logs, triggeredRuleIds, notifications }
  }

  const recordAutomationRun = (result: ReturnType<typeof applyTaskAutomations>) => {
    if (!result.logs.length) return
    setAutomationLogs((current) => [...result.logs, ...current].slice(0, 300))
    setAutomations((current) => current.map((rule) =>
      result.triggeredRuleIds.includes(rule.id)
        ? { ...rule, runCount: (rule.runCount || 0) + 1, updatedAt: new Date().toISOString() }
        : rule,
    ))
    result.notifications.forEach((message) => {
      setToast(message)
      if (
        appSettings.notificationsEnabled &&
        appSettings.automationNotificationsEnabled &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification('CJ Board Automation', { body: message })
      }
    })
  }

  useEffect(() => {
    const runDueAutomations = () => {
      if (!automations.some((rule) => rule.active && rule.trigger === 'due_time')) return
      const today = format(new Date(), 'yyyy-MM-dd')
      const results: Array<ReturnType<typeof applyTaskAutomations>> = []
      const nextTasks = tasks.map((task) => {
        if (task.status === 'done' || task.dueDate > today) return task
        const result = applyTaskAutomations(undefined, task, 'due', (rule) =>
          !automationLogs.some((log) =>
            log.ruleId === rule.id && log.taskId === task.id && log.createdAt.startsWith(today),
          ),
        )
        if (result.logs.length) results.push(result)
        return result.task
      })
      if (!results.length) return
      setTasks(nextTasks)
      results.forEach(recordAutomationRun)
    }
    const timer = window.setInterval(runDueAutomations, 60_000)
    runDueAutomations()
    return () => window.clearInterval(timer)
    // The interval is intentionally refreshed when task, rule, or log state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSettings.automationNotificationsEnabled, appSettings.notificationsEnabled, automationLogs, automations, tasks])

  const updateTask = (taskId: string, patch: Partial<Task>) => {
    const previous = tasks.find((task) => task.id === taskId)
    if (!previous) return
    const result = applyTaskAutomations(previous, { ...previous, ...patch }, 'updated')
    setTasks((current) => current.map((task) => (task.id === taskId ? result.task : task)))
    recordAutomationRun(result)
  }

  const updateNote = (noteId: string, patch: Partial<Note>) => {
    setNotes((current) =>
      current.map((note) =>
        note.id === noteId ? { ...note, ...patch, updatedAt: new Date().toISOString() }
          : note,
      ),
    )
  }

  const addNote = () => {
    const now = new Date().toISOString()
    const next: Note = {
      id: makeId(),
      title: 'Untitled Note',
      content: '# Untitled Note\n\nStart writing here.',
      tags: ['Draft'],
      linkedTaskIds: selectedTask?.id ? [selectedTask.id] : [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }
    setNotes((current) => [next, ...current])
    setSelectedNoteId(next.id)
    setView('knowledge')
  }

  const deleteNote = (noteId: string) => {
    const target = notes.find((note) => note.id === noteId)
    if (!target) return
    if (appSettings.confirmDestructiveActions && !window.confirm(`Delete note "${target.title}"?`)) return
    const next = notes.filter((note) => note.id !== noteId)
    setNotes(next)
    setSelectedNoteId(next[0]?.id ?? null)
  }

  const addTask = () => {
    if (!draft.title.trim()) return
    const nextTask: Task = {
      id: makeId(),
      title: draft.title.trim(),
      area: draft.area,
      status: 'backlog',
      priority: draft.priority,
      startDate: draft.startDate,
      dueDate: draft.dueDate,
      reminderAt: draft.reminderAt,
      reminderMins: 120,
      estimateHours: Number(draft.estimateHours) || 1,
      progress: 0,
      tags: Array.from(new Set([
        'Quick Add',
        ...draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      ])),
      notes: '',
      checklist: [],
      createdAt: new Date().toISOString(),
    }
    const result = applyTaskAutomations(undefined, nextTask, 'created')
    setTasks((current) => [result.task, ...current])
    recordAutomationRun(result)
    setSelectedId(result.task.id)
    setDraft(defaultDraft())
  }

  const addChecklistItem = (taskId: string) => {
    const text = window.prompt('Checklist item')
    if (!text?.trim()) return
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return
    updateTask(taskId, {
      checklist: [...task.checklist, { id: makeId(), text: text.trim(), done: false }],
    })
  }

  const sendChat = async (message = chatInput) => {
    const clean = message.trim()
    if (!clean || chatBusy) return
    const optimistic: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: clean,
      mode: chatMode,
      createdAt: new Date().toISOString(),
    }
    setChatMessages((current) => [...current, optimistic])
    setChatInput('')
    setChatBusy(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clean, mode: chatMode, task: selectedTask, tasks }),
      })
      const payload = (await response.json()) as {
        message?: ChatMessage
        messages?: ChatMessage[]
        error?: string
      }
      if (!response.ok) throw new Error(payload.error || 'chat failed')
      if (payload.messages) setChatMessages(payload.messages)
      else if (payload.message) setChatMessages((current) => [...current, payload.message!])
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: 'assistant',
          content: `Learning agent error: ${String(error)}`,
          provider: 'client-error',
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setChatBusy(false)
    }
  }

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId, source } = result
    if (!destination) return
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }
    const visibleIds = filteredTasks.map((task) => task.id)
    const visible = tasks.filter((task) => visibleIds.includes(task.id))
    const hidden = tasks.filter((task) => !visibleIds.includes(task.id))
    const dragged = visible.find((task) => task.id === draggableId)
    if (!dragged) return
    const withoutDragged = visible.filter((task) => task.id !== draggableId)
    const destinationStatus = destination.droppableId as Status
    const destinationPeers = withoutDragged.filter(
      (task) => task.status === destinationStatus,
    )
    const beforeId = destinationPeers[destination.index]?.id
    const changed = {
      ...dragged,
      status: destinationStatus,
    }
    const automationResult = applyTaskAutomations(dragged, changed, 'updated')
    const rebuilt: Task[] = []
    let inserted = false
    for (const task of withoutDragged) {
      if (task.id === beforeId) {
        rebuilt.push(automationResult.task)
        inserted = true
      }
      rebuilt.push(task)
    }
    if (!inserted) rebuilt.push(automationResult.task)
    setTasks([...rebuilt, ...hidden])
    recordAutomationRun(automationResult)
    setSelectedId(draggableId)
  }

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported')
      setAppSettings((current) => ({ ...current, notificationsEnabled: false }))
      setToast('Desktop notifications are not supported in this runtime.')
      return
    }
    const result = await Notification.requestPermission()
    setNotificationPermission(result)
    setAppSettings((current) => ({ ...current, notificationsEnabled: result === 'granted' }))
    setToast(result === 'granted' ? 'Desktop notifications enabled' : 'Desktop notifications were not enabled')
  }

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setAppSettings((current) => ({ ...current, [key]: value }))
  }

  const addCustomTag = () => {
    const clean = tagDraft.trim()
    if (!clean) return
    setCustomTags((current) => Array.from(new Set([...current, clean])).sort((a, b) => a.localeCompare(b)))
    setTagFilter(clean)
    setTagDraft('')
    setToast(`Tag added: ${clean}`)
  }

  const deleteCustomTag = (tag: string) => {
    setCustomTags((current) => current.filter((item) => item !== tag))
    if (tagFilter === tag) setTagFilter('all')
    setToast(`Tag removed: ${tag}`)
  }

  const toggleStartup = async (enabled: boolean) => {
    setAppSettings((current) => ({ ...current, launchAtStartup: enabled }))
    try {
      const status = await updateStartupStatus(enabled)
      setStartupStatus(status)
      setAppSettings((current) => ({ ...current, launchAtStartup: status.enabled }))
      setToast(status.enabled ? 'Launch at startup enabled' : 'Launch at startup disabled')
    } catch (error) {
      setStartupStatus((current) => ({ ...current, error: String(error) }))
      setAppSettings((current) => ({ ...current, launchAtStartup: startupStatus.enabled }))
      setToast(`Startup setting failed: ${String(error)}`)
    }
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `studyboard-plan-${format(new Date(), 'yyyyMMdd-HHmm')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importData = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Task[]
        if (!Array.isArray(parsed)) throw new Error('Invalid file')
        const normalized = parsed.map(normalizeTask)
        setTasks(normalized)
        setSelectedId(normalized[0]?.id ?? null)
        setToast('Import complete')
      } catch {
        setToast('Import failed: invalid file')
      }
    }
    reader.readAsText(file)
  }

  const resetDemo = () => {
    if (appSettings.confirmDestructiveActions && !window.confirm('Reset demo data? Current tasks will be replaced.')) return
    const next = createSeedTasks()
    const nextProjects = createSeedProjects(next)
    setTasks(next)
    setProjects(nextProjects)
    setSelectedId(next[0]?.id ?? null)
    setSelectedProjectId(nextProjects[0]?.id ?? null)
    setToast('Demo data restored')
  }

  const applyTemplate = (templateId: TemplateId) => {
    const template = planTemplates.find((item) => item.id === templateId)
    const next = createTemplateTasks(templateId)
    setTasks((current) => [...next, ...current])
    setSelectedId(next[0]?.id ?? null)
    setArea(template?.area || 'All')
    setStatusFilter('all')
    setPriorityFilter('all')
    setView('overview')
    setToast(`${template?.title || 'Template'} added`)
  }

  const createAutomation = (input: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>) => {
    const now = new Date().toISOString()
    setAutomations((current) => [{ ...input, id: makeId(), createdAt: now, updatedAt: now, runCount: 0 }, ...current])
    setToast('Automation saved and activated')
  }

  const toggleAutomation = (ruleId: string) => {
    setAutomations((current) => current.map((rule) =>
      rule.id === ruleId ? { ...rule, active: !rule.active, updatedAt: new Date().toISOString() } : rule,
    ))
  }

  const deleteAutomation = (ruleId: string) => {
    const rule = automations.find((item) => item.id === ruleId)
    if (!rule) return
    if (appSettings.confirmDestructiveActions && !window.confirm(`Delete automation "${rule.name}"?`)) return
    setAutomations((current) => current.filter((item) => item.id !== ruleId))
    setToast('Automation deleted')
  }

  const addProject = () => {
    const now = new Date().toISOString()
    const next: ManagedProject = {
      id: makeId(),
      name: 'Untitled Project',
      objective: 'Define the outcome, key stages, and first linked tasks.',
      status: 'idea',
      priority: 'medium',
      owner: 'Novak',
      startDate: datePlus(0),
      dueDate: datePlus(21),
      linkedTaskIds: selectedTask?.id ? [selectedTask.id] : [],
      tags: ['Project'],
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
    setProjects((current) => [next, ...current])
    setSelectedProjectId(next.id)
    setView('projects')
    setToast('Project created')
  }

  const updateProject = (projectId: string, patch: Partial<ManagedProject>) => {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? { ...project, ...patch, updatedAt: new Date().toISOString() }
          : project,
      ),
    )
  }

  const deleteProject = (projectId: string) => {
    const target = projects.find((project) => project.id === projectId)
    if (!target) return
    if (appSettings.confirmDestructiveActions && !window.confirm(`Delete project "${target.name}"?`)) return
    const next = projects.filter((project) => project.id !== projectId)
    setProjects(next)
    setSelectedProjectId(next[0]?.id ?? null)
    setToast('Project deleted')
  }

  const addBaseRecord = () => {
    const now = new Date().toISOString()
    const next: BaseRecord = {
      id: makeId(),
      company: 'Untitled Company',
      role: 'Open Role',
      status: 'wishlist',
      priority: 'medium',
      city: '',
      channel: '',
      owner: 'Novak',
      applyDate: datePlus(0),
      deadline: datePlus(14),
      nextAction: 'Define next action',
      nextActionAt: reminderPlus(1, 20, 0),
      salaryRange: '',
      tags: ['Autumn Recruiting'],
      notes: '',
      link: '',
      createdAt: now,
      updatedAt: now,
    }
    setBaseRecords((current) => [next, ...current])
    setSelectedBaseRecordId(next.id)
    setView('base')
    setToast('Base record created')
  }

  const updateBaseRecord = (recordId: string, patch: Partial<BaseRecord>) => {
    setBaseRecords((current) =>
      current.map((record) =>
        record.id === recordId
          ? { ...record, ...patch, updatedAt: new Date().toISOString() }
          : record,
      ),
    )
  }

  const updateFeishuConfig = (patch: Partial<FeishuConnectorConfig>) => {
    setFeishuConfig((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }))
    setToast('Feishu connector settings saved')
  }

  const importBaseRecords = (records: BaseRecord[]) => {
    const normalized = records.map((record) => normalizeBaseRecord(record))
    setBaseRecords(normalized)
    setSelectedBaseRecordId(normalized[0]?.id ?? null)
    setToast(`Imported ${normalized.length} base records`)
  }

  const deleteBaseRecord = (recordId: string) => {
    const target = baseRecords.find((record) => record.id === recordId)
    if (!target) return
    if (appSettings.confirmDestructiveActions && !window.confirm(`Delete record "${target.company} / ${target.role}"?`)) return
    const next = baseRecords.filter((record) => record.id !== recordId)
    setBaseRecords(next)
    setSelectedBaseRecordId(next[0]?.id ?? null)
    setToast('Base record deleted')
  }

  const openTaskDetail = (taskId: string) => {
    setSelectedId(taskId)
    setDetailCollapsed(false)
  }

  const runAutomationNow = (ruleId: string) => {
    const task = selectedTask || tasks[0]
    if (!task) {
      setToast('Create or select a task before testing an automation')
      return
    }
    const result = applyTaskAutomations(task, task, 'manual', (rule) => rule.id === ruleId)
    if (!result.logs.length) {
      setToast('Automation is inactive or its condition does not match the selected task')
      return
    }
    setTasks((current) => current.map((item) => item.id === task.id ? result.task : item))
    recordAutomationRun(result)
    setToast(`Automation ran on ${task.title}`)
  }

  const tableColumns = [
    {
      title: 'Task',
      dataIndex: 'title',
      width: 260,
      render: (_: unknown, record: Task) => (
        <button
          type="button"
          className="tableTaskButton"
          onClick={() => openTaskDetail(record.id)}
        >
          <strong>{record.title}</strong>
          <span>{record.tags.slice(0, 3).join(' / ') || 'No tags'}</span>
        </button>
      ),
    },
    { title: 'Area', dataIndex: 'area', width: 120, render: (value: string) => <Tag>{value}</Tag> },
    {
      title: 'Stage',
      dataIndex: 'status',
      width: 120,
      render: (value: Status) => (
        <Badge color={statusMeta[value].color} text={statusMeta[value].title} />
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      width: 90,
      render: (value: Priority) => (
        <Tag color={priorityMeta[value].color}>{priorityMeta[value].label}</Tag>
      ),
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

  const taskCommandViews: ViewKey[] = ['board', 'table', 'charts', 'process']
  const showTaskCommandDeck = taskCommandViews.includes(view)

  const pageNavItems: Array<{ key: ViewKey; label: string; hint: string; icon: ReactNode }> = [
    { key: 'overview', label: 'Overview', hint: 'Daily command center', icon: <LayoutDashboard size={15} /> },
    { key: 'board', label: 'Tasks', hint: 'Board, table, timeline', icon: <ListFilter size={15} /> },
    { key: 'projects', label: 'Projects', hint: 'Portfolio progress', icon: <Target size={15} /> },
    { key: 'base', label: 'Base', hint: 'Multiview records', icon: <Database size={15} /> },
    { key: 'knowledge', label: 'Knowledge', hint: 'Notes and graph', icon: <Network size={15} /> },
    { key: 'automations', label: 'Automations', hint: 'Rules and logs', icon: <Workflow size={15} /> },
    { key: 'audit', label: 'Audit', hint: 'Health and UX checks', icon: <CheckCircle2 size={15} /> },
  ]

  return (
    <main className={clsx('appShell', appSettings.interfaceDensity === 'compact' && 'densityCompact', navCollapsed && 'navCollapsed', detailCollapsed && 'detailCollapsed')}>
      <aside className={clsx('sidebar', navCollapsed && 'sidebarCollapsed')}>
        <div className="brand">
          <div className="brandIcon"><LayoutDashboard size={20} /></div>
          <div className="brandCopy">
            <strong>CJ Board</strong>
            <span>{serverBacked ? 'Desktop sync on' : 'Local browser mode'}</span>
          </div>
        </div>

        <Tooltip content={navCollapsed ? 'Expand navigation' : 'Collapse navigation'} position="right">
          <button
            type="button"
            className="sidebarEdgeToggle"
            onClick={() => setNavCollapsed((current) => !current)}
            aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {navCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </Tooltip>

        <section className="sideSection sidebarContent">
          <div className="sectionLabel"><LayoutDashboard size={14} /> Pages</div>
          <nav className="pageNav" aria-label="CJ Board pages">
            {pageNavItems.map((item) => (
              <button
                type="button"
                key={item.key}
                className={clsx((view === item.key || (item.key === 'board' && ['board', 'table', 'charts', 'process'].includes(view))) && 'active')}
                onClick={() => setView(item.key)}
              >
                {item.icon}
                <span><strong>{item.label}</strong><small>{item.hint}</small></span>
              </button>
            ))}
          </nav>
        </section>

        <section className="sideSection sidebarContent">
          <button
            type="button"
            className={clsx('sectionLabel sectionFilterToggle', areaSearchOpen && 'active')}
            onClick={() => setAreaSearchOpen((current) => !current)}
            aria-expanded={areaSearchOpen}
          >
            <span><Filter size={14} /> Areas</span>
            <Search size={14} />
          </button>
          {areaSearchOpen && (
            <label className="sideSearch">
              <Search size={14} />
              <input autoFocus value={areaQuery} onChange={(event) => setAreaQuery(event.target.value)} placeholder="Filter areas" />
              {areaQuery && <button type="button" onClick={() => setAreaQuery('')} aria-label="Clear area filter"><X size={13} /></button>}
            </label>
          )}
          <div className="areaList scrollableSideList">
            {filteredAreaTree.parents.map((item) => item === 'Learning' ? (
              <div className="areaTreeGroup" key={item}>
                <button
                  type="button"
                  className={clsx('areaButton areaParentButton', isLearningArea(area) && 'sectionActive', item === area && 'active')}
                  onClick={() => {
                    setArea('Learning')
                    setLearningExpanded((current) => !current)
                  }}
                >
                  <span><BookOpen size={14} />Learning</span>
                  <span className="areaButtonMeta"><small>{areaCounts.Learning}</small><ChevronRight className={clsx((learningExpanded || areaQuery) && 'expanded')} size={14} /></span>
                </button>
                {(learningExpanded || Boolean(areaQuery)) && (
                  <div className="areaChildren">
                    {filteredAreaTree.children.map((child) => (
                      <button
                        key={child}
                        type="button"
                        className={clsx('areaButton areaChildButton', child === area && 'active')}
                        onClick={() => setArea(child)}
                      >
                        <span>{child}</span><small>{areaCounts[child] || 0}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={item}
                type="button"
                className={clsx('areaButton', item === area && 'active')}
                onClick={() => setArea(item)}
              >
                <span>{item}</span><span className="areaButtonMeta"><small>{areaCounts[item] || 0}</small><ChevronRight size={14} /></span>
              </button>
            ))}
            {!filteredAreaTree.parents.length && <p className="sideEmpty">No matching areas</p>}
          </div>
        </section>

        <section className="sideSection sidebarContent">
          <div className="sectionLabel"><Plus size={14} /> Quick Add</div>
          <div className="quickAdd">
            <Input value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} placeholder="Task title" />
            <Select value={draft.area} onChange={(value) => setDraft((current) => ({ ...current, area: String(value) }))}>
              {areas.slice(1).map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
            </Select>
            <div className="formGrid">
              <input type="date" value={draft.startDate} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} />
              <input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
            </div>
            <input type="datetime-local" value={draft.reminderAt} onChange={(event) => setDraft((current) => ({ ...current, reminderAt: event.target.value }))} />
            <label className="quickTagInput">
              <Hash size={14} />
              <input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="Custom tags, comma separated" />
            </label>
            <Button type="primary" icon={<Plus size={16} />} onClick={addTask}>Add Task</Button>
          </div>
        </section>

        <section className="sideSection sidebarContent">
          <button
            type="button"
            className={clsx('sectionLabel sectionFilterToggle', templateSearchOpen && 'active')}
            onClick={() => setTemplateSearchOpen((current) => !current)}
            aria-expanded={templateSearchOpen}
          >
            <span><LayoutDashboard size={14} /> Templates</span>
            <small>{filteredTemplates.length}</small>
            <Search size={14} />
          </button>
          {templateSearchOpen && (
            <label className="sideSearch">
              <Search size={14} />
              <input autoFocus value={templateQuery} onChange={(event) => setTemplateQuery(event.target.value)} placeholder="Find templates" />
              {templateQuery && <button type="button" onClick={() => setTemplateQuery('')} aria-label="Clear template filter"><X size={13} /></button>}
            </label>
          )}
          <div className="templateList scrollableSideList templateManagerList">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.id)}
              >
                <strong>{template.title}</strong>
                <span>{template.subtitle}</span>
              </button>
            ))}
            {!filteredTemplates.length && <p className="sideEmpty">No matching templates</p>}
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Planning Operations</p>
            <h1>CJ Board</h1>
          </div>
          <div className="toolbar">
            <label className="searchBox">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, tags, notes" />
            </label>
            <Button icon={<FileText size={17} />} onClick={addNote} title="Create note">New Note</Button>
            <Button icon={<Target size={17} />} onClick={addProject} title="Create project">New Project</Button>
            <Button icon={<Database size={17} />} onClick={addBaseRecord} title="Create base record">New Record</Button>
            <Button
              icon={<Workflow size={17} />}
              onClick={() => {
                setView('automations')
                setAutomationCreateRequest((current) => current + 1)
              }}
              title="Add automation"
            >Automations</Button>
            <Button type="primary" icon={<Bot size={17} />} onClick={() => setAssistantOpen(true)} title="Open assistant">Assistant</Button>
            <button type="button" className="iconButton" onClick={() => setSettingsOpen(true)} title="Open settings" aria-label="Open settings"><Settings size={17} /></button>
          </div>
        </header>

        {showTaskCommandDeck && (
          <section className="taskCommandDeck">
            <section className="filterBand">
              <div className="filterTitle"><SlidersHorizontal size={16} /><span>Task Filters</span></div>
              <Select value={statusFilter} onChange={(value) => setStatusFilter(value as Status | 'all')}>
                <Select.Option value="all">All stages</Select.Option>
                {columns.map((column) => <Select.Option key={column.id} value={column.id}>{column.title}</Select.Option>)}
              </Select>
              <Select value={priorityFilter} onChange={(value) => setPriorityFilter(value as Priority | 'all')}>
                <Select.Option value="all">All priorities</Select.Option>
                <Select.Option value="high">High priority</Select.Option>
                <Select.Option value="medium">Medium priority</Select.Option>
                <Select.Option value="low">Low priority</Select.Option>
              </Select>
              <Select value={tagFilter} onChange={(value) => setTagFilter(String(value))}>
                <Select.Option value="all">All tags</Select.Option>
                {taskTagOptions.map((tag) => <Select.Option key={tag} value={tag}>{tag}</Select.Option>)}
              </Select>
              <form className="customTagControl" onSubmit={(event) => { event.preventDefault(); addCustomTag() }}>
                <Hash size={14} />
                <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder="Custom tag" />
                <button type="submit" aria-label="Add custom tag"><Plus size={14} /></button>
              </form>
              {tagFilter !== 'all' && customTags.includes(tagFilter) && (
                <button type="button" className="removeTagButton" onClick={() => deleteCustomTag(tagFilter)} title="Remove selected custom tag">
                  <Trash2 size={14} />
                </button>
              )}
              <Tag color={overdueCount ? 'red' : 'green'}>Overdue {overdueCount}</Tag>
              <Tag color={dueSoonCount ? 'orange' : 'green'}>Due in 3d {dueSoonCount}</Tag>
            </section>

            <section className="metricGrid">
              <Metric icon={<Target size={18} />} label="Completion" value={`${completion}%`} />
              <Metric icon={<Flame size={18} />} label="Overdue" value={`${overdueCount}`} />
              <Metric icon={<CalendarClock size={18} />} label="Due in 3d" value={`${dueSoonCount}`} />
              <Metric icon={<Clock3 size={18} />} label="Open hours" value={`${activeHours}h`} />
            </section>

            <section className="presetBand">
              <button type="button" onClick={() => { setPriorityFilter('high'); setStatusFilter('all'); setView('overview') }}>
                <strong>Risk View</strong>
                <span>High priority and due soon</span>
              </button>
              <button type="button" onClick={() => { setStatusFilter('doing'); setPriorityFilter('all'); setView('board') }}>
                <strong>Execution View</strong>
                <span>Only active work</span>
              </button>
              <button type="button" onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setView('charts') }}>
                <strong>Timeline</strong>
                <span>Inside analytics dashboard</span>
              </button>
              <button type="button" onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setView('charts') }}>
                <strong>Analytics</strong>
                <span>Load and distribution</span>
              </button>
            </section>
          </section>
        )}

        <Tabs activeTab={view} onChange={(key) => setView(key as ViewKey)}>
          <Tabs.TabPane key="overview" title="Overview">
            <OverviewView
              tasks={filteredTasks}
              totalTasks={tasks.length}
              completion={completion}
              overdueCount={overdueCount}
              dueSoonCount={dueSoonCount}
              weightedProgress={weightedProgress}
              setSelectedId={openTaskDetail}
              onNavigate={setView}
              summary={{
                taskCount: tasks.length,
                projectCount: projects.length,
                baseRecordCount: baseRecords.length,
                noteCount: notes.length,
                automationCount: automations.length,
              }}
            />
          </Tabs.TabPane>
          <Tabs.TabPane key="projects" title={<TabTitle icon={<Target size={15} />} text="Projects" />}>
            <ProjectManagementView
              projects={filteredProjects}
              allProjects={projects}
              tasks={tasks}
              selectedProject={selectedProject}
              projectQuery={projectQuery}
              setProjectQuery={setProjectQuery}
              setSelectedProjectId={setSelectedProjectId}
              setSelectedTaskId={openTaskDetail}
              addProject={addProject}
              updateProject={updateProject}
              deleteProject={deleteProject}
            />
          </Tabs.TabPane>
          <Tabs.TabPane key="base" title={<TabTitle icon={<Database size={15} />} text="Base" />}>
            <BaseRecordsView
              records={filteredBaseRecords}
              allRecords={baseRecords}
              selectedRecord={selectedBaseRecord}
              feishuConfig={feishuConfig}
              onSelect={setSelectedBaseRecordId}
              onAdd={addBaseRecord}
              onUpdate={updateBaseRecord}
              onDelete={deleteBaseRecord}
              onConfigUpdate={updateFeishuConfig}
              onImportRecords={importBaseRecords}
            />
          </Tabs.TabPane>
          <Tabs.TabPane key="knowledge" title={<TabTitle icon={<Network size={15} />} text="Knowledge" />}>
            <KnowledgeView
              notes={notes}
              tasks={tasks}
              filteredNotes={filteredNotes}
              selectedNote={selectedNote}
              noteQuery={noteQuery}
              setNoteQuery={setNoteQuery}
              setSelectedNoteId={setSelectedNoteId}
              updateNote={updateNote}
              addNote={addNote}
              deleteNote={deleteNote}
            />
          </Tabs.TabPane>
          <Tabs.TabPane key="charts" title={<TabTitle icon={<BarChart3 size={15} />} text="Charts" />}>
            <ChartsView tasks={filteredTasks} totalTasks={filteredTasks.length} totalHours={filteredTotalHours} weightedProgress={filteredWeightedProgress} overdueCount={filteredOverdueCount} dueSoonCount={filteredDueSoonCount} setSelectedId={openTaskDetail} />
          </Tabs.TabPane>
          <Tabs.TabPane key="board" title={<TabTitle icon={<ListFilter size={15} />} text="Board" />}>
            <BoardView filteredTasks={filteredTasks} selectedTask={selectedTask} scope={area} onDragEnd={onDragEnd} setSelectedId={openTaskDetail} />
          </Tabs.TabPane>
          <Tabs.TabPane key="automations" title={<TabTitle icon={<Workflow size={15} />} text="Automations" />}>
            <AutomationCenterV2
              rules={automations}
              logs={automationLogs}
              selectedTask={selectedTask}
              createRequest={automationCreateRequest}
              onCreate={createAutomation}
              onToggle={toggleAutomation}
              onDelete={deleteAutomation}
              onRun={runAutomationNow}
              onClearLogs={() => {
                if (appSettings.confirmDestructiveActions && !window.confirm('Clear automation activity log?')) return
                setAutomationLogs([])
              }}
            />
          </Tabs.TabPane>
          <Tabs.TabPane key="audit" title={<TabTitle icon={<CheckCircle2 size={15} />} text="Audit" />}>
            <AuditView
              tasks={tasks}
              notes={notes}
              projects={projects}
              baseRecords={baseRecords}
              automations={automations}
              logs={automationLogs}
              settings={appSettings}
              startupStatus={startupStatus}
              notificationPermission={notificationPermission}
              syncStatus={{
                tasks: serverBacked,
                notes: notesServerBacked,
                projects: projectsServerBacked,
                base: baseServerBacked,
              }}
              onNavigate={setView}
              onOpenSettings={() => setSettingsOpen(true)}
              onRequestNotifications={requestNotifications}
            />
          </Tabs.TabPane>
          <Tabs.TabPane key="table" title="Table">
            <section className="tablePanel"><Table rowKey="id" columns={tableColumns} data={filteredTasks} pagination={false} scroll={{ x: 1160, y: 560 }} /></section>
          </Tabs.TabPane>
          <Tabs.TabPane key="process" title="Process">
            <ProcessView tasks={filteredTasks} />
          </Tabs.TabPane>
        </Tabs>
      </section>

      <TaskDetail
        selectedTask={selectedTask}
        updateTask={updateTask}
        addChecklistItem={addChecklistItem}
        collapsed={detailCollapsed}
        setCollapsed={setDetailCollapsed}
      />

      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          requestNotifications={requestNotifications}
          exportData={exportData}
          importData={importData}
          resetDemo={resetDemo}
          serverBacked={serverBacked}
          notesServerBacked={notesServerBacked}
          projectsServerBacked={projectsServerBacked}
          baseServerBacked={baseServerBacked}
          settings={appSettings}
          updateSetting={updateSetting}
          notificationPermission={notificationPermission}
          startupStatus={startupStatus}
          toggleStartup={toggleStartup}
        />
      )}

      {assistantOpen && (
        <section className="assistantOverlay">
          <div className="assistantPanel">
            <header className="assistantHeader">
              <div>
                <p className="eyebrow">Terminal API</p>
                <h2>Learning Assistant</h2>
                <span>Current task: {selectedTask ? `${selectedTask.area} / ${selectedTask.title}` : 'No task selected'}</span>
              </div>
              <Button onClick={() => setAssistantOpen(false)}>Close</Button>
            </header>

            <div className="modeTabs">
              {chatModes.map((mode) => (
                <button key={mode.id} type="button" className={clsx(mode.id === chatMode && 'active')} onClick={() => setChatMode(mode.id)}>
                  {mode.icon}
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="quickPrompts">
              <button type="button" onClick={() => sendChat('Analyze the current task and give me the next execution steps.')}>Next steps</button>
              <button type="button" onClick={() => sendChat('Review the current plan for risks and priorities.')}>Risks</button>
              <button type="button" onClick={() => sendChat('Based on the current work, choose my top 3 tasks for today.')}>Top 3</button>
            </div>

            <div className="chatLog">
              {!chatMessages.length && (
                <div className="assistantEmpty">
                  <Bot size={32} />
                  <strong>Ask the learning agent.</strong>
                  <p>The current task is sent to local <code>/api/chat</code>, which bridges to the Codex terminal agent.</p>
                </div>
              )}
              {chatMessages.map((message) => (
                <article key={message.id} className={clsx('chatBubble', message.role === 'user' && 'user')}>
                  <span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
                  <p>{message.content}</p>
                </article>
              ))}
            </div>

            <form className="chatComposer" onSubmit={(event) => { event.preventDefault(); sendChat() }}>
              <textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about a task, code explanation, progress, SQL, algorithms, or learning strategy." />
              <Button htmlType="submit" type="primary" icon={<Send size={17} />} loading={chatBusy} disabled={!chatInput.trim()}>Send</Button>
            </form>
          </div>
        </section>
      )}

      {toast && <button type="button" className="toast" onClick={() => setToast(null)}>{toast}</button>}
    </main>
  )
}

function TabTitle({ icon, text }: { icon: ReactNode; text: string }) {
  return <span className="tabTitle">{icon}{text}</span>
}

function BoardView({
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
                        {(dragProvided, dragSnapshot) => (
                          <button type="button" className={clsx('taskCard', selectedTask?.id === task.id && 'selected', dragSnapshot.isDragging && 'dragging')} ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps} onClick={() => setSelectedId(task.id)}>
                            <div className="cardTop">
                              <span className={clsx('priority', priorityMeta[task.priority].className)}>{priorityMeta[task.priority].label}</span>
                              <span className="dueText">{dueLabel(task.dueDate)}</span>
                            </div>
                            <h3>{task.title}</h3>
                            <span className="cardDetailIcon" aria-hidden="true"><PanelRightOpen size={15} /></span>
                            <p>{task.area} · {task.startDate} to {task.dueDate}</p>
                            <div className="reminderLine"><Bell size={13} />{reminderLabel(task.reminderAt)}</div>
                            <div className="progressTrack"><span style={{ width: `${getTaskProgress(task)}%` }} /></div>
                            <div className="tagRow">{task.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
                          </button>
                        )}
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

function AutomationCenter({
  rules,
  logs,
  selectedTask,
  createRequest,
  onCreate,
  onToggle,
  onDelete,
  onRun,
  onClearLogs,
}: {
  rules: AutomationRule[]
  logs: AutomationLog[]
  selectedTask?: Task
  createRequest: number
  onCreate: (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>) => void
  onToggle: (ruleId: string) => void
  onDelete: (ruleId: string) => void
  onRun: (ruleId: string) => void
  onClearLogs: () => void
}) {
  const [section, setSection] = useState<'manage' | 'activity'>('manage')
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState({
    name: '',
    active: true,
    trigger: 'record_updated' as AutomationTrigger,
    triggerField: 'status' as AutomationField,
    conditionEnabled: false,
    conditionField: 'priority' as AutomationField,
    conditionValue: 'high',
    action: 'notify' as AutomationAction,
    actionValue: 'A task needs your attention.',
  })

  const resetDraft = () => setDraft({
    name: '',
    active: true,
    trigger: 'record_updated',
    triggerField: 'status',
    conditionEnabled: false,
    conditionField: 'priority',
    conditionValue: 'high',
    action: 'notify',
    actionValue: 'A task needs your attention.',
  })

  useEffect(() => {
    if (!createRequest) return
    setSection('manage')
    setCreating(true)
  }, [createRequest])

  const filteredRules = rules.filter((rule) =>
    !search.trim() || [rule.name, automationTriggerMeta[rule.trigger].label, automationActionMeta[rule.action].label]
      .join(' ').toLowerCase().includes(search.trim().toLowerCase()),
  )
  const filteredLogs = logs.filter((log) =>
    !search.trim() || [log.ruleName, log.taskTitle, log.detail, log.result]
      .join(' ').toLowerCase().includes(search.trim().toLowerCase()),
  )

  const conditionValueEditor = (
    <AutomationValueEditor
      field={draft.conditionField}
      value={draft.conditionValue}
      onChange={(conditionValue) => setDraft((current) => ({ ...current, conditionValue }))}
    />
  )

  return (
    <section className="automationCenter">
      <header className="automationHeader">
        <div>
          <p className="eyebrow">Task automation</p>
          <h2>Automation Center</h2>
          <span>Build trigger-and-action rules for the task board.</span>
        </div>
      </header>

      <div className="automationStats">
        <div><Zap size={17} /><span>Active</span><strong>{rules.filter((rule) => rule.active).length}</strong></div>
        <div><Workflow size={17} /><span>Automations</span><strong>{rules.length}</strong></div>
        <div><CheckCircle2 size={17} /><span>Successful runs</span><strong>{logs.filter((log) => log.result === 'Succeeded').length}</strong></div>
        <div><Clock3 size={17} /><span>Last run</span><strong>{logs[0] ? format(parseISO(logs[0].createdAt), 'MM-dd HH:mm') : 'Never'}</strong></div>
      </div>

      {creating ? (
        <section className="automationBuilder">
          <header>
            <div><p className="eyebrow">New automation</p><h3>Configure trigger and action</h3></div>
            <button type="button" className="iconButton" onClick={() => setCreating(false)} aria-label="Close automation builder"><X size={17} /></button>
          </header>
          <label className="automationNameField">Automation name
            <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="For example: Notify when a high-priority task starts" />
          </label>

          <div className="automationFlow">
            <section className="flowNode triggerNode">
              <div className="flowNodeTitle"><span><Zap size={16} /></span><div><strong>When this happens</strong><small>Trigger</small></div></div>
              <label>Event
                <select value={draft.trigger} onChange={(event) => setDraft((current) => ({ ...current, trigger: event.target.value as AutomationTrigger }))}>
                  {Object.entries(automationTriggerMeta).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}
                </select>
              </label>
              {draft.trigger === 'record_updated' && (
                <label>Field to watch
                  <select value={draft.triggerField} onChange={(event) => setDraft((current) => ({ ...current, triggerField: event.target.value as AutomationField }))}>
                    {Object.entries(automationFieldLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
                  </select>
                </label>
              )}
              <p>{automationTriggerMeta[draft.trigger].description}</p>
            </section>

            <div className="flowConnector"><span /><ArrowFlowIcon /></div>

            <section className="flowNode conditionNode">
              <div className="flowNodeTitle"><span><Filter size={16} /></span><div><strong>Only if</strong><small>Optional condition</small></div></div>
              <Checkbox checked={draft.conditionEnabled} onChange={(conditionEnabled) => setDraft((current) => ({ ...current, conditionEnabled }))}>Add a task condition</Checkbox>
              {draft.conditionEnabled && (
                <>
                  <label>Task field
                    <select value={draft.conditionField} onChange={(event) => setDraft((current) => ({ ...current, conditionField: event.target.value as AutomationField, conditionValue: '' }))}>
                      {Object.entries(automationFieldLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
                    </select>
                  </label>
                  <label>Equals{conditionValueEditor}</label>
                </>
              )}
            </section>

            <div className="flowConnector"><span /><ArrowFlowIcon /></div>

            <section className="flowNode actionNode">
              <div className="flowNodeTitle"><span><Play size={16} /></span><div><strong>Then do this</strong><small>Action</small></div></div>
              <label>Action
                <select value={draft.action} onChange={(event) => {
                  const action = event.target.value as AutomationAction
                  const defaults: Record<AutomationAction, string> = { set_status: 'doing', set_priority: 'high', add_tag: 'Automated', set_reminder: '30', notify: 'A task needs your attention.' }
                  setDraft((current) => ({ ...current, action, actionValue: defaults[action] }))
                }}>
                  {Object.entries(automationActionMeta).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}
                </select>
              </label>
              <AutomationActionValue action={draft.action} value={draft.actionValue} onChange={(actionValue) => setDraft((current) => ({ ...current, actionValue }))} />
              <p>{automationActionMeta[draft.action].description}</p>
            </section>
          </div>

          <footer className="builderActions">
            <span>{selectedTask ? `Test target: ${selectedTask.title}` : 'Select a task to use Run now later.'}</span>
            <div>
              <Button onClick={() => { resetDraft(); setCreating(false) }}>Cancel</Button>
              <Button type="primary" icon={<Zap size={16} />} onClick={() => {
                onCreate({ ...draft, name: draft.name.trim() || `${automationTriggerMeta[draft.trigger].label} → ${automationActionMeta[draft.action].label}` })
                resetDraft()
                setCreating(false)
              }}>Save and Activate</Button>
            </div>
          </footer>
        </section>
      ) : (
        <div className="automationWorkspace">
          <aside className="automationNav">
            <button type="button" className={clsx(section === 'manage' && 'active')} onClick={() => setSection('manage')}><Workflow size={16} />Manage<span>{rules.length}</span></button>
            <button type="button" className={clsx(section === 'activity' && 'active')} onClick={() => setSection('activity')}><Clock3 size={16} />Activity Log<span>{logs.length}</span></button>
            <div className="automationNavGroup"><strong>Status</strong><span>Active {rules.filter((rule) => rule.active).length}</span><span>Inactive {rules.filter((rule) => !rule.active).length}</span></div>
            <div className="automationNavGroup"><strong>Trigger</strong>{Object.entries(automationTriggerMeta).map(([key, meta]) => <span key={key}>{meta.label.replace('When a task ', '').replace('When a ', '')} {rules.filter((rule) => rule.trigger === key).length}</span>)}</div>
          </aside>

          <section className="automationContent">
            <div className="automationContentToolbar">
              <label className="automationSearch"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={section === 'manage' ? 'Search automations' : 'Search activity'} /></label>
              {section === 'activity' && logs.length > 0 && <Button onClick={onClearLogs}>Clear Log</Button>}
            </div>

            {section === 'manage' ? (
              <div className="automationRuleList">
                {!filteredRules.length && <Empty description="No automations yet" />}
                {filteredRules.map((rule) => (
                  <article className="automationRuleCard" key={rule.id}>
                    <button type="button" className={clsx('automationSwitch', rule.active && 'active')} onClick={() => onToggle(rule.id)} aria-label={rule.active ? 'Pause automation' : 'Activate automation'}>{rule.active ? <Play size={13} /> : <Pause size={13} />}</button>
                    <div className="automationRuleMain">
                      <div className="automationRuleTitle"><strong>{rule.name}</strong><Tag color={rule.active ? 'green' : 'gray'}>{rule.active ? 'Active' : 'Inactive'}</Tag></div>
                      <div className="ruleFlowSummary"><span><Zap size={14} />{automationTriggerMeta[rule.trigger].label}</span><ChevronRight size={14} /><span><Play size={14} />{automationActionMeta[rule.action].label}: {automationActionSummary(rule)}</span></div>
                      {rule.conditionEnabled && <small>Only if {automationFieldLabels[rule.conditionField]} equals {rule.conditionValue}</small>}
                    </div>
                    <div className="automationRuleMeta"><strong>{rule.runCount || 0}</strong><span>runs</span></div>
                    <div className="automationRuleActions">
                      <Tooltip content="Run now on selected task"><button type="button" aria-label="Run automation now" onClick={() => onRun(rule.id)}><Play size={15} /></button></Tooltip>
                      <Tooltip content="Delete automation"><button type="button" aria-label="Delete automation" onClick={() => onDelete(rule.id)}><Trash2 size={15} /></button></Tooltip>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="automationLogList">
                {!filteredLogs.length && <Empty description="No automation activity" />}
                {filteredLogs.map((log) => (
                  <article key={log.id}>
                    <span className="logStatus"><CheckCircle2 size={16} /></span>
                    <div><strong>{log.ruleName}</strong><p>{log.detail}</p><small>{log.taskTitle}</small></div>
                    <Tag color="green">{log.result}</Tag>
                    <time>{format(parseISO(log.createdAt), 'MM-dd HH:mm:ss')}</time>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  )
}

// Retained temporarily for local data compatibility while the redesigned center is validated.
void AutomationCenter

function AutomationCenterV2({
  rules,
  logs,
  selectedTask,
  createRequest,
  onCreate,
  onToggle,
  onDelete,
  onRun,
  onClearLogs,
}: {
  rules: AutomationRule[]
  logs: AutomationLog[]
  selectedTask?: Task
  createRequest: number
  onCreate: (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>) => void
  onToggle: (ruleId: string) => void
  onDelete: (ruleId: string) => void
  onRun: (ruleId: string) => void
  onClearLogs: () => void
}) {
  type Section = 'recommended' | 'manage' | 'activity'
  type RuleFilter = 'all' | 'active' | 'inactive' | 'created' | 'scheduled'
  type RuleSort = 'updated' | 'name' | 'runs'
  const emptyDraft = () => ({
    name: '', active: true, trigger: 'record_updated' as AutomationTrigger,
    triggerField: 'status' as AutomationField, conditionEnabled: false,
    conditionField: 'priority' as AutomationField, conditionValue: 'high',
    action: 'notify' as AutomationAction, actionValue: 'A task needs your attention.',
  })
  const [section, setSection] = useState<Section>('manage')
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [ruleFilter, setRuleFilter] = useState<RuleFilter>('all')
  const [ruleSort, setRuleSort] = useState<RuleSort>('updated')
  const [control, setControl] = useState<'filter' | 'sort' | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft)

  useEffect(() => {
    if (!createRequest) return
    setSection('manage')
    setCreating(true)
  }, [createRequest])

  const activeCount = rules.filter((rule) => rule.active).length
  const filteredRules = [...rules].filter((rule) => {
    const queryMatch = !search.trim() || [rule.name, automationTriggerMeta[rule.trigger].label, automationActionMeta[rule.action].label]
      .join(' ').toLowerCase().includes(search.trim().toLowerCase())
    const filterMatch = ruleFilter === 'all' || ruleFilter === 'created' ||
      (ruleFilter === 'active' && rule.active) || (ruleFilter === 'inactive' && !rule.active) ||
      (ruleFilter === 'scheduled' && rule.trigger === 'due_time')
    return queryMatch && filterMatch
  }).sort((a, b) => ruleSort === 'name' ? a.name.localeCompare(b.name)
    : ruleSort === 'runs' ? (b.runCount || 0) - (a.runCount || 0)
      : b.updatedAt.localeCompare(a.updatedAt))
  const filteredLogs = logs.filter((log) => !search.trim() || [log.ruleName, log.taskTitle, log.detail, log.result]
    .join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  const templates: Array<{ title: string; description: string; icon: ReactNode; rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'runCount'> }> = [
    { title: 'High-priority alert', description: 'Notify you when a high-priority task is created.', icon: <Bell size={18} />, rule: { name: 'High-priority task alert', active: true, trigger: 'task_created', triggerField: 'status', conditionEnabled: true, conditionField: 'priority', conditionValue: 'high', action: 'notify', actionValue: 'A high-priority task needs your attention.' } },
    { title: 'Due-time reminder', description: 'Send a desktop notification when a task reaches its due time.', icon: <CalendarClock size={18} />, rule: { name: 'Due-time reminder', active: true, trigger: 'due_time', triggerField: 'dueDate', conditionEnabled: false, conditionField: 'status', conditionValue: 'doing', action: 'notify', actionValue: 'A task is due now.' } },
    { title: 'Tag completed work', description: 'Add an archive tag when a task changes to Done.', icon: <Hash size={18} />, rule: { name: 'Tag completed work', active: true, trigger: 'record_updated', triggerField: 'status', conditionEnabled: true, conditionField: 'status', conditionValue: 'done', action: 'add_tag', actionValue: 'Completed' } },
  ]

  const openManageFilter = (filter: RuleFilter) => {
    setSection('manage')
    setCreating(false)
    setRuleFilter(filter)
  }
  const saveDraft = () => {
    onCreate({ ...draft, name: draft.name.trim() || `${automationTriggerMeta[draft.trigger].label} to ${automationActionMeta[draft.action].label}` })
    setDraft(emptyDraft())
    setCreating(false)
    setSection('manage')
  }

  return (
    <section className="automationCenter automationCenterV2">
      <header className="automationProductHeader">
        <div className="automationBrand"><span><Bot size={18} /></span><strong>Automation Center</strong></div>
        <nav className="automationTopTabs" aria-label="Automation sections">
          <button type="button" className={clsx(section === 'recommended' && 'active')} onClick={() => { setSection('recommended'); setCreating(false) }}>Recommended</button>
          <button type="button" className={clsx(section === 'manage' && 'active')} onClick={() => { setSection('manage'); setCreating(false) }}>Manage ({activeCount}/{rules.length})</button>
        </nav>
      </header>

      <div className="automationWorkspace automationWorkspaceV2">
        <aside className="automationNav automationNavV2">
          <div className="automationNavMain">
            <button type="button" className={clsx(section === 'manage' && ruleFilter === 'all' && 'active')} onClick={() => openManageFilter('all')}><Workflow size={16} />All Automations<span>{rules.length}</span></button>
            <button type="button" className={clsx(section === 'manage' && ruleFilter === 'active' && 'active')} onClick={() => openManageFilter('active')}><CheckCircle2 size={16} />Active<span>{activeCount}</span></button>
            <button type="button" className={clsx(section === 'manage' && ruleFilter === 'inactive' && 'active')} onClick={() => openManageFilter('inactive')}><Pause size={16} />Inactive<span>{rules.length - activeCount}</span></button>
            <button type="button" className={clsx(section === 'manage' && ruleFilter === 'created' && 'active')} onClick={() => openManageFilter('created')}><UserRound size={16} />Created by Me<span>{rules.length}</span></button>
            <button type="button" className={clsx(section === 'manage' && ruleFilter === 'scheduled' && 'active')} onClick={() => openManageFilter('scheduled')}><Clock3 size={16} />At Scheduled Time<span>{rules.filter((rule) => rule.trigger === 'due_time').length}</span></button>
          </div>
          <button type="button" className="automationGuideLink" onClick={() => setGuideOpen(true)}><CircleHelp size={16} />User Guide</button>
        </aside>

        <section className="automationContent automationContentV2">
          <div className="automationContentToolbar automationToolbarV2">
            <label className="automationSearch"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={section === 'activity' ? 'Search activity' : section === 'recommended' ? 'Search templates' : 'Enter automation name'} /></label>
            <div className="automationPrimaryActions">
              <Button icon={<Clock3 size={15} />} onClick={() => { setSection('activity'); setCreating(false) }}>Activity Log</Button>
              <Button type="primary" icon={<Plus size={16} />} onClick={() => { setDraft(emptyDraft()); setCreating(true); setSection('manage') }}>Create Automation</Button>
            </div>
          </div>

          {creating ? (
            <div className="automationBuilderWrap"><section className="automationBuilder automationBuilderV2">
              <header><div><p className="eyebrow">New automation</p><h3>Configure trigger and action</h3></div><button type="button" className="iconButton" onClick={() => setCreating(false)} aria-label="Close automation builder"><X size={17} /></button></header>
              <label className="automationNameField">Automation name<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="For example: Notify when a high-priority task starts" /></label>
              <div className="automationFlow">
                <section className="flowNode triggerNode"><div className="flowNodeTitle"><span><Zap size={16} /></span><div><strong>When this happens</strong><small>Trigger</small></div></div><label>Event<select value={draft.trigger} onChange={(event) => setDraft((current) => ({ ...current, trigger: event.target.value as AutomationTrigger }))}>{Object.entries(automationTriggerMeta).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}</select></label>{draft.trigger === 'record_updated' && <label>Field to watch<select value={draft.triggerField} onChange={(event) => setDraft((current) => ({ ...current, triggerField: event.target.value as AutomationField }))}>{Object.entries(automationFieldLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>}</section>
                <div className="flowConnector"><span /><ArrowFlowIcon /></div>
                <section className="flowNode conditionNode"><div className="flowNodeTitle"><span><Filter size={16} /></span><div><strong>Only if</strong><small>Optional condition</small></div></div><Checkbox checked={draft.conditionEnabled} onChange={(conditionEnabled) => setDraft((current) => ({ ...current, conditionEnabled }))}>Add a task condition</Checkbox>{draft.conditionEnabled && <><label>Task field<select value={draft.conditionField} onChange={(event) => setDraft((current) => ({ ...current, conditionField: event.target.value as AutomationField, conditionValue: '' }))}>{Object.entries(automationFieldLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>Equals<AutomationValueEditor field={draft.conditionField} value={draft.conditionValue} onChange={(conditionValue) => setDraft((current) => ({ ...current, conditionValue }))} /></label></>}</section>
                <div className="flowConnector"><span /><ArrowFlowIcon /></div>
                <section className="flowNode actionNode"><div className="flowNodeTitle"><span><Play size={16} /></span><div><strong>Then do this</strong><small>Action</small></div></div><label>Action<select value={draft.action} onChange={(event) => { const action = event.target.value as AutomationAction; const defaults: Record<AutomationAction, string> = { set_status: 'doing', set_priority: 'high', add_tag: 'Automated', set_reminder: '30', notify: 'A task needs your attention.' }; setDraft((current) => ({ ...current, action, actionValue: defaults[action] })) }}>{Object.entries(automationActionMeta).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}</select></label><AutomationActionValue action={draft.action} value={draft.actionValue} onChange={(actionValue) => setDraft((current) => ({ ...current, actionValue }))} /></section>
              </div>
              <footer className="builderActions"><span>{selectedTask ? `Test target: ${selectedTask.title}` : 'Select a task to use Run now later.'}</span><div><Button onClick={() => setCreating(false)}>Cancel</Button><Button type="primary" icon={<Zap size={16} />} onClick={saveDraft}>Save and Activate</Button></div></footer>
            </section></div>
          ) : section === 'recommended' ? (
            <div className="automationRecommendations"><header><div><p className="eyebrow">Recommended</p><h3>Start with a proven workflow</h3></div><span>Templates create active rules that you can manage immediately.</span></header><div className="automationTemplateGrid">{templates.filter((template) => !search.trim() || [template.title, template.description].join(' ').toLowerCase().includes(search.trim().toLowerCase())).map((template) => <article key={template.title}><span>{template.icon}</span><div><strong>{template.title}</strong><p>{template.description}</p></div><Button onClick={() => { onCreate(template.rule); setSection('manage') }}>Use Template</Button></article>)}</div></div>
          ) : section === 'manage' ? (
            <div className="automationManageBody">
              <div className="automationListSummary"><span>All automations: {filteredRules.length} <b>Active: {filteredRules.filter((rule) => rule.active).length}</b></span><div><button type="button" className={clsx(control === 'filter' && 'active')} onClick={() => setControl((value) => value === 'filter' ? null : 'filter')}><ListFilter size={14} />Filter</button><button type="button" className={clsx(control === 'sort' && 'active')} onClick={() => setControl((value) => value === 'sort' ? null : 'sort')}><ArrowDownAZ size={14} />Sort</button></div></div>
              {control && <div className="automationInlineControls">{control === 'filter' ? <label>Status<select value={ruleFilter} onChange={(event) => setRuleFilter(event.target.value as RuleFilter)}><option value="all">All automations</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="created">Created by me</option><option value="scheduled">At scheduled time</option></select></label> : <label>Sort by<select value={ruleSort} onChange={(event) => setRuleSort(event.target.value as RuleSort)}><option value="updated">Recently updated</option><option value="name">Name A-Z</option><option value="runs">Most runs</option></select></label>}</div>}
              <div className="automationRuleList">{!filteredRules.length && <Empty description="No automations match this view" />}{filteredRules.map((rule) => <article className="automationRuleCard automationRuleCardV2" key={rule.id}><div className="automationRuleMain"><div className="automationRuleTitle"><strong>{rule.name}</strong></div><div className="ruleFlowSummary"><span>{automationTriggerMeta[rule.trigger].label}, then {automationActionMeta[rule.action].label.toLowerCase()}: {automationActionSummary(rule)}.</span></div>{rule.conditionEnabled && <small>Only if {automationFieldLabels[rule.conditionField]} equals {rule.conditionValue}</small>}<div className="automationRuleFooter"><span>Created by Me</span><i /><span>Updated {format(parseISO(rule.updatedAt), 'MMM d, HH:mm')}</span><i /><span>{rule.runCount || 0} runs</span></div></div><button type="button" className={clsx('automationToggle', rule.active && 'active')} onClick={() => onToggle(rule.id)} aria-label={rule.active ? 'Pause automation' : 'Activate automation'}><span /></button><div className="automationMoreWrap"><button type="button" className="automationMoreButton" onClick={() => setOpenMenuId((current) => current === rule.id ? null : rule.id)} aria-label="More automation actions"><MoreHorizontal size={18} /></button>{openMenuId === rule.id && <div className="automationMoreMenu"><button type="button" onClick={() => { onRun(rule.id); setOpenMenuId(null) }}><Play size={14} />Run now</button><button type="button" onClick={() => { onDelete(rule.id); setOpenMenuId(null) }}><Trash2 size={14} />Delete</button></div>}</div></article>)}</div>
            </div>
          ) : (
            <div className="automationActivityBody"><div className="automationListSummary"><span>Activity Log: {filteredLogs.length} events</span>{logs.length > 0 && <Button onClick={onClearLogs}>Clear Log</Button>}</div><div className="automationLogList">{!filteredLogs.length && <Empty description="No automation activity" />}{filteredLogs.map((log) => <article key={log.id}><span className="logStatus"><CheckCircle2 size={16} /></span><div><strong>{log.ruleName}</strong><p>{log.detail}</p><small>{log.taskTitle}</small></div><Tag color="green">{log.result}</Tag><time>{format(parseISO(log.createdAt), 'MM-dd HH:mm:ss')}</time></article>)}</div></div>
          )}
        </section>
      </div>
      {guideOpen && <AutomationGuide onClose={() => setGuideOpen(false)} />}
    </section>
  )
}

function AutomationGuide({ onClose }: { onClose: () => void }) {
  return <div className="automationGuideOverlay" role="dialog" aria-modal="true" aria-label="Automation Center user guide"><section className="automationGuidePanel"><header><div><p className="eyebrow">CJ Board Help</p><h2>Automation Center Guide</h2></div><button type="button" className="iconButton" onClick={onClose} aria-label="Close user guide"><X size={17} /></button></header><div className="automationGuideIntro"><Sparkles size={20} /><div><strong>Automate repetitive task management</strong><p>Each automation watches for a trigger, optionally checks a condition, and then performs one action.</p></div></div><ol><li><strong>Create or choose a template</strong><span>Open Recommended for ready-made workflows, or choose Create Automation to build your own.</span></li><li><strong>Choose a trigger</strong><span>Run a rule when a task is created, a field changes, a condition becomes true, or a due time arrives.</span></li><li><strong>Add a condition</strong><span>Restrict the rule by status, priority, area, or due date. Conditions are optional.</span></li><li><strong>Choose an action</strong><span>Change status or priority, add a tag, schedule a reminder, or send a desktop notification.</span></li><li><strong>Manage and review</strong><span>Use the left filters to find rules, the switch to pause them, the more menu to test or delete, and Activity Log to review runs.</span></li></ol><div className="automationGuideNote"><Bell size={16} /><span>Desktop alerts require notification permission. Enable it in Settings &gt; System.</span></div></section></div>
}

function ArrowFlowIcon() {
  return <ChevronRight size={17} />
}

function AutomationValueEditor({ field, value, onChange }: { field: AutomationField; value: string; onChange: (value: string) => void }) {
  if (field === 'status') return <select value={value} onChange={(event) => onChange(event.target.value)}>{columns.map((column) => <option value={column.id} key={column.id}>{column.title}</option>)}</select>
  if (field === 'priority') return <select value={value} onChange={(event) => onChange(event.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
  if (field === 'area') return <select value={value} onChange={(event) => onChange(event.target.value)}>{areas.slice(1).map((item) => <option value={item} key={item}>{item}</option>)}</select>
  return <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
}

function AutomationActionValue({ action, value, onChange }: { action: AutomationAction; value: string; onChange: (value: string) => void }) {
  if (action === 'set_status') return <label>New status<select value={value} onChange={(event) => onChange(event.target.value)}>{columns.map((column) => <option value={column.id} key={column.id}>{column.title}</option>)}</select></label>
  if (action === 'set_priority') return <label>New priority<select value={value} onChange={(event) => onChange(event.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
  if (action === 'set_reminder') return <label>Minutes after trigger<input type="number" min="1" max="10080" value={value} onChange={(event) => onChange(event.target.value)} /></label>
  return <label>{action === 'add_tag' ? 'Tag' : 'Notification message'}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={action === 'add_tag' ? 'Automated' : 'Task needs attention'} /></label>
}

function ProjectManagementView({
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

function BaseRecordsView({
  records,
  allRecords,
  selectedRecord,
  feishuConfig,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onConfigUpdate,
  onImportRecords,
}: {
  records: BaseRecord[]
  allRecords: BaseRecord[]
  selectedRecord?: BaseRecord
  feishuConfig: FeishuConnectorConfig
  onSelect: (id: string) => void
  onAdd: () => void
  onUpdate: (recordId: string, patch: Partial<BaseRecord>) => void
  onDelete: (recordId: string) => void
  onConfigUpdate: (patch: Partial<FeishuConnectorConfig>) => void
  onImportRecords: (records: BaseRecord[]) => void
}) {
  const [mode, setMode] = useState<BaseViewMode>('grid')
  const [statusFilter, setStatusFilter] = useState<BaseRecordStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<BaseRecordPriority | 'all'>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'priority' | 'city'>('status')
  const [sortBy, setSortBy] = useState<'deadline' | 'applyDate' | 'company' | 'priority'>('deadline')
  const [fieldDensity, setFieldDensity] = useState<'core' | 'full'>('core')
  const [connectorOpen, setConnectorOpen] = useState(false)

  const tagOptions = useMemo(() => {
    const tags = new Set<string>()
    allRecords.forEach((record) => record.tags.forEach((tag) => tags.add(tag)))
    return Array.from(tags).sort((a, b) => a.localeCompare(b))
  }, [allRecords])

  const visibleRecords = useMemo(() => {
    const priorityRank: Record<BaseRecordPriority, number> = { high: 0, medium: 1, low: 2 }
    return records
      .filter((record) => {
        const statusMatch = statusFilter === 'all' || record.status === statusFilter
        const priorityMatch = priorityFilter === 'all' || record.priority === priorityFilter
        const tagMatch = tagFilter === 'all' || record.tags.includes(tagFilter)
        return statusMatch && priorityMatch && tagMatch
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return priorityRank[a.priority] - priorityRank[b.priority]
        return String(a[sortBy]).localeCompare(String(b[sortBy]))
      })
  }, [priorityFilter, records, sortBy, statusFilter, tagFilter])

  const groupedRecords = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'All records', records: visibleRecords }]
    const groups = new Map<string, BaseRecord[]>()
    visibleRecords.forEach((record) => {
      const key = groupBy === 'status'
        ? baseStatusMeta[record.status].title
        : groupBy === 'priority'
          ? priorityMeta[record.priority].label
          : record.city || 'No city'
      groups.set(key, [...(groups.get(key) || []), record])
    })
    return Array.from(groups.entries()).map(([key, groupRecords]) => ({ key, records: groupRecords }))
  }, [groupBy, visibleRecords])

  const activeRecords = allRecords.filter((record) => !['rejected', 'archived'].includes(record.status))
  const interviewRecords = allRecords.filter((record) => record.status === 'interview')
  const offerRecords = allRecords.filter((record) => record.status === 'offer')
  const dueSoonRecords = allRecords.filter((record) => {
    const diff = differenceInCalendarDays(parseISO(record.deadline), new Date())
    return !['rejected', 'archived'].includes(record.status) && diff >= 0 && diff <= 7
  })
  const timelineOption = useMemo(() => buildBaseTimelineOption(visibleRecords), [visibleRecords])
  const statsOption = useMemo(() => buildBaseStatsOption(visibleRecords), [visibleRecords])

  return (
    <section className="basePage">
      <header className="baseHeader">
        <div>
          <p className="eyebrow">Multidimensional Records</p>
          <h2>Application Base</h2>
          <span>One local table with synced Grid, Kanban, Timeline, and Stats views for recruiting and structured tracking.</span>
        </div>
        <div className="baseHeaderActions">
          <Button icon={<Link2 size={16} />} onClick={() => setConnectorOpen(true)}>Feishu Base</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={onAdd}>New Record</Button>
        </div>
      </header>

      <div className="baseMetrics">
        <Metric icon={<Database size={18} />} label="Records" value={`${allRecords.length}`} />
        <Metric icon={<BriefcaseBusiness size={18} />} label="Active" value={`${activeRecords.length}`} />
        <Metric icon={<CalendarClock size={18} />} label="Due in 7d" value={`${dueSoonRecords.length}`} />
        <Metric icon={<CheckCircle2 size={18} />} label="Offers" value={`${offerRecords.length}`} />
      </div>

      <div className="baseToolbar">
        <div className="baseViewTabs" role="tablist" aria-label="Base views">
          {([
            ['grid', <TableIcon key="grid-icon" />, 'Grid'],
            ['kanban', <Columns3 key="kanban-icon" size={15} />, 'Kanban'],
            ['timeline', <CalendarClock key="timeline-icon" size={15} />, 'Timeline'],
            ['gallery', <LayoutDashboard key="gallery-icon" size={15} />, 'Gallery'],
            ['stats', <BarChart3 key="stats-icon" size={15} />, 'Stats'],
          ] as Array<[BaseViewMode, ReactNode, string]>).map(([key, icon, label]) => (
            <button type="button" key={key} className={clsx(mode === key && 'active')} onClick={() => setMode(key)}>
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
        <Select value={statusFilter} onChange={(value) => setStatusFilter(value as BaseRecordStatus | 'all')}>
          <Select.Option value="all">All statuses</Select.Option>
          {baseStatuses.map((status) => <Select.Option key={status} value={status}>{baseStatusMeta[status].title}</Select.Option>)}
        </Select>
        <Select value={priorityFilter} onChange={(value) => setPriorityFilter(value as BaseRecordPriority | 'all')}>
          <Select.Option value="all">All priorities</Select.Option>
          <Select.Option value="high">High</Select.Option>
          <Select.Option value="medium">Medium</Select.Option>
          <Select.Option value="low">Low</Select.Option>
        </Select>
        <Select value={tagFilter} onChange={(value) => setTagFilter(String(value))}>
          <Select.Option value="all">All tags</Select.Option>
          {tagOptions.map((tag) => <Select.Option key={tag} value={tag}>{tag}</Select.Option>)}
        </Select>
        <Select value={groupBy} onChange={(value) => setGroupBy(value as typeof groupBy)}>
          <Select.Option value="none">No grouping</Select.Option>
          <Select.Option value="status">Group by status</Select.Option>
          <Select.Option value="priority">Group by priority</Select.Option>
          <Select.Option value="city">Group by city</Select.Option>
        </Select>
        <Select value={sortBy} onChange={(value) => setSortBy(value as typeof sortBy)}>
          <Select.Option value="deadline">Sort by deadline</Select.Option>
          <Select.Option value="applyDate">Sort by apply date</Select.Option>
          <Select.Option value="company">Sort by company</Select.Option>
          <Select.Option value="priority">Sort by priority</Select.Option>
        </Select>
        <Select value={fieldDensity} onChange={(value) => setFieldDensity(value as typeof fieldDensity)}>
          <Select.Option value="core">Core fields</Select.Option>
          <Select.Option value="full">Full fields</Select.Option>
        </Select>
      </div>

      <div className="baseWorkspace">
        <section className="baseMainPane">
          {mode === 'grid' && (
            <div className="baseGridPanel baseSheetPanel">
              <div className="baseSheetMeta">
                <span><Filter size={14} /> {visibleRecords.length} records</span>
                <span><Columns3 size={14} /> {fieldDensity === 'core' ? 'Core fields' : 'Full fields'}</span>
                <span><ArrowDownAZ size={14} /> {sortBy}</span>
              </div>
              <div className="baseSheetScroll">
                {groupedRecords.map((group) => (
                  <section className="baseSheetGroup" key={group.key}>
                    <header><strong>{group.key}</strong><span>{group.records.length}</span></header>
                    <table className="baseSheetTable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Company</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>City</th>
                          <th>Deadline</th>
                          <th>Next Action</th>
                          {fieldDensity === 'full' && <th>Channel</th>}
                          {fieldDensity === 'full' && <th>Applied</th>}
                          {fieldDensity === 'full' && <th>Tags</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {group.records.map((record, index) => (
                          <tr key={record.id} className={clsx(selectedRecord?.id === record.id && 'selected')} onClick={() => onSelect(record.id)}>
                            <td>{index + 1}</td>
                            <td><input value={record.company} onChange={(event) => onUpdate(record.id, { company: event.target.value })} /></td>
                            <td><input value={record.role} onChange={(event) => onUpdate(record.id, { role: event.target.value })} /></td>
                            <td><select value={record.status} onChange={(event) => onUpdate(record.id, { status: event.target.value as BaseRecordStatus })}>{baseStatuses.map((status) => <option key={status} value={status}>{baseStatusMeta[status].title}</option>)}</select></td>
                            <td><select value={record.priority} onChange={(event) => onUpdate(record.id, { priority: event.target.value as BaseRecordPriority })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></td>
                            <td><input value={record.city} onChange={(event) => onUpdate(record.id, { city: event.target.value })} /></td>
                            <td><input type="date" value={record.deadline} onChange={(event) => onUpdate(record.id, { deadline: event.target.value })} /></td>
                            <td><input value={record.nextAction} onChange={(event) => onUpdate(record.id, { nextAction: event.target.value })} /></td>
                            {fieldDensity === 'full' && <td><input value={record.channel} onChange={(event) => onUpdate(record.id, { channel: event.target.value })} /></td>}
                            {fieldDensity === 'full' && <td><input type="date" value={record.applyDate} onChange={(event) => onUpdate(record.id, { applyDate: event.target.value })} /></td>}
                            {fieldDensity === 'full' && <td><input value={record.tags.join(', ')} onChange={(event) => onUpdate(record.id, { tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></td>}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td />
                          <td>{group.records.length} records</td>
                          <td />
                          <td>{baseStatuses.filter((status) => group.records.some((record) => record.status === status)).length} statuses</td>
                          <td />
                          <td />
                          <td>{group.records.filter((record) => differenceInCalendarDays(parseISO(record.deadline), new Date()) <= 7).length} due soon</td>
                          <td />
                          {fieldDensity === 'full' && <td />}
                          {fieldDensity === 'full' && <td />}
                          {fieldDensity === 'full' && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </section>
                ))}
              </div>
            </div>
          )}

          {mode === 'kanban' && (
            <div className="baseKanban">
              {baseStatuses.map((status) => {
                const statusRecords = visibleRecords.filter((record) => record.status === status)
                return (
                  <section key={status} className="baseKanbanColumn">
                    <header>
                      <div><strong>{baseStatusMeta[status].title}</strong><span>{baseStatusMeta[status].hint}</span></div>
                      <b>{statusRecords.length}</b>
                    </header>
                    <div className="baseKanbanCards">
                      {statusRecords.map((record) => (
                        <button type="button" key={record.id} className={clsx(selectedRecord?.id === record.id && 'active')} onClick={() => onSelect(record.id)}>
                          <div className="baseCardTop">
                            <Tag color={priorityMeta[record.priority].color}>{priorityMeta[record.priority].label}</Tag>
                            <span>{dueLabel(record.deadline)}</span>
                          </div>
                          <strong>{record.company}</strong>
                          <small>{record.role} · {record.city || 'No city'}</small>
                          <p>{record.nextAction || 'No next action'}</p>
                          <select value={record.status} onChange={(event) => onUpdate(record.id, { status: event.target.value as BaseRecordStatus })}>
                            {baseStatuses.map((candidate) => <option key={candidate} value={candidate}>{baseStatusMeta[candidate].title}</option>)}
                          </select>
                          <span className="detailOpenIcon" aria-hidden="true"><PanelRightOpen size={15} /></span>
                        </button>
                      ))}
                      {!statusRecords.length && <span className="projectEmpty">No records</span>}
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          {mode === 'timeline' && (
            <div className="baseTimelinePanel">
              <ReactECharts option={timelineOption} style={{ height: Math.max(380, visibleRecords.length * 42 + 130) }} />
            </div>
          )}

          {mode === 'gallery' && (
            <div className="baseGallery">
              {visibleRecords.map((record) => (
                <button type="button" key={record.id} className={clsx(selectedRecord?.id === record.id && 'active')} onClick={() => onSelect(record.id)}>
                  <div className="baseCardTop">
                    <Tag color={baseStatusMeta[record.status].color}>{baseStatusMeta[record.status].title}</Tag>
                    <Tag color={priorityMeta[record.priority].color}>{priorityMeta[record.priority].label}</Tag>
                  </div>
                  <strong>{record.company}</strong>
                  <span>{record.role}</span>
                  <p>{record.nextAction || 'No next action'}</p>
                  <small>{record.city || 'No city'} · {dueLabel(record.deadline)}</small>
                  <span className="detailOpenIcon" aria-hidden="true"><PanelRightOpen size={15} /></span>
                </button>
              ))}
              {!visibleRecords.length && <Empty description="No records" />}
            </div>
          )}

          {mode === 'stats' && (
            <div className="baseStatsPanel">
              <ReactECharts option={statsOption.statusPie} style={{ height: 300 }} />
              <ReactECharts option={statsOption.priorityBar} style={{ height: 300 }} />
              <ReactECharts option={statsOption.deadlineLine} style={{ height: 300 }} />
              <section className="baseInsightPanel">
                <PanelTitle title="Pipeline summary" subtitle="Current filtered records" />
                <div className="usageDoc">
                  <p><strong>Interviews: </strong>{interviewRecords.length}</p>
                  <p><strong>Offers: </strong>{offerRecords.length}</p>
                  <p><strong>Due soon: </strong>{dueSoonRecords.length}</p>
                  <p><strong>Visible: </strong>{visibleRecords.length} of {allRecords.length}</p>
                </div>
              </section>
            </div>
          )}
        </section>

        <aside className="baseDetailPanel">
          {selectedRecord ? (
            <>
              <div className="baseDetailHeader">
                <div>
                  <input value={selectedRecord.company} onChange={(event) => onUpdate(selectedRecord.id, { company: event.target.value })} aria-label="Company" />
                  <span>{selectedRecord.role} · Updated {format(parseISO(selectedRecord.updatedAt), 'MM-dd HH:mm')}</span>
                </div>
                <Button status="danger" icon={<Trash2 size={15} />} onClick={() => onDelete(selectedRecord.id)}>Delete</Button>
              </div>

              <div className="baseDetailGrid">
                <label>Role<input value={selectedRecord.role} onChange={(event) => onUpdate(selectedRecord.id, { role: event.target.value })} /></label>
                <label>Status<select value={selectedRecord.status} onChange={(event) => onUpdate(selectedRecord.id, { status: event.target.value as BaseRecordStatus })}>{baseStatuses.map((status) => <option key={status} value={status}>{baseStatusMeta[status].title}</option>)}</select></label>
                <label>Priority<select value={selectedRecord.priority} onChange={(event) => onUpdate(selectedRecord.id, { priority: event.target.value as BaseRecordPriority })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
                <label>City<input value={selectedRecord.city} onChange={(event) => onUpdate(selectedRecord.id, { city: event.target.value })} /></label>
                <label>Channel<input value={selectedRecord.channel} onChange={(event) => onUpdate(selectedRecord.id, { channel: event.target.value })} /></label>
                <label>Owner<input value={selectedRecord.owner} onChange={(event) => onUpdate(selectedRecord.id, { owner: event.target.value })} /></label>
                <label>Apply date<input type="date" value={selectedRecord.applyDate} onChange={(event) => onUpdate(selectedRecord.id, { applyDate: event.target.value })} /></label>
                <label>Deadline<input type="date" value={selectedRecord.deadline} onChange={(event) => onUpdate(selectedRecord.id, { deadline: event.target.value })} /></label>
                <label>Next action time<input type="datetime-local" value={selectedRecord.nextActionAt} onChange={(event) => onUpdate(selectedRecord.id, { nextActionAt: event.target.value })} /></label>
                <label>Salary range<input value={selectedRecord.salaryRange} onChange={(event) => onUpdate(selectedRecord.id, { salaryRange: event.target.value })} /></label>
                <label>Link<input value={selectedRecord.link} onChange={(event) => onUpdate(selectedRecord.id, { link: event.target.value })} /></label>
                <label>Tags<input value={selectedRecord.tags.join(', ')} onChange={(event) => onUpdate(selectedRecord.id, { tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></label>
              </div>

              <label className="baseTextField">Next action<textarea value={selectedRecord.nextAction} onChange={(event) => onUpdate(selectedRecord.id, { nextAction: event.target.value })} /></label>
              <label className="baseTextField">Notes<textarea value={selectedRecord.notes} onChange={(event) => onUpdate(selectedRecord.id, { notes: event.target.value })} /></label>
            </>
          ) : (
            <div className="emptyKnowledge">
              <Database size={34} />
              <p>No record selected. Create a record to start using the base.</p>
              <Button type="primary" onClick={onAdd}>New Record</Button>
            </div>
          )}
        </aside>
      </div>

      {connectorOpen && (
        <FeishuConnectorPanel
          config={feishuConfig}
          records={allRecords}
          onClose={() => setConnectorOpen(false)}
          onConfigUpdate={onConfigUpdate}
          onImportRecords={onImportRecords}
        />
      )}
    </section>
  )
}

function TableIcon() {
  return <ListFilter size={15} />
}

function FeishuConnectorPanel({
  config,
  records,
  onClose,
  onConfigUpdate,
  onImportRecords,
}: {
  config: FeishuConnectorConfig
  records: BaseRecord[]
  onClose: () => void
  onConfigUpdate: (patch: Partial<FeishuConnectorConfig>) => void
  onImportRecords: (records: BaseRecord[]) => void
}) {
  const [draft, setDraft] = useState(config)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [message, setMessage] = useState('Ready')
  const docsUrl = draft.tenant === 'lark'
    ? 'https://open.larksuite.com/document/server-docs/docs/bitable-v1/bitable-overview'
    : 'https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview'

  const saveConfig = () => {
    onConfigUpdate(draft)
    setMessage('Connector settings saved locally.')
  }

  const exportCsv = () => {
    const csv = baseRecordsToCsv(records)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cj-board-base-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setMessage(`Exported ${records.length} records as CSV.`)
  }

  const copyConfig = async () => {
    const summary = [
      'CJ Board Feishu Base Connector',
      `Tenant: ${draft.tenant}`,
      `Embed URL: ${draft.embedUrl || '(not set)'}`,
      `App Token: ${draft.appToken || '(not set)'}`,
      `Table ID: ${draft.tableId || '(not set)'}`,
      `View ID: ${draft.viewId || '(not set)'}`,
      `App ID: ${draft.appId || '(not set)'}`,
      'Next API step: create a backend route that exchanges app_id/app_secret for tenant_access_token, then maps CJ Board BaseRecord fields to Bitable records.',
    ].join('\n')
    await navigator.clipboard.writeText(summary)
    setMessage('Connector summary copied to clipboard.')
  }

  const importJson = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BaseRecord[] | { records?: BaseRecord[] }
        const nextRecords = Array.isArray(parsed) ? parsed : parsed.records
        if (!Array.isArray(nextRecords)) throw new Error('JSON must be an array or { records: [] }')
        onImportRecords(nextRecords)
        setMessage(`Imported ${nextRecords.length} records from JSON.`)
      } catch (error) {
        setMessage(`Import failed: ${String(error)}`)
      }
    }
    reader.readAsText(file)
  }

  return (
    <section className="connectorOverlay">
      <div className="connectorPanel" role="dialog" aria-modal="true" aria-label="Feishu Base connector">
        <header className="connectorHeader">
          <div>
            <p className="eyebrow">Integration</p>
            <h2>Feishu Base Connector</h2>
            <span>Embed a shared Base link now, then use API identifiers later for real cloud sync.</span>
          </div>
          <button type="button" className="iconButton" onClick={onClose} aria-label="Close connector"><X size={17} /></button>
        </header>

        <div className="connectorBody">
          <section className="connectorConfig">
            <PanelTitle title="Connection settings" subtitle="Saved locally in CJ Board" />
            <div className="connectorFormGrid">
              <label>Tenant<select value={draft.tenant} onChange={(event) => setDraft((current) => ({ ...current, tenant: event.target.value as FeishuConnectorConfig['tenant'] }))}><option value="feishu">Feishu</option><option value="lark">Lark</option></select></label>
              <label>App ID<input value={draft.appId} onChange={(event) => setDraft((current) => ({ ...current, appId: event.target.value }))} placeholder="cli_xxx or app id" /></label>
              <label>App Token<input value={draft.appToken} onChange={(event) => setDraft((current) => ({ ...current, appToken: event.target.value }))} placeholder="Base app_token" /></label>
              <label>Table ID<input value={draft.tableId} onChange={(event) => setDraft((current) => ({ ...current, tableId: event.target.value }))} placeholder="tbl_xxx" /></label>
              <label>View ID<input value={draft.viewId} onChange={(event) => setDraft((current) => ({ ...current, viewId: event.target.value }))} placeholder="vew_xxx" /></label>
              <label>Embed URL<input value={draft.embedUrl} onChange={(event) => setDraft((current) => ({ ...current, embedUrl: event.target.value }))} placeholder="Paste a published/shared Base URL" /></label>
            </div>
            <div className="connectorActions">
              <Button type="primary" icon={<CheckCircle2 size={16} />} onClick={saveConfig}>Save</Button>
              <Button icon={<LayoutDashboard size={16} />} onClick={() => { setPreviewOpen((value) => !value); setMessage(draft.embedUrl ? 'Embed preview toggled.' : 'Paste an embed URL before previewing.') }}>Preview Embed</Button>
              <Button icon={<Link2 size={16} />} onClick={() => window.open(docsUrl, '_blank', 'noopener,noreferrer')}>Open API Docs</Button>
              <Button icon={<Download size={16} />} onClick={exportCsv}>Export CSV</Button>
              <label className="connectorFileButton">
                <Upload size={16} />
                <span>Import JSON</span>
                <input type="file" accept="application/json" onChange={(event) => importJson(event.target.files?.[0])} />
              </label>
              <Button icon={<FileText size={16} />} onClick={copyConfig}>Copy API Plan</Button>
            </div>
            <p className="connectorStatus">{message}</p>
          </section>

          <section className="connectorGuide">
            <PanelTitle title="GitHub implementation pattern" subtitle="Use embed first, then API sync" />
            <div className="usageDoc">
              <p><strong>Embed mode: </strong>Paste a public/shared Base URL and use Preview Embed inside CJ Board.</p>
              <p><strong>API mode: </strong>Store app_token, table_id, and view_id here, then add a backend sync route when credentials are ready.</p>
              <p><strong>Local data: </strong>CSV export and JSON import already work without cloud credentials.</p>
              <p><strong>Safety: </strong>Do not paste app_secret into this panel. Secrets belong in the hidden local server environment.</p>
            </div>
          </section>
        </div>

        {previewOpen && (
          <section className="connectorPreview">
            {draft.embedUrl ? (
              <iframe title="Feishu Base embed preview" src={draft.embedUrl} />
            ) : (
              <div className="connectorEmptyPreview"><Database size={32} /><p>Paste an embed URL to preview a Feishu/Lark Base here.</p></div>
            )}
          </section>
        )}
      </div>
    </section>
  )
}

function KnowledgeView({
  notes,
  tasks,
  filteredNotes,
  selectedNote,
  noteQuery,
  setNoteQuery,
  setSelectedNoteId,
  updateNote,
  addNote,
  deleteNote,
}: {
  notes: Note[]
  tasks: Task[]
  filteredNotes: Note[]
  selectedNote: Note | null
  noteQuery: string
  setNoteQuery: (query: string) => void
  setSelectedNoteId: (id: string) => void
  updateNote: (noteId: string, patch: Partial<Note>) => void
  addNote: () => void
  deleteNote: (noteId: string) => void
}) {
  const backlinks = selectedNote ? notes.filter((note) =>
        parseWikiLinks(note.content).some((link) => link === selectedNote.title),
      )
    : []
  const outgoing = selectedNote ? parseWikiLinks(selectedNote.content) : []
  const graphOption = useMemo(() => buildKnowledgeGraph(notes, selectedNote?.id), [notes, selectedNote?.id])

  return (
    <section className="knowledgePanel">
      <aside className="noteListPanel">
        <div className="knowledgeToolbar">
          <label className="knowledgeSearch">
            <Search size={15} />
            <input
              value={noteQuery}
              onChange={(event) => setNoteQuery(event.target.value)}
              placeholder="Search notes, tags, or content"
            />
          </label>
          <Button type="primary" icon={<Plus size={15} />} onClick={addNote}>New</Button>
        </div>
        <div className="noteList">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              type="button"
              className={clsx(selectedNote?.id === note.id && 'active')}
              onClick={() => setSelectedNoteId(note.id)}
            >
              <div>
                <strong>{note.title}</strong>
                <span>{note.tags.join(' / ') || 'No tags'}</span>
              </div>
              {note.pinned && <Pin size={14} />}
            </button>
          ))}
          {!filteredNotes.length && <Empty description="No notes" />}
        </div>
      </aside>

      {selectedNote ? (
        <>
          <section className="noteEditorPanel">
            <div className="noteMetaBar">
              <input
                className="noteTitleInput"
                value={selectedNote.title}
                onChange={(event) =>
                  updateNote(selectedNote.id, { title: event.target.value })
                }
              />
              <div className="noteActions">
                <Button
                  icon={<Pin size={15} />}
                  onClick={() =>
                    updateNote(selectedNote.id, { pinned: !selectedNote.pinned })
                  }
                >
                  {selectedNote.pinned ? 'Pinned' : 'Pin'}
                </Button>
                <Button status="danger" onClick={() => deleteNote(selectedNote.id)}>
                  Delete
                </Button>
              </div>
            </div>
            <input
              className="noteTagsInput"
              value={selectedNote.tags.join(', ')}
              onChange={(event) =>
                updateNote(selectedNote.id, {
                  tags: event.target.value
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Tags, separated by commas"
            />
            <div className="noteWorkArea">
              <textarea
                value={selectedNote.content}
                onChange={(event) =>
                  updateNote(selectedNote.id, { content: event.target.value })
                }
                placeholder="Write Markdown. Use [[Note Title]] to link notes."
              />
              <article className="markdownPreview">
                {renderMarkdown(selectedNote.content)}
              </article>
            </div>
          </section>

          <aside className="knowledgeSidePanel">
            <section className="managementPanel compactKnowledgePanel">
              <PanelTitle title="Bidirectional links" subtitle="Obsidian-style note links" />
              <div className="linkSection">
                <strong><Link2 size={14} /> Outgoing</strong>
                {outgoing.map((link) => (
                  <button
                    type="button"
                    key={link}
                    onClick={() => {
                      const target = notes.find((note) => note.title === link)
                      if (target) setSelectedNoteId(target.id)
                    }}
                  >
                    [[{link}]]
                  </button>
                ))}
                {!outgoing.length && <span>No outgoing links</span>}
              </div>
              <div className="linkSection">
                <strong><Link2 size={14} /> Backlinks</strong>
                {backlinks.map((note) => (
                  <button
                    type="button"
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                  >
                    {note.title}
                  </button>
                ))}
                {!backlinks.length && <span>No backlinks</span>}
              </div>
            </section>

            <section className="managementPanel compactKnowledgePanel">
              <PanelTitle title="Linked tasks" subtitle="Connect notes to execution" />
              <select
                multiple
                value={selectedNote.linkedTaskIds}
                onChange={(event) =>
                  updateNote(selectedNote.id, {
                    linkedTaskIds: Array.from(event.target.selectedOptions).map(
                      (option) => option.value,
                    ),
                  })
                }
              >
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              <div className="linkedTaskList">
                {selectedNote.linkedTaskIds.map((taskId) => {
                  const task = tasks.find((item) => item.id === taskId)
                  return task ? <Tag key={taskId}>{task.title}</Tag> : null
                })}
              </div>
            </section>

            <section className="managementPanel compactKnowledgePanel graphPanel">
              <PanelTitle title="Knowledge Graph" subtitle="Note network" />
              <ReactECharts option={graphOption} style={{ height: 240 }} />
            </section>
          </aside>
        </>
      ) : (
        <div className="emptyKnowledge">
          <FileText size={34} />
          <p>No note selected. Start building your knowledge base.</p>
          <Button type="primary" onClick={addNote}>New Note</Button>
        </div>
      )}
    </section>
  )
}

function OverviewView({
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

function AuditView({
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
      onClick: () => onNavigate('board'),
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

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panelTitle">
      <h3>{title}</h3>
      <span>{subtitle}</span>
    </div>
  )
}

function ChartsView({
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

function ProcessView({ tasks }: { tasks: Task[] }) {
  return (
    <section className="processPanel">
      {processNodes.map((node) => {
        const nodeTasks = tasks.filter((task) => task.tags.includes(node) || task.notes.includes(node))
        const progress = nodeTasks.length ? Math.round(nodeTasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / nodeTasks.length)
          : 0
        return (
          <article className="processNode" key={node}>
            <div className="nodeIndex">{processNodes.indexOf(node) + 1}</div>
            <div><h3>{node}</h3><p>{nodeTasks.length ? `${nodeTasks.length} linked items` : 'No linked items'}</p></div>
            <Progress percent={progress} size="small" />
          </article>
        )
      })}
    </section>
  )
}

function TaskDetail({
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

function SettingsPanel({
  onClose,
  requestNotifications,
  exportData,
  importData,
  resetDemo,
  serverBacked,
  notesServerBacked,
  projectsServerBacked,
  baseServerBacked,
  settings,
  updateSetting,
  notificationPermission,
  startupStatus,
  toggleStartup,
}: {
  onClose: () => void
  requestNotifications: () => void
  exportData: () => void
  importData: (file?: File) => void
  resetDemo: () => void
  serverBacked: boolean
  notesServerBacked: boolean
  projectsServerBacked: boolean
  baseServerBacked: boolean
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  notificationPermission: NotificationPermission | 'unsupported'
  startupStatus: StartupStatus
  toggleStartup: (enabled: boolean) => void
}) {
  const [section, setSection] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('settingsSection')
    return ['general', 'notifications', 'startup', 'data', 'appearance', 'guide', 'about'].includes(requested || '')
      ? requested!
      : 'general'
  })
  const notificationLabel =
    notificationPermission === 'unsupported' ? 'Unsupported'
      : notificationPermission === 'granted' ? 'Allowed'
        : notificationPermission === 'denied' ? 'Blocked'
          : 'Not enabled'
  const notificationColor =
    notificationPermission === 'granted' && settings.notificationsEnabled ? 'green'
      : notificationPermission === 'denied' ? 'red'
        : 'orange'
  const startupEnabled = startupStatus.enabled
  const sections = [
    { id: 'general', label: 'General', icon: <Settings size={15} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
    { id: 'startup', label: 'Startup', icon: <Zap size={15} /> },
    { id: 'data', label: 'Data', icon: <Download size={15} /> },
    { id: 'appearance', label: 'Appearance', icon: <SlidersHorizontal size={15} /> },
    { id: 'guide', label: 'Guide', icon: <CircleHelp size={15} /> },
    { id: 'about', label: 'About', icon: <BookOpen size={15} /> },
  ]

  return (
    <section className="settingsOverlay">
      <aside className="settingsPanel">
        <header className="settingsHeader">
          <div>
            <p className="eyebrow">CJ Board</p>
            <h2>Settings</h2>
          </div>
          <button type="button" className="iconButton" onClick={onClose} title="Close settings" aria-label="Close settings">
            <X size={17} />
          </button>
        </header>

        <div className="settingsBody">
          <nav className="settingsNav" aria-label="Settings sections">
            {sections.map((item) => (
              <button
                type="button"
                key={item.id}
                className={clsx(section === item.id && 'active')}
                onClick={() => setSection(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="settingsContent">
            {section === 'general' && (
              <section className="settingsSection">
                <h3>General</h3>
                <div className="settingsStatus">
                  <Tag color={serverBacked ? 'green' : 'orange'}>Tasks {serverBacked ? 'Synced' : 'Local'}</Tag>
                  <Tag color={notesServerBacked ? 'green' : 'orange'}>Notes {notesServerBacked ? 'Synced' : 'Local'}</Tag>
                  <Tag color={projectsServerBacked ? 'green' : 'orange'}>Projects {projectsServerBacked ? 'Synced' : 'Local'}</Tag>
                  <Tag color={baseServerBacked ? 'green' : 'orange'}>Base {baseServerBacked ? 'Synced' : 'Local'}</Tag>
                  <Tag color="blue">CJ Board 0.1.0</Tag>
                </div>
                <label className="settingsField">
                  <span>Default landing view</span>
                  <Select value={settings.defaultView} onChange={(value) => updateSetting('defaultView', value as ViewKey)}>
                    <Select.Option value="overview">Overview</Select.Option>
                    <Select.Option value="projects">Projects</Select.Option>
                    <Select.Option value="base">Base</Select.Option>
                    <Select.Option value="knowledge">Knowledge</Select.Option>
                    <Select.Option value="audit">Audit</Select.Option>
                    <Select.Option value="board">Board</Select.Option>
                    <Select.Option value="automations">Automations</Select.Option>
                    <Select.Option value="table">Table</Select.Option>
                    <Select.Option value="charts">Charts</Select.Option>
                    <Select.Option value="process">Process</Select.Option>
                  </Select>
                </label>
                <label className="settingsField">
                  <span>Week starts on</span>
                  <Select value={settings.weekStartsOn} onChange={(value) => updateSetting('weekStartsOn', value as AppSettings['weekStartsOn'])}>
                    <Select.Option value="Monday">Monday</Select.Option>
                    <Select.Option value="Sunday">Sunday</Select.Option>
                  </Select>
                </label>
                <SettingToggle
                  title="Confirm destructive actions"
                  description="Ask before resetting demo data, deleting notes, deleting automations, or clearing logs."
                  checked={settings.confirmDestructiveActions}
                  onChange={(checked) => updateSetting('confirmDestructiveActions', checked)}
                />
              </section>
            )}

            {section === 'notifications' && (
              <section className="settingsSection">
                <h3>Notifications & Reminders</h3>
                <div className="settingsStatus">
                  <Tag color={notificationColor}>Permission: {notificationLabel}</Tag>
                  <Tag color={settings.notificationsEnabled ? 'green' : 'gray'}>{settings.notificationsEnabled ? 'App alerts on' : 'App alerts off'}</Tag>
                </div>
                <SettingToggle
                  title="Desktop notifications"
                  description="Allow CJ Board reminders and automation alerts to show operating-system notifications."
                  checked={settings.notificationsEnabled}
                  onChange={(checked) => checked ? requestNotifications() : updateSetting('notificationsEnabled', false)}
                />
                <SettingToggle
                  title="Reminder checking"
                  description="Check task reminder times while CJ Board is running and mark fired reminders."
                  checked={settings.reminderChecksEnabled}
                  onChange={(checked) => updateSetting('reminderChecksEnabled', checked)}
                />
                <SettingToggle
                  title="Automation notifications"
                  description="Allow automation rules with the notify action to create desktop notifications."
                  checked={settings.automationNotificationsEnabled}
                  onChange={(checked) => updateSetting('automationNotificationsEnabled', checked)}
                />
                <div className="usageDoc">
                  <p><strong>Permission note: </strong>If Windows or WebView blocks notifications, turn them back on in system notification settings, then enable this switch again.</p>
                </div>
              </section>
            )}

            {section === 'startup' && (
              <section className="settingsSection">
                <h3>Startup</h3>
                <div className="settingsStatus">
                  <Tag color={startupEnabled ? 'green' : 'gray'}>{startupEnabled ? 'Enabled' : 'Disabled'}</Tag>
                  <Tag color={startupStatus.supported ? 'blue' : 'orange'}>{startupStatus.supported ? 'Windows Startup folder' : 'Not available'}</Tag>
                </div>
                <SettingToggle
                  title="Launch CJ Board at sign-in"
                  description="Create or remove the Windows Startup shortcut. This is off by default."
                  checked={startupEnabled}
                  disabled={!startupStatus.supported}
                  onChange={toggleStartup}
                />
                <div className="usageDoc">
                  <p><strong>Current shortcut: </strong>{startupStatus.path || 'No startup shortcut path available.'}</p>
                  {startupStatus.error && <p><strong>Status error: </strong>{startupStatus.error}</p>}
                  <p><strong>Desktop shortcut: </strong>The desktop icon is independent from startup and stays available even when startup is disabled.</p>
                </div>
              </section>
            )}

            {section === 'data' && (
              <section className="settingsSection">
                <h3>Data</h3>
                <div className="settingsActions">
                  <Button icon={<Download size={16} />} onClick={exportData} title="Export task JSON">Export Tasks</Button>
                  <label className="settingsFileButton" title="Import task JSON">
                    <Upload size={16} />
                    <span>Import Tasks</span>
                    <input type="file" accept="application/json" onChange={(event) => importData(event.target.files?.[0])} />
                  </label>
                  <Button status="warning" icon={<RotateCcw size={16} />} onClick={resetDemo} title="Restore sample tasks">Reset Demo</Button>
                </div>
                <div className="usageDoc">
                  <p><strong>Task storage: </strong><code>D:\agent-projects\learning-kanban\data\tasks.json</code></p>
                  <p><strong>Project storage: </strong><code>D:\agent-projects\learning-kanban\data\projects.json</code></p>
                  <p><strong>Base storage: </strong><code>D:\agent-projects\learning-kanban\data\base-records.json</code></p>
                  <p><strong>Note storage: </strong><code>D:\agent-projects\learning-kanban\data\notes.json</code></p>
                  <p><strong>Chat storage: </strong><code>D:\agent-projects\learning-kanban\data\chat.json</code></p>
                  <p>Use export before large changes, imports, or template resets.</p>
                </div>
              </section>
            )}

            {section === 'appearance' && (
              <section className="settingsSection">
                <h3>Appearance</h3>
                <label className="settingsField">
                  <span>Interface density</span>
                  <Select value={settings.interfaceDensity} onChange={(value) => updateSetting('interfaceDensity', value as AppSettings['interfaceDensity'])}>
                    <Select.Option value="comfortable">Comfortable</Select.Option>
                    <Select.Option value="compact">Compact</Select.Option>
                  </Select>
                </label>
                <div className="usageDoc">
                  <p><strong>Tooltips: </strong>Hover over icon buttons and compact controls. Settings, Assistant, New Note, import, export, reminder, automation, and panel controls use title tooltips.</p>
                  <p><strong>Progress bars: </strong>Task progress is automatic. It is derived from checklist completion, task status, and the Done stage, so it is not draggable.</p>
                </div>
              </section>
            )}

            {section === 'guide' && (
              <section className="settingsSection">
                <h3>User Guide</h3>
                <div className="usageDoc guideGrid">
                  <article className="guideModule"><span>Entry</span><strong>Overview</strong><p>Use it as the clean home page for today's progress, risks, summary metrics, and shortcuts into the deeper work pages.</p></article>
                  <article className="guideModule"><span>Create</span><strong>Quick Add</strong><p>Add a task from the top bar, choose area, priority, dates, estimate, reminder, and custom tags before it enters the board.</p></article>
                  <article className="guideModule"><span>Scope</span><strong>Areas</strong><p>Filter all task views by Schedule, Project, or Learning. Learning expands into CS, Python, C++, SQL, Algorithms, ML, NLP, and practice.</p></article>
                  <article className="guideModule"><span>Tasks</span><strong>Board</strong><p>Move task cards across Inbox, Planned, In Progress, Review, and Done. Clicking a card opens the right detail panel.</p></article>
                  <article className="guideModule"><span>Tasks</span><strong>Table</strong><p>Use the dense task table for scanning priority, dates, reminders, status, risk, and computed progress in one list.</p></article>
                  <article className="guideModule"><span>Tasks</span><strong>Charts</strong><p>Review colored KPI cards, stage mix, priority split, risk profile, workload, completion trend, and the integrated timeline.</p></article>
                  <article className="guideModule"><span>Tasks</span><strong>Process</strong><p>Check whether work is moving through capture, goal definition, breakdown, execution, review, and archive.</p></article>
                  <article className="guideModule"><span>Portfolio</span><strong>Projects</strong><p>Create general projects, assign owner and stage, link tasks, then read progress and risk from the linked task set.</p></article>
                  <article className="guideModule"><span>Database</span><strong>Base</strong><p>Manage structured records like applications, vendors, reading lists, or inventories with Grid, Kanban, Timeline, Gallery, and Stats views.</p></article>
                  <article className="guideModule"><span>Knowledge</span><strong>Notes</strong><p>Write Markdown notes, tag and pin important content, connect pages with [[Note Title]], and inspect backlinks or graph links.</p></article>
                  <article className="guideModule"><span>Rules</span><strong>Automation Center</strong><p>Create rules from templates or with trigger, condition, and action. Search, pause, run, delete, and audit rule activity.</p></article>
                  <article className="guideModule"><span>Quality</span><strong>Audit</strong><p>Check sync state, reminders, notifications, detail flow, Base records, knowledge links, automations, startup policy, and UX risks.</p></article>
                  <article className="guideModule"><span>Help</span><strong>Assistant</strong><p>Open the terminal-backed learning agent from the app and ask for planning, code explanation, quiz practice, or review help.</p></article>
                  <article className="guideModule"><span>System</span><strong>Settings</strong><p>Control notifications, reminder checks, startup, data export/import, appearance density, default view, and this guide.</p></article>
                  <article className="guideModule"><span>Recovery</span><strong>Data</strong><p>Local data lives under <code>D:\agent-projects\learning-kanban\data</code>. Export task JSON before large imports or resets.</p></article>
                </div>
              </section>
            )}

            {section === 'about' && (
              <section className="settingsSection">
                <h3>About CJ Board</h3>
                <div className="usageDoc">
                  <p><strong>Product role: </strong>CJ Board is a local-first planning, learning, knowledge, automation, and assistant workspace.</p>
                  <p><strong>Desktop shell: </strong>Tauri opens CJ Board as an independent desktop window and starts the local service hidden in the background.</p>
                  <p><strong>Project root: </strong><code>D:\agent-projects\learning-kanban</code></p>
                  <p><strong>Executable: </strong><code>D:\agent-projects\learning-kanban\src-tauri\target\release\cj-board.exe</code></p>
                  <p><strong>Privacy: </strong>Core tasks and notes stay on this computer unless you export or connect an external assistant command.</p>
                </div>
              </section>
            )}
          </div>
        </div>
      </aside>
    </section>
  )
}

function SettingToggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className={clsx('settingToggle', disabled && 'disabled')}>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <button
        type="button"
        className={clsx('settingsSwitch', checked && 'active')}
        aria-pressed={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  option,
  height = 280,
  className,
  children,
}: {
  title: string
  subtitle?: string
  option: object
  height?: number
  className?: string
  children?: ReactNode
}) {
  return (
    <article className={clsx('chartCard', className)}>
      <div className="chartCardHeader">
        <h3>{title}</h3>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <ReactECharts option={option} style={{ height }} />
      {children}
    </article>
  )
}

function parseWikiLinks(content: string) {
  return Array.from(content.matchAll(/\[\[([^\]]+)\]\]/g))
    .map((match) => match[1].trim())
    .filter(Boolean)
}

function renderMarkdown(content: string) {
  return content.split('\n').map((line, index) => {
    const key = `${index}-${line}`
    if (!line.trim()) return <br key={key} />
    if (line.startsWith('# ')) return <h1 key={key}>{renderInline(line.slice(2))}</h1>
    if (line.startsWith('## ')) return <h2 key={key}>{renderInline(line.slice(3))}</h2>
    if (line.startsWith('### ')) return <h3 key={key}>{renderInline(line.slice(4))}</h3>
    if (line.startsWith('- ')) return <p key={key} className="previewListItem">{renderInline(line.slice(2))}</p>
    if (/^\d+\.\s/.test(line)) {
      return <p key={key} className="previewListItem">{renderInline(line.replace(/^\d+\.\s/, ''))}</p>
    }
    return <p key={key}>{renderInline(line)}</p>
  })
}

function renderInline(line: string) {
  const parts = line.split(/(\[\[[^\]]+\]\]|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('[[') && part.endsWith(']]')) {
      return <span className="wikiLink" key={`${part}-${index}`}>{part}</span>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function buildBaseTimelineOption(records: BaseRecord[]) {
  const sorted = [...records].sort((a, b) => a.applyDate.localeCompare(b.applyDate))
  const minDate = sorted[0]?.applyDate || datePlus(0)
  const maxDate = sorted.reduce((latest, record) => record.deadline > latest ? record.deadline : latest, sorted[0]?.deadline || datePlus(14))
  return {
    color: ['#165dff'],
    tooltip: {
      formatter: (params: any) => {
        const record = sorted[params.dataIndex]
        return `${record.company}<br/>${record.role}<br/>${record.applyDate} - ${record.deadline}<br/>${baseStatusMeta[record.status].title}`
      },
    },
    grid: { left: 150, right: 28, top: 30, bottom: 44 },
    xAxis: { type: 'time', min: minDate, max: maxDate },
    yAxis: { type: 'category', data: sorted.map((record) => record.company), inverse: true },
    series: [{
      type: 'custom',
      renderItem: (_params: any, api: any) => {
        const categoryIndex = api.value(0)
        const start = api.coord([api.value(1), categoryIndex])
        const end = api.coord([api.value(2), categoryIndex])
        const height = Math.min(22, api.size([0, 1])[1] * 0.62)
        const rect = { x: start[0], y: start[1] - height / 2, width: Math.max(4, end[0] - start[0]), height }
        return {
          type: 'rect',
          shape: rect,
          style: api.style({ fill: '#165dff' }),
        }
      },
      encode: { x: [1, 2], y: 0 },
      data: sorted.map((record, index) => [index, record.applyDate, record.deadline]),
    }],
  }
}

function buildProjectPortfolioCharts(projects: ManagedProject[], tasks: Task[]) {
  const statusData = projectStatuses.map((status) => ({
    name: projectStatusMeta[status].title,
    value: projects.filter((project) => project.status === status).length,
  }))
  const progressData = projects.map((project) => ({
    name: project.name,
    value: getProjectProgress(project, tasks),
  }))
  return {
    color: ['#165dff', '#00b42a'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 38, right: 16, top: 46, bottom: 56 },
    xAxis: { type: 'category', data: progressData.map((item) => item.name), axisLabel: { rotate: 22 } },
    yAxis: { type: 'value', max: 100 },
    series: [
      { name: 'Progress', type: 'bar', data: progressData.map((item) => item.value), barMaxWidth: 30 },
      { name: 'Project Count', type: 'line', data: statusData.map((item) => item.value).slice(0, progressData.length) },
    ],
  }
}

function buildSelectedProjectCharts(project: ManagedProject | undefined, tasks: Task[]) {
  const linkedTasks = project ? getProjectTasks(project, tasks) : []
  const statusData = columns.map((column) => linkedTasks.filter((task) => task.status === column.id).length)
  const priorityData = (['high', 'medium', 'low'] as Priority[]).map((priority) =>
    linkedTasks.filter((task) => task.priority === priority).length,
  )
  return {
    color: ['#165dff', '#f77234'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 32, right: 10, top: 44, bottom: 32 },
    xAxis: { type: 'category', data: columns.map((column) => column.title) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: 'Stage', type: 'bar', data: statusData, barMaxWidth: 28 },
      { name: 'Priority', type: 'line', data: priorityData.concat(Array(Math.max(0, columns.length - priorityData.length)).fill(0)) },
    ],
  }
}

function buildBaseStatsOption(records: BaseRecord[]) {
  const statusData = baseStatuses.map((status) => ({
    name: baseStatusMeta[status].title,
    value: records.filter((record) => record.status === status).length,
  }))
  const priorityData = (['high', 'medium', 'low'] as BaseRecordPriority[]).map((priority) => ({
    name: priorityMeta[priority].label,
    value: records.filter((record) => record.priority === priority).length,
  }))
  const dates = getBaseDateRange(records, 14)
  const dueData = dates.map((date) => records.filter((record) => record.deadline === date).length)
  return {
    statusPie: {
      color: ['#c9cdd4', '#165dff', '#7b61d1', '#f77234', '#00b42a', '#f53f3f', '#86909c'],
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{ name: 'Status', type: 'pie', radius: ['45%', '70%'], center: ['50%', '44%'], data: statusData }],
    },
    priorityBar: {
      color: ['#165dff'],
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 16, top: 28, bottom: 32 },
      xAxis: { type: 'category', data: priorityData.map((item) => item.name) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{ name: 'Records', type: 'bar', data: priorityData.map((item) => item.value), barMaxWidth: 34 }],
    },
    deadlineLine: {
      color: ['#f77234'],
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 16, top: 28, bottom: 32 },
      xAxis: { type: 'category', data: dates.map((date) => date.slice(5)) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{ name: 'Deadlines', type: 'line', smooth: true, data: dueData, areaStyle: {} }],
    },
  }
}

function getBaseDateRange(records: BaseRecord[], fallbackDays: number) {
  if (!records.length) return Array.from({ length: fallbackDays }, (_, index) => datePlus(index))
  const min = records.reduce((earliest, record) => record.applyDate < earliest ? record.applyDate : earliest, records[0].applyDate)
  const max = records.reduce((latest, record) => record.deadline > latest ? record.deadline : latest, records[0].deadline)
  const days = Math.min(45, Math.max(7, differenceInCalendarDays(parseISO(max), parseISO(min)) + 1))
  return Array.from({ length: days }, (_, index) => format(addDaysSafe(parseISO(min), index), 'yyyy-MM-dd'))
}

function baseRecordsToCsv(records: BaseRecord[]) {
  const headers = [
    'company',
    'role',
    'status',
    'priority',
    'city',
    'channel',
    'owner',
    'applyDate',
    'deadline',
    'nextAction',
    'nextActionAt',
    'salaryRange',
    'tags',
    'notes',
    'link',
  ]
  const rows = records.map((record) =>
    headers.map((key) => {
      const value = key === 'tags' ? record.tags.join('; ') : String(record[key as keyof BaseRecord] || '')
      return csvCell(value)
    }).join(','),
  )
  return [headers.join(','), ...rows].join('\n')
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function buildKnowledgeGraph(notes: Note[], selectedNoteId?: string) {
  const nodes = notes.map((note) => ({
    id: note.title,
    name: note.title,
    symbolSize: note.id === selectedNoteId ? 38 : note.pinned ? 30 : 24,
    itemStyle: {
      color: note.id === selectedNoteId ? '#165dff' : note.pinned ? '#111827' : '#94a3b8',
    },
  }))
  const links = notes.flatMap((note) =>
    parseWikiLinks(note.content)
      .filter((target) => notes.some((candidate) => candidate.title === target))
      .map((target) => ({ source: note.title, target })),
  )
  return {
    tooltip: {},
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        data: nodes,
        links,
        label: { show: true, fontSize: 11 },
        force: { repulsion: 130, edgeLength: 80 },
        lineStyle: { color: '#b8c7dc', width: 1.2 },
      },
    ],
  }
}

function buildCharts(tasks: Task[]) {
  const dates = getDateRange(tasks, 14)
  const palette = ['#165dff', '#00b42a', '#f77234', '#722ed1', '#f53f3f', '#14c9c9', '#ff7d00', '#86909c']
  const loadData = dates.map((date) =>
    tasks.filter((task) => date >= task.startDate && date <= task.dueDate).length,
  )
  const dueData = dates.map((date) => tasks.filter((task) => task.dueDate === date).length)
  const learningScope = tasks.length > 0 && tasks.every((task) => isLearningArea(task.area))
  const areaMap = sumBy(
    tasks,
    (task) => learningScope ? task.area : getAreaSection(task.area),
    (task) => task.estimateHours,
  )
  const statusData = columns.map((column) => ({
    name: column.title,
    value: tasks.filter((task) => task.status === column.id).length,
  }))
  const priorityData = (['high', 'medium', 'low'] as Priority[]).map((priority) => ({
    name: priorityMeta[priority].label,
    value: tasks.filter((task) => task.priority === priority).length,
  }))
  const riskData = [
    { name: 'Overdue', value: tasks.filter((task) => getRiskLevel(task) === 'Overdue').length },
    { name: 'Due soon', value: tasks.filter((task) => ['High risk', 'Due soon'].includes(getRiskLevel(task))).length },
    { name: 'Normal', value: tasks.filter((task) => getRiskLevel(task) === 'Normal').length },
    { name: 'Done', value: tasks.filter((task) => task.status === 'done').length },
  ]
  const plannedDone = dates.map((date) => tasks.filter((task) => task.dueDate <= date).length)
  const actualDone = dates.map((date) =>
    tasks.filter((task) => task.status === 'done' && task.dueDate <= date).length,
  )
  const weightedProgress = tasks.length
    ? Math.round(tasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / tasks.length)
    : 0

  return {
    loadLine: {
      color: ['#165dff', '#f77234'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { left: 36, right: 16, top: 42, bottom: 28 },
      xAxis: { type: 'category', data: dates.map((date) => date.slice(5)) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        { name: 'Items', type: 'line', smooth: true, data: loadData, areaStyle: {} },
        { name: 'DueItem', type: 'bar', data: dueData },
      ],
    },
    areaBar: {
      color: palette,
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 16, top: 28, bottom: 36 },
      xAxis: { type: 'category', data: Object.keys(areaMap), axisLabel: { rotate: 24 } },
      yAxis: { type: 'value', name: 'Hours' },
      series: [{
        type: 'bar',
        data: Object.values(areaMap),
        barMaxWidth: 34,
        itemStyle: { color: (params: any) => palette[params.dataIndex % palette.length] },
      }],
    },
    statusPie: {
      color: ['#c9cdd4', '#165dff', '#14c9c9', '#f77234', '#00b42a'],
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['45%', '70%'], center: ['50%', '44%'], data: statusData }],
    },
    progressGauge: {
      color: ['#165dff', '#00b42a', '#f77234'],
      tooltip: { formatter: 'Progress: {c}%' },
      series: [{
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        progress: { show: true, roundCap: true, width: 16 },
        axisLine: { lineStyle: { width: 16, color: [[0.35, '#f53f3f'], [0.75, '#f77234'], [1, '#00b42a']] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: { valueAnimation: true, formatter: '{value}%', fontSize: 28, fontWeight: 800, color: '#111827' },
        data: [{ value: weightedProgress, name: 'Progress' }],
      }],
    },
    priorityPie: {
      color: ['#f53f3f', '#f77234', '#00b42a'],
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['28%', '70%'],
        roseType: 'radius',
        center: ['50%', '44%'],
        data: priorityData,
      }],
    },
    riskBar: {
      color: ['#f53f3f', '#ff7d00', '#165dff', '#00b42a'],
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 16, top: 28, bottom: 32 },
      xAxis: { type: 'category', data: riskData.map((item) => item.name) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        name: 'Tasks',
        type: 'bar',
        data: riskData.map((item, index) => ({ value: item.value, itemStyle: { color: ['#f53f3f', '#ff7d00', '#165dff', '#00b42a'][index] } })),
        barMaxWidth: 38,
      }],
    },
    burnupLine: {
      color: ['#165dff', '#00b42a'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { left: 36, right: 16, top: 42, bottom: 28 },
      xAxis: { type: 'category', data: dates.map((date) => date.slice(5)) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        { name: 'Planned Done', type: 'line', step: 'end', data: plannedDone },
        { name: 'Actual Done', type: 'line', smooth: true, data: actualDone },
      ],
    },
  }
}

function buildTimelineOption(tasks: Task[]) {
  const sorted = [...tasks].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const minDate = sorted[0]?.startDate || datePlus(0)
  const maxDate = sorted.reduce((latest, task) => task.dueDate > latest ? task.dueDate : latest, sorted[0]?.dueDate || datePlus(7))
  return {
    color: ['#165dff'],
    tooltip: {
      formatter: (params: any) => {
        const task = sorted[params.dataIndex]
        return `${task.title}<br/>${task.startDate} - ${task.dueDate}<br/>Progress: ${getTaskProgress(task)}%`
      },
    },
    grid: { left: 140, right: 28, top: 30, bottom: 44 },
    xAxis: { type: 'time', min: minDate, max: maxDate },
    yAxis: { type: 'category', data: sorted.map((task) => task.title), inverse: true },
    series: [{
      type: 'custom',
      renderItem: (_params: any, api: any) => {
        const categoryIndex = api.value(0)
        const start = api.coord([api.value(1), categoryIndex])
        const end = api.coord([api.value(2), categoryIndex])
        const height = Math.min(22, api.size([0, 1])[1] * 0.62)
        const progressWidth = (end[0] - start[0]) * (api.value(3) / 100)
        const rect = { x: start[0], y: start[1] - height / 2, width: end[0] - start[0], height }
        return {
          type: 'group',
          children: [
            { type: 'rect', shape: rect, style: api.style({ fill: '#dbeafe' }) },
            { type: 'rect', shape: { ...rect, width: progressWidth }, style: api.style({ fill: '#165dff' }) },
          ],
        }
      },
      encode: { x: [1, 2], y: 0 },
      data: sorted.map((task, index) => [index, task.startDate, task.dueDate, getTaskProgress(task)]),
    }],
  }
}

function getDateRange(tasks: Task[], fallbackDays: number) {
  if (!tasks.length) return Array.from({ length: fallbackDays }, (_, index) => datePlus(index))
  const min = tasks.reduce((earliest, task) => task.startDate < earliest ? task.startDate : earliest, tasks[0].startDate)
  const max = tasks.reduce((latest, task) => task.dueDate > latest ? task.dueDate : latest, tasks[0].dueDate)
  const days = Math.min(45, Math.max(7, differenceInCalendarDays(parseISO(max), parseISO(min)) + 1))
  return Array.from({ length: days }, (_, index) => format(addDaysSafe(parseISO(min), index), 'yyyy-MM-dd'))
}

function addDaysSafe(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function sumBy<T>(items: T[], keyFn: (item: T) => string, valueFn: (item: T) => number) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFn(item)
    acc[key] = (acc[key] || 0) + valueFn(item)
    return acc
  }, {})
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metricCard">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App


