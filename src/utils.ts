import { differenceInCalendarDays, format, isToday, parseISO, subDays } from 'date-fns'
import { normalizeHexColor } from './colors'
import {
  AUTOMATIONS_STORAGE_KEY,
  AUTOMATION_LOGS_STORAGE_KEY,
  BASE_RECORDS_STORAGE_KEY,
  CUSTOM_TAGS_STORAGE_KEY,
  FEISHU_CONNECTOR_STORAGE_KEY,
  NOTES_STORAGE_KEY,
  PROJECTS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  STORAGE_KEY,
  areas,
  baseStatuses,
  defaultSettings,
  isLearningArea,
  normalizeViewKey,
  priorityMeta,
  projectStatuses,
  statusMeta,
} from './constants'
import type {
  AppSettings,
  AutomationField,
  AutomationLog,
  AutomationRule,
  BaseRecord,
  BaseRecordStatus,
  FeishuConnectorConfig,
  ManagedProject,
  Note,
  Priority,
  ProjectStatus,
  Status,
  Task,
  TemplateId,
} from './types'

export const makeId = () => crypto.randomUUID()

export const datePlus = (days: number) => {
  const next = new Date()
  next.setDate(next.getDate() + days)
  return format(next, 'yyyy-MM-dd')
}

export const reminderPlus = (days: number, hour = 20, minute = 0) => {
  const next = new Date()
  next.setDate(next.getDate() + days)
  next.setHours(hour, minute, 0, 0)
  return format(next, "yyyy-MM-dd'T'HH:mm")
}

export const createSeedTasks = (): Task[] => [
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

export const createSeedNotes = (): Note[] => {
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

export const normalizeNote = (note: Partial<Note> & { id: string; title: string }): Note => {
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

export const loadLocalNotes = () => {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY)
    if (!raw) return createSeedNotes()
    const parsed = JSON.parse(raw) as Note[]
    return Array.isArray(parsed) ? parsed.map(normalizeNote) : createSeedNotes()
  } catch {
    return createSeedNotes()
  }
}

export const createSeedProjects = (tasks: Task[] = []): ManagedProject[] => {
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

export const normalizeProject = (project: Partial<ManagedProject> & { id: string; name: string }): ManagedProject => {
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

export const loadLocalProjects = (tasks: Task[]) => {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY)
    if (!raw) return createSeedProjects(tasks)
    const parsed = JSON.parse(raw) as ManagedProject[]
    return Array.isArray(parsed) ? parsed.map(normalizeProject) : createSeedProjects(tasks)
  } catch {
    return createSeedProjects(tasks)
  }
}

export const createSeedBaseRecords = (): BaseRecord[] => {
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

export const normalizeBaseRecord = (record: Partial<BaseRecord> & { id: string }): BaseRecord => {
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

export const loadLocalBaseRecords = () => {
  try {
    const raw = localStorage.getItem(BASE_RECORDS_STORAGE_KEY)
    if (!raw) return createSeedBaseRecords()
    const parsed = JSON.parse(raw) as BaseRecord[]
    return Array.isArray(parsed) ? parsed.map(normalizeBaseRecord) : createSeedBaseRecords()
  } catch {
    return createSeedBaseRecords()
  }
}

export const defaultFeishuConnectorConfig = (): FeishuConnectorConfig => ({
  embedUrl: '',
  appToken: '',
  tableId: '',
  viewId: '',
  appId: '',
  tenant: 'feishu',
  updatedAt: new Date().toISOString(),
})

export const loadFeishuConnectorConfig = (): FeishuConnectorConfig => {
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

export const loadCustomTags = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY) || '[]') as string[]
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.map((tag) => tag.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
      : []
  } catch {
    return []
  }
}

export const createTemplateTasks = (templateId: TemplateId): Task[] => {
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

export const normalizeTask = (task: Partial<Task> & { id: string; title: string }): Task => {
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
    color: normalizeHexColor(task.color),
  }
}

export const loadLocalTasks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeedTasks()
    const parsed = JSON.parse(raw) as Task[]
    return Array.isArray(parsed) ? parsed.map(normalizeTask) : createSeedTasks()
  } catch {
    return createSeedTasks()
  }
}

export const loadLocalAutomations = (): AutomationRule[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTOMATIONS_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const loadLocalAutomationLogs = (): AutomationLog[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTOMATION_LOGS_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.slice(0, 300) : []
  } catch {
    return []
  }
}

export const loadAppSettings = (): AppSettings => {
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

export const getAutomationFieldValue = (task: Task, field: AutomationField) => String(task[field] || '')

export const matchesAutomationCondition = (task: Task, rule: AutomationRule) =>
  !rule.conditionEnabled ||
  getAutomationFieldValue(task, rule.conditionField).toLowerCase() === rule.conditionValue.trim().toLowerCase()

export const automationActionSummary = (rule: AutomationRule) => {
  if (rule.action === 'notify') return rule.actionValue || 'Show task notification'
  if (rule.action === 'set_reminder') return `${rule.actionValue || '30'} minutes from trigger`
  return rule.actionValue || 'Not configured'
}

export const defaultDraft = () => ({
  title: '',
  area: 'Project',
  startDate: datePlus(0),
  dueDate: datePlus(2),
  reminderAt: reminderPlus(2, 20, 0),
  priority: 'medium' as Priority,
  estimateHours: 2,
  tags: '',
  color: '' as string,
})

export const dueLabel = (date: string) => {
  const now = new Date()
  const due = parseISO(date)
  const diff = differenceInCalendarDays(due, now)
  if (isToday(due)) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return `Overdue by ${Math.abs(diff)}d`
  return `${diff}d left`
}

export const reminderLabel = (value: string) => {
  try {
    return format(parseISO(value), 'MM-dd HH:mm')
  } catch {
    return 'Not set'
  }
}

export const getRiskLevel = (task: Task) => {
  const diff = differenceInCalendarDays(parseISO(task.dueDate), new Date())
  if (task.status === 'done') return 'Done'
  if (diff < 0) return 'Overdue'
  if (task.priority === 'high' && diff <= 2) return 'High risk'
  if (diff <= 3) return 'Due soon'
  return 'Normal'
}

export const statusProgress: Record<Status, number> = {
  backlog: 0,
  week: 18,
  doing: 45,
  review: 82,
  done: 100,
}

export const getTaskProgress = (task: Task) => {
  if (task.status === 'done') return 100
  const base = statusProgress[task.status]
  if (!task.checklist.length) return base
  const checklistDone = task.checklist.filter((item) => item.done).length
  const checklistProgress = Math.round((checklistDone / task.checklist.length) * 100)
  return Math.max(base, checklistProgress)
}

export const projectStatusProgress: Record<ProjectStatus, number> = {
  idea: 5,
  active: 45,
  blocked: 35,
  review: 82,
  done: 100,
}

export const getProjectTasks = (project: ManagedProject, tasks: Task[]) =>
  project.linkedTaskIds
    .map((taskId) => tasks.find((task) => task.id === taskId))
    .filter((task): task is Task => Boolean(task))

export const getProjectProgress = (project: ManagedProject, tasks: Task[]) => {
  if (project.status === 'done') return 100
  const linkedTasks = getProjectTasks(project, tasks)
  if (!linkedTasks.length) return projectStatusProgress[project.status]
  return Math.round(linkedTasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / linkedTasks.length)
}

export const getProjectRisk = (project: ManagedProject, tasks: Task[]) => {
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

export const getProgressReason = (task: Task) => {
  if (task.status === 'done') return 'Task status is Done.'
  if (!task.checklist.length) {
    return `Progress follows the current stage: ${statusMeta[task.status].title}.`
  }
  const checklistDone = task.checklist.filter((item) => item.done).length
  return `Checklist complete ${checklistDone}/${task.checklist.length}; stage fallback is ${statusMeta[task.status].title}.`
}

export const getRiskScore = (task: Task) => {
  const diff = differenceInCalendarDays(parseISO(task.dueDate), new Date())
  const priorityScore = priorityMeta[task.priority].rank * 10
  const dueScore = diff < 0 ? 80 : Math.max(0, 18 - diff * 3)
  const statusScore = task.status === 'doing' ? 8 : task.status === 'week' ? 5 : 0
  return priorityScore + dueScore + statusScore - getTaskProgress(task) / 8
}

export const riskClass = (task: Task) => {
  const risk = getRiskLevel(task)
  if (risk === 'Overdue') return 'danger'
  if (risk === 'High risk') return 'warning'
  if (risk === 'Due soon') return 'notice'
  return 'normal'
}
