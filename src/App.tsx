import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { type DropResult } from '@hello-pangea/dnd'
import {
  Badge,
  Button,
  Input,
  Progress,
  Select,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from '@arco-design/web-react'
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  Filter,
  Flame,
  Hash,
  LayoutDashboard,
  ListFilter,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Target,
  Trash2,
  Workflow,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { differenceInCalendarDays, format, isBefore, parseISO } from 'date-fns'
import type {
  AppSettings,
  AutomationLog,
  AutomationRule,
  BaseRecord,
  ChatMessage,
  ChatMode,
  FeishuConnectorConfig,
  ManagedProject,
  Note,
  Priority,
  StartupStatus,
  Status,
  Task,
  TemplateId,
  ViewKey,
} from './types'
import {
  AUTOMATIONS_STORAGE_KEY,
  AUTOMATION_LOGS_STORAGE_KEY,
  BASE_RECORDS_STORAGE_KEY,
  CUSTOM_TAGS_STORAGE_KEY,
  FEISHU_CONNECTOR_STORAGE_KEY,
  NOTES_STORAGE_KEY,
  PROJECTS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  STALE_REMINDER_GRACE_MS,
  STORAGE_KEY,
  areas,
  chatModes,
  columns,
  isLearningArea,
  learningAreas,
  normalizeViewKey,
  planTemplates,
  priorityMeta,
  statusMeta,
  topLevelAreas,
} from './constants'
import {
  createSeedProjects,
  createSeedTasks,
  createTemplateTasks,
  datePlus,
  defaultDraft,
  dueLabel,
  getAutomationFieldValue,
  getRiskLevel,
  getTaskProgress,
  loadAppSettings,
  loadCustomTags,
  loadFeishuConnectorConfig,
  loadLocalAutomationLogs,
  loadLocalAutomations,
  loadLocalBaseRecords,
  loadLocalNotes,
  loadLocalProjects,
  loadLocalTasks,
  makeId,
  matchesAutomationCondition,
  normalizeBaseRecord,
  normalizeTask,
  reminderLabel,
  reminderPlus,
} from './utils'
import {
  fetchChatMessages,
  fetchServerBaseRecords,
  fetchServerNotes,
  fetchServerProjects,
  fetchServerTasks,
  fetchStartupStatus,
  saveServerBaseRecords,
  saveServerNotes,
  saveServerProjects,
  saveServerTasks,
  updateStartupStatus,
} from './api'
import { Metric, TabTitle } from './components/common'
import { BoardView } from './components/BoardView'
import { AutomationCenterV2 } from './components/AutomationCenter'
import { ProjectManagementView } from './components/ProjectManagementView'
import { BaseRecordsView } from './components/BaseRecordsView'
import { KnowledgeView } from './components/KnowledgeView'
import { OverviewView } from './components/OverviewView'
import { AuditView } from './components/AuditView'
import { ChartsView } from './components/ChartsView'
import { ProcessView } from './components/ProcessView'
import { TaskDetail } from './components/TaskDetail'
import { SettingsPanel } from './components/SettingsPanel'
import './App.css'

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

export default App
