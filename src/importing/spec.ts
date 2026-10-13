// Import spec (数据口径): the fixed-but-editable contract that maps external
// datasets (Excel / CSV / TSV / JSON) onto CJ Board tasks.
// Pure module: no React / DOM imports so it can be tested with plain Node.
import type { Priority, Status } from '../types.ts'

export type ImportFieldKey =
  | 'title'
  | 'area'
  | 'status'
  | 'priority'
  | 'startDate'
  | 'dueDate'
  | 'reminderAt'
  | 'reminderMins'
  | 'estimateHours'
  | 'progress'
  | 'tags'
  | 'notes'
  | 'checklist'
  | 'color'

export type ImportFieldSpec = {
  key: ImportFieldKey
  label: string
  required: boolean
  description: string
  example: string
  aliases: string[]
}

export type ImportSpec = {
  version: number
  fields: ImportFieldSpec[]
  /** alias (any case / spacing) -> status */
  statusMap: Record<string, Status>
  /** alias -> priority */
  priorityMap: Record<string, Priority>
  /** alias -> canonical area. Unknown areas fall back to defaults.area and are kept as a tag. */
  areaMap: Record<string, string>
  /** For ambiguous dates like 03/04/2026: true = 3 April (UK), false = 4 March (US). */
  dayFirst: boolean
  /** Characters that split tags / checklist items. */
  tagSeparators: string
  checklistSeparators: string
  hoursPerDay: number
  defaults: {
    status: Status
    priority: Priority
    area: string
    durationDays: number
    estimateHours: number
    reminderTime: string
    reminderMins: number
  }
}

export const IMPORT_SPEC_VERSION = 1
export const IMPORT_SPEC_STORAGE_KEY = 'cjboard.importSpec.v1'

export const defaultImportSpec: ImportSpec = {
  version: IMPORT_SPEC_VERSION,
  fields: [
    { key: 'title', label: 'Title', required: true, description: 'Task / event name', example: 'Read chapter 3', aliases: ['title', 'name', 'task', 'task name', 'subject', 'summary', 'event', 'item', '标题', '任务', '任务名称', '名称', '事项', '日程', '主题', '内容'] },
    { key: 'area', label: 'Area', required: false, description: 'Board area. Unknown values fall back to the default area and are kept as a tag', example: 'Python', aliases: ['area', 'category', 'section', 'module', 'course', 'list', 'board', '领域', '分类', '类别', '模块', '课程', '板块'] },
    { key: 'status', label: 'Status', required: false, description: 'Inbox / Planned / In Progress / Review / Done (synonyms accepted)', example: 'Planned', aliases: ['status', 'state', 'stage', 'column', 'progress status', '状态', '阶段', '进度状态'] },
    { key: 'priority', label: 'Priority', required: false, description: 'High / Medium / Low, P0–P3, 1–3, 高/中/低', example: 'High', aliases: ['priority', 'importance', 'urgency', 'level', 'prio', '优先级', '重要性', '紧急程度', '级别'] },
    { key: 'startDate', label: 'Start date', required: false, description: 'yyyy-MM-dd, yyyy/M/d, d/M/yyyy, Excel date, 2026年3月4日…', example: '2026-10-12', aliases: ['start', 'start date', 'startdate', 'begin', 'from', 'start time', 'dtstart', '开始', '开始日期', '开始时间', '起始日期'] },
    { key: 'dueDate', label: 'Due date', required: false, description: 'Same formats as start date. Missing → start + default duration', example: '2026-10-14', aliases: ['due', 'due date', 'duedate', 'deadline', 'end', 'end date', 'to', 'end time', 'finish', 'dtend', 'date', '截止', '截止日期', '结束', '结束日期', '结束时间', '日期', '到期'] },
    { key: 'reminderAt', label: 'Reminder', required: false, description: 'Date + time, e.g. 2026-10-14 09:00. Missing → due date at default time', example: '2026-10-14 09:00', aliases: ['reminder', 'remind at', 'reminder at', 'alarm', 'notify', '提醒', '提醒时间'] },
    { key: 'reminderMins', label: 'Reminder lead (min)', required: false, description: 'Minutes before the reminder to notify', example: '120', aliases: ['reminder mins', 'reminder minutes', 'lead time', '提前提醒', '提前分钟'] },
    { key: 'estimateHours', label: 'Estimate (h)', required: false, description: 'Hours. Accepts 2, 2h, 90min, 1.5小时, 1d', example: '2', aliases: ['estimate', 'estimate hours', 'hours', 'effort', 'duration', 'time', '预计', '预计工时', '工时', '时长', '耗时'] },
    { key: 'progress', label: 'Progress (%)', required: false, description: '0–100, 50%, or 0.5', example: '0', aliases: ['progress', 'percent', 'completion', 'complete', '% complete', '进度', '完成度', '完成率'] },
    { key: 'tags', label: 'Tags', required: false, description: 'Separated by , ; | 、 or ，', example: 'reading; exam', aliases: ['tags', 'tag', 'labels', 'label', 'keywords', '标签', '关键词'] },
    { key: 'notes', label: 'Notes', required: false, description: 'Free text', example: 'Focus on examples', aliases: ['notes', 'note', 'description', 'desc', 'details', 'comment', 'comments', 'remark', '备注', '描述', '说明', '详情'] },
    { key: 'checklist', label: 'Checklist', required: false, description: 'Items separated by new lines or ; — prefix [x] for done', example: '[x] outline; draft', aliases: ['checklist', 'subtasks', 'sub tasks', 'steps', 'todo', '清单', '子任务', '步骤', '检查项'] },
    { key: 'color', label: 'Color', required: false, description: 'Preset name (blue, red, 蓝…) or hex #RRGGBB. Empty → area color', example: 'blue', aliases: ['color', 'colour', 'label color', 'task color', '颜色', '色彩', '标记色'] },
  ],
  statusMap: {
    backlog: 'backlog', inbox: 'backlog', todo: 'backlog', 'to do': 'backlog', new: 'backlog', open: 'backlog', idea: 'backlog', 待办: 'backlog', 收件箱: 'backlog', 未开始: 'backlog', 待规划: 'backlog',
    week: 'week', planned: 'week', plan: 'week', scheduled: 'week', next: 'week', 'this week': 'week', 计划: 'week', 已计划: 'week', 本周: 'week',
    doing: 'doing', 'in progress': 'doing', inprogress: 'doing', active: 'doing', started: 'doing', wip: 'doing', ongoing: 'doing', 进行中: 'doing', 处理中: 'doing', 执行中: 'doing',
    review: 'review', 'in review': 'review', checking: 'review', blocked: 'review', waiting: 'review', 待审核: 'review', 复盘: 'review', 审核: 'review', 待确认: 'review',
    done: 'done', complete: 'done', completed: 'done', finished: 'done', closed: 'done', archived: 'done', yes: 'done', true: 'done', 完成: 'done', 已完成: 'done', 已结束: 'done', 归档: 'done',
  },
  priorityMap: {
    high: 'high', h: 'high', urgent: 'high', critical: 'high', p0: 'high', p1: 'high', '1': 'high', '3': 'high', 高: 'high', 紧急: 'high', 重要: 'high',
    medium: 'medium', med: 'medium', m: 'medium', normal: 'medium', p2: 'medium', '2': 'medium', 中: 'medium', 普通: 'medium', 一般: 'medium',
    low: 'low', l: 'low', minor: 'low', p3: 'low', p4: 'low', 低: 'low', 次要: 'low',
  },
  areaMap: {
    schedule: 'Schedule', calendar: 'Schedule', 日程: 'Schedule', 日历: 'Schedule',
    project: 'Project', work: 'Project', 项目: 'Project', 工作: 'Project',
    learning: 'Learning', study: 'Learning', 学习: 'Learning',
    python: 'Python', 'c++': 'C++', cpp: 'C++', sql: 'SQL/Database', database: 'SQL/Database', 数据库: 'SQL/Database',
    algorithms: 'Algorithms', algorithm: 'Algorithms', 算法: 'Algorithms',
    'machine learning': 'Machine Learning', ml: 'Machine Learning', 机器学习: 'Machine Learning',
    nlp: 'NLP', 自然语言处理: 'NLP',
    'computer science basics': 'Computer Science Basics', cs: 'Computer Science Basics', 计算机基础: 'Computer Science Basics',
    'project practice': 'Project Practice', 项目实践: 'Project Practice',
  },
  dayFirst: true,
  tagSeparators: ',;|，；、',
  checklistSeparators: '\n;；',
  hoursPerDay: 8,
  defaults: {
    status: 'backlog',
    priority: 'medium',
    area: 'Schedule',
    durationDays: 0,
    estimateHours: 1,
    reminderTime: '21:00',
    reminderMins: 120,
  },
}

const STATUS_VALUES: Status[] = ['backlog', 'week', 'doing', 'review', 'done']
const PRIORITY_VALUES: Priority[] = ['high', 'medium', 'low']

/** Lower-case, strip whitespace / punctuation / full-width forms so "Due_Date", "due date" and "ＤＵＥ－ＤＡＴＥ" match. */
export const normalizeKey = (value: unknown) =>
  String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_\-.:：()（）[\]【】]+/g, '')
    .trim()

/** Validate a user-edited spec, merging it over the defaults so missing parts never break imports. */
export const sanitizeImportSpec = (input: unknown): { spec: ImportSpec; errors: string[] } => {
  const errors: string[] = []
  const base = structuredClone(defaultImportSpec)
  if (!input || typeof input !== 'object') return { spec: base, errors: ['Spec must be a JSON object'] }
  const raw = input as Partial<ImportSpec>

  if (Array.isArray(raw.fields)) {
    for (const field of raw.fields) {
      const target = base.fields.find((item) => item.key === field?.key)
      if (!target) {
        errors.push(`Unknown field key: ${String(field?.key)}`)
        continue
      }
      if (Array.isArray(field.aliases)) target.aliases = field.aliases.map(String).filter(Boolean)
      if (typeof field.label === 'string' && field.label) target.label = field.label
      if (typeof field.description === 'string') target.description = field.description
      if (typeof field.example === 'string') target.example = field.example
      if (target.key !== 'title' && typeof field.required === 'boolean') target.required = field.required
    }
  }

  const mergeMap = <T extends string>(name: string, value: unknown, allowed: readonly T[]) => {
    if (value === undefined) return null
    if (!value || typeof value !== 'object') {
      errors.push(`${name} must be an object`)
      return null
    }
    const out: Record<string, T> = {}
    for (const [alias, target] of Object.entries(value as Record<string, unknown>)) {
      if (allowed.includes(target as T)) out[alias] = target as T
      else errors.push(`${name}.${alias}: "${String(target)}" is not one of ${allowed.join(', ')}`)
    }
    return out
  }
  const statusMap = mergeMap('statusMap', raw.statusMap, STATUS_VALUES)
  if (statusMap) base.statusMap = statusMap
  const priorityMap = mergeMap('priorityMap', raw.priorityMap, PRIORITY_VALUES)
  if (priorityMap) base.priorityMap = priorityMap
  if (raw.areaMap && typeof raw.areaMap === 'object') {
    base.areaMap = Object.fromEntries(Object.entries(raw.areaMap).map(([k, v]) => [k, String(v)]))
  }
  if (typeof raw.dayFirst === 'boolean') base.dayFirst = raw.dayFirst
  if (typeof raw.tagSeparators === 'string' && raw.tagSeparators) base.tagSeparators = raw.tagSeparators
  if (typeof raw.checklistSeparators === 'string' && raw.checklistSeparators) base.checklistSeparators = raw.checklistSeparators
  if (typeof raw.hoursPerDay === 'number' && raw.hoursPerDay > 0) base.hoursPerDay = raw.hoursPerDay

  const d = raw.defaults
  if (d && typeof d === 'object') {
    if (STATUS_VALUES.includes(d.status as Status)) base.defaults.status = d.status as Status
    else if (d.status !== undefined) errors.push(`defaults.status must be one of ${STATUS_VALUES.join(', ')}`)
    if (PRIORITY_VALUES.includes(d.priority as Priority)) base.defaults.priority = d.priority as Priority
    else if (d.priority !== undefined) errors.push(`defaults.priority must be one of ${PRIORITY_VALUES.join(', ')}`)
    if (typeof d.area === 'string' && d.area) base.defaults.area = d.area
    if (typeof d.durationDays === 'number' && d.durationDays >= 0) base.defaults.durationDays = d.durationDays
    if (typeof d.estimateHours === 'number' && d.estimateHours > 0) base.defaults.estimateHours = d.estimateHours
    if (typeof d.reminderTime === 'string' && /^\d{1,2}:\d{2}$/.test(d.reminderTime)) base.defaults.reminderTime = d.reminderTime.padStart(5, '0')
    if (typeof d.reminderMins === 'number' && d.reminderMins >= 0) base.defaults.reminderMins = d.reminderMins
  }
  return { spec: base, errors }
}

export const loadImportSpec = (): ImportSpec => {
  try {
    const raw = globalThis.localStorage?.getItem(IMPORT_SPEC_STORAGE_KEY)
    return raw ? sanitizeImportSpec(JSON.parse(raw)).spec : structuredClone(defaultImportSpec)
  } catch {
    return structuredClone(defaultImportSpec)
  }
}

export const saveImportSpec = (spec: ImportSpec | null) => {
  if (!spec) globalThis.localStorage?.removeItem(IMPORT_SPEC_STORAGE_KEY)
  else globalThis.localStorage?.setItem(IMPORT_SPEC_STORAGE_KEY, JSON.stringify(spec, null, 2))
}
