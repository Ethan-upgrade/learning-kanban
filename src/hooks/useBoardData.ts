// Central data/state hook for CJ Board. Logic moved verbatim from App.tsx;
// navigation side effects go through the injected `navigate` callback.
import { useEffect, useMemo, useRef, useState } from 'react'
import { type DropResult } from '@hello-pangea/dnd'
import { differenceInCalendarDays, format, isBefore, parseISO } from 'date-fns'
import { normalizeHexColor } from '../colors'
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
} from '../types'
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
  isLearningArea,
  learningAreas,
  planTemplates,
  priorityMeta,
  statusMeta,
  topLevelAreas,
} from '../constants'
import {
  createSeedProjects,
  createSeedTasks,
  createTemplateTasks,
  datePlus,
  defaultDraft,
  getAutomationFieldValue,
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
} from '../utils'
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
} from '../api'

export function useBoardData(navigate: (view: ViewKey) => void) {
  const initialTasks = useMemo(loadLocalTasks, [])
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [notes, setNotes] = useState<Note[]>(loadLocalNotes)
  const [projects, setProjects] = useState<ManagedProject[]>(() => loadLocalProjects(initialTasks))
  const [baseRecords, setBaseRecords] = useState<BaseRecord[]>(loadLocalBaseRecords)
  const [feishuConfig, setFeishuConfig] = useState<FeishuConnectorConfig>(loadFeishuConnectorConfig)
  const [automations, setAutomations] = useState<AutomationRule[]>(loadLocalAutomations)
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>(loadLocalAutomationLogs)
  const [appSettings, setAppSettings] = useState<AppSettings>(loadAppSettings)
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
  const [learningExpanded, setLearningExpanded] = useState(true)
  const [templateQuery, setTemplateQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [customTags, setCustomTags] = useState<string[]>(loadCustomTags)
  const [tagDraft, setTagDraft] = useState('')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(tasks[0]?.id ?? null)
  const [draft, setDraft] = useState(defaultDraft)
  const [toast, setToast] = useState<string | null>(null)
  const [serverBacked, setServerBacked] = useState(false)
  const [notesServerBacked, setNotesServerBacked] = useState(false)
  const [projectsServerBacked, setProjectsServerBacked] = useState(false)
  const [baseServerBacked, setBaseServerBacked] = useState(false)
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
    navigate('knowledge')
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
      color: normalizeHexColor(draft.color),
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
    navigate('tasks')
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
    navigate('projects')
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
    navigate('base')
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

  // `?import=1` deep-links straight into the import wizard
  const [importOpen, setImportOpen] = useState(() => new URLSearchParams(window.location.search).has('import'))

  const importTasks = (incoming: Task[], mode: 'append' | 'replace' = 'append') => {
    if (!incoming.length) {
      setToast('Nothing to import')
      return
    }
    if (mode === 'replace' && appSettings.confirmDestructiveActions
      && !window.confirm(`Replace all ${tasks.length} existing tasks with ${incoming.length} imported tasks?`)) return
    const normalized = incoming.map((item) => normalizeTask(item))
    setTasks((current) => mode === 'replace' ? normalized : [...normalized, ...current])
    setSelectedId(normalized[0]?.id ?? null)
    setArea('All')
    setToast(`Imported ${normalized.length} task${normalized.length === 1 ? '' : 's'} (${mode})`)
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

  const clearAutomationLogs = () => {
    if (appSettings.confirmDestructiveActions && !window.confirm('Clear automation activity log?')) return
    setAutomationLogs([])
  }

  return {
    // data
    tasks, notes, projects, baseRecords, feishuConfig, automations, automationLogs,
    appSettings, startupStatus, notificationPermission,
    // filters & ui state
    area, setArea, areaQuery, setAreaQuery, learningExpanded, setLearningExpanded,
    templateQuery, setTemplateQuery,
    statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, tagFilter, setTagFilter,
    customTags, tagDraft, setTagDraft, query, setQuery,
    selectedId, setSelectedId, draft, setDraft, toast, setToast,
    serverBacked, notesServerBacked, projectsServerBacked, baseServerBacked,
    automationCreateRequest, setAutomationCreateRequest,
    navCollapsed, setNavCollapsed, detailCollapsed, setDetailCollapsed,
    noteQuery, setNoteQuery, projectQuery, setProjectQuery,
    setSelectedProjectId, setSelectedBaseRecordId, setSelectedNoteId,
    chatMode, setChatMode, chatInput, setChatInput, chatMessages, chatBusy,
    // derived
    filteredTasks, filteredAreaTree, filteredTemplates, filteredNotes,
    selectedTask, selectedNote, selectedProject, selectedBaseRecord,
    taskTagOptions, filteredProjects, filteredBaseRecords,
    filteredTotalHours, filteredWeightedProgress, filteredOverdueCount, filteredDueSoonCount,
    doneCount, overdueCount, dueSoonCount, weightedProgress, completion, activeHours, areaCounts,
    // actions
    updateTask, updateNote, addNote, deleteNote, addTask, addChecklistItem, sendChat, onDragEnd,
    requestNotifications, updateSetting, addCustomTag, deleteCustomTag, toggleStartup,
    exportData, importData, resetDemo, applyTemplate,
    importOpen, setImportOpen, importTasks,
    createAutomation, toggleAutomation, deleteAutomation, runAutomationNow, clearAutomationLogs,
    addProject, updateProject, deleteProject,
    addBaseRecord, updateBaseRecord, updateFeishuConfig, importBaseRecords, deleteBaseRecord,
    openTaskDetail,
  }
}

export type BoardData = ReturnType<typeof useBoardData>
