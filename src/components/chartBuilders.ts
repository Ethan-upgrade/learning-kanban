import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import {
  baseStatusMeta,
  baseStatuses,
  columns,
  getAreaSection,
  isLearningArea,
  priorityMeta,
  projectStatusMeta,
  projectStatuses,
} from '../constants'
import { datePlus, getProjectProgress, getProjectTasks, getRiskLevel, getTaskProgress } from '../utils'
import { parseWikiLinks } from './markdown'
import type { BaseRecord, BaseRecordPriority, ManagedProject, Note, Priority, Task } from '../types'

export function buildBaseTimelineOption(records: BaseRecord[]) {
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

export function buildProjectPortfolioCharts(projects: ManagedProject[], tasks: Task[]) {
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

export function buildSelectedProjectCharts(project: ManagedProject | undefined, tasks: Task[]) {
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

export function buildBaseStatsOption(records: BaseRecord[]) {
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

export function getBaseDateRange(records: BaseRecord[], fallbackDays: number) {
  if (!records.length) return Array.from({ length: fallbackDays }, (_, index) => datePlus(index))
  const min = records.reduce((earliest, record) => record.applyDate < earliest ? record.applyDate : earliest, records[0].applyDate)
  const max = records.reduce((latest, record) => record.deadline > latest ? record.deadline : latest, records[0].deadline)
  const days = Math.min(45, Math.max(7, differenceInCalendarDays(parseISO(max), parseISO(min)) + 1))
  return Array.from({ length: days }, (_, index) => format(addDaysSafe(parseISO(min), index), 'yyyy-MM-dd'))
}

export function baseRecordsToCsv(records: BaseRecord[]) {
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

export function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export function buildKnowledgeGraph(notes: Note[], selectedNoteId?: string) {
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

export function buildCharts(tasks: Task[]) {
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

export function buildTimelineOption(tasks: Task[]) {
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

export function getDateRange(tasks: Task[], fallbackDays: number) {
  if (!tasks.length) return Array.from({ length: fallbackDays }, (_, index) => datePlus(index))
  const min = tasks.reduce((earliest, task) => task.startDate < earliest ? task.startDate : earliest, tasks[0].startDate)
  const max = tasks.reduce((latest, task) => task.dueDate > latest ? task.dueDate : latest, tasks[0].dueDate)
  const days = Math.min(45, Math.max(7, differenceInCalendarDays(parseISO(max), parseISO(min)) + 1))
  return Array.from({ length: days }, (_, index) => format(addDaysSafe(parseISO(min), index), 'yyyy-MM-dd'))
}

export function addDaysSafe(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function sumBy<T>(items: T[], keyFn: (item: T) => string, valueFn: (item: T) => number) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFn(item)
    acc[key] = (acc[key] || 0) + valueFn(item)
    return acc
  }, {})
}
