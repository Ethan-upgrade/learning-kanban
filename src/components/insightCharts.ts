// ECharts option builders for the extended Insights page.
// Data comes from the pure helpers in ../insights.ts; this file only shapes visuals.

import type { Priority, Status } from '../types'
import { TASK_COLOR_PRESETS, withAlpha } from '../colors'
import type {
  AreaStat,
  Bucket,
  ChecklistStat,
  DueDay,
  Forecast,
  MatrixCell,
  StatusCount,
  TagStat,
  WeekStat,
  WeekdayStat,
} from '../insights'
import { PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from '../insights'

const hex = (id: string) => TASK_COLOR_PRESETS.find((preset) => preset.id === id)?.hex ?? '#3370FF'
export const INSIGHT_COLORS = {
  blue: hex('blue'),
  sky: hex('wathet'),
  teal: hex('turquoise'),
  green: hex('green'),
  yellow: hex('yellow'),
  orange: hex('orange'),
  red: hex('red'),
  purple: hex('purple'),
  indigo: hex('indigo'),
  grey: hex('grey'),
}
const C = INSIGHT_COLORS
const STATUS_COLORS: Record<Status, string> = { backlog: C.grey, week: C.sky, doing: C.blue, review: C.purple, done: C.green }
export const PRIORITY_COLORS: Record<Priority, string> = { high: C.red, medium: C.orange, low: C.teal }

const textColor = '#646A73'
const splitLine = { lineStyle: { color: '#EFF0F1' } }
const grid = { left: 44, right: 18, top: 36, bottom: 32, containLabel: true }
const tooltipAxis = { trigger: 'axis', axisPointer: { type: 'shadow' } }
const legendTop = { top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: textColor } }
const emptyGraphic = (show: boolean) =>
  show
    ? { type: 'text', left: 'center', top: 'middle', style: { text: 'No data in this scope', fill: '#8F959E', fontSize: 13 } }
    : undefined

/** Status funnel — click a stage to open it in the task table. */
export const funnelOption = (stages: StatusCount[]) => ({
  color: stages.map((stage) => STATUS_COLORS[stage.status]),
  tooltip: { trigger: 'item', formatter: (p: { name: string; value: number; data: { hours: number } }) => `${p.name}<br/>${p.value} tasks · ${p.data.hours}h` },
  graphic: emptyGraphic(stages.every((stage) => stage.count === 0)),
  series: [
    {
      type: 'funnel',
      sort: 'none',
      left: '8%',
      width: '84%',
      top: 12,
      bottom: 12,
      minSize: '30%',
      gap: 3,
      label: { show: true, position: 'inside', color: '#fff', formatter: '{b}  {c}' },
      itemStyle: { borderColor: '#fff', borderWidth: 1 },
      data: stages.map((stage) => ({ name: stage.label, value: stage.count, hours: stage.hours, status: stage.status })),
    },
  ],
})

/** Priority × status heatmap — click a cell to filter both. */
export const matrixOption = (cells: MatrixCell[]) => {
  const max = Math.max(1, ...cells.map((cell) => cell.count))
  return {
    tooltip: {
      position: 'top',
      formatter: (p: { data: [number, number, number] }) =>
        `${PRIORITY_LABELS[PRIORITY_ORDER[p.data[1]]]} · ${STATUS_LABELS[STATUS_ORDER[p.data[0]]]}<br/>${p.data[2]} tasks`,
    },
    grid: { left: 70, right: 16, top: 12, bottom: 64 },
    xAxis: { type: 'category', data: STATUS_ORDER.map((status) => STATUS_LABELS[status]), splitArea: { show: true }, axisLabel: { color: textColor, interval: 0, fontSize: 11, hideOverlap: false } },
    yAxis: { type: 'category', data: PRIORITY_ORDER.map((priority) => PRIORITY_LABELS[priority]), splitArea: { show: true }, axisLabel: { color: textColor } },
    visualMap: {
      min: 0,
      max,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 4,
      itemHeight: 120,
      inRange: { color: ['#F2F3F5', withAlpha(C.blue, 0.45), C.blue] },
      textStyle: { color: textColor },
    },
    series: [
      {
        type: 'heatmap',
        data: cells.map((cell) => [STATUS_ORDER.indexOf(cell.status), PRIORITY_ORDER.indexOf(cell.priority), cell.count]),
        label: { show: true, color: '#1F2329' },
        itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)' } },
      },
    ],
  }
}

/** Calendar heatmap of tasks due per day. */
export const dueCalendarOption = (days: DueDay[]) => {
  const first = days[0]?.date ?? new Date().toISOString().slice(0, 10)
  const last = days[days.length - 1]?.date ?? first
  const max = Math.max(1, ...days.map((day) => day.count))
  return {
    tooltip: {
      formatter: (p: { data: [string, number, number, number] }) => `${p.data[0]}<br/>${p.data[1]} due · ${p.data[2]} open · ${p.data[3]}h`,
    },
    visualMap: {
      // Data is [date, count, open, hours]; colour by `count`, not the default last dimension.
      dimension: 1,
      min: 0,
      max,
      type: 'piecewise',
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      pieces: max <= 4
        ? Array.from({ length: max + 1 }, (_, value) => ({ value, label: String(value) }))
        : [
            { value: 0, label: '0' },
            { min: 1, max: Math.ceil(max / 3), label: `1–${Math.ceil(max / 3)}` },
            { min: Math.ceil(max / 3) + 1, max: Math.ceil((2 * max) / 3), label: 'Busy' },
            { min: Math.ceil((2 * max) / 3) + 1, label: 'Peak' },
          ],
      inRange: { color: ['#F2F3F5', withAlpha(C.blue, 0.3), withAlpha(C.blue, 0.65), C.blue] },
      textStyle: { color: textColor },
    },
    calendar: {
      range: [first, last],
      top: 34,
      left: 36,
      right: 16,
      cellSize: ['auto', 18],
      dayLabel: { firstDay: 1, nameMap: 'en', color: textColor },
      monthLabel: { nameMap: 'en', color: textColor },
      yearLabel: { show: false },
      itemStyle: { color: '#F7F8FA', borderColor: '#fff', borderWidth: 2 },
      splitLine: { show: false },
    },
    series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: days.map((day) => [day.date, day.count, day.open, day.hours]) }],
  }
}

/** Weekly delivery: done vs still-open tasks by due week, plus planned hours. */
export const weeklyOption = (weeks: WeekStat[], currentWeek: string) => ({
  color: [C.green, C.orange, C.indigo],
  tooltip: tooltipAxis,
  legend: legendTop,
  grid,
  xAxis: {
    type: 'category',
    data: weeks.map((week) => (week.weekStart === currentWeek ? `${week.label} (now)` : week.label)),
    axisLabel: { color: textColor },
  },
  yAxis: [
    { type: 'value', name: 'Tasks', minInterval: 1, splitLine, axisLabel: { color: textColor } },
    { type: 'value', name: 'Hours', splitLine: { show: false }, axisLabel: { color: textColor } },
  ],
  series: [
    { name: 'Done', type: 'bar', stack: 'tasks', barMaxWidth: 26, data: weeks.map((week) => week.done) },
    { name: 'Open', type: 'bar', stack: 'tasks', barMaxWidth: 26, itemStyle: { borderRadius: [4, 4, 0, 0] }, data: weeks.map((week) => week.open) },
    { name: 'Planned hours', type: 'line', yAxisIndex: 1, smooth: false, symbolSize: 6, data: weeks.map((week) => week.hours) },
  ],
})

/** Forecast of remaining hours per day over the horizon, with a capacity line. */
export const forecastOption = (forecast: Forecast, capacity: number) => ({
  color: [C.blue, C.red],
  tooltip: { ...tooltipAxis, valueFormatter: (value: number) => `${value}h` },
  legend: legendTop,
  grid,
  graphic: emptyGraphic(forecast.days.every((day) => day.hours === 0)),
  xAxis: { type: 'category', data: forecast.days.map((day) => day.date.slice(5)), axisLabel: { color: textColor } },
  yAxis: { type: 'value', name: 'Hours', splitLine, axisLabel: { color: textColor } },
  series: [
    {
      name: 'Remaining work',
      type: 'bar',
      barMaxWidth: 22,
      data: forecast.days.map((day) => ({
        value: day.hours,
        itemStyle: { color: day.hours > capacity ? C.orange : C.blue, borderRadius: [4, 4, 0, 0] },
      })),
    },
    {
      name: `Capacity (${capacity}h/day)`,
      type: 'line',
      symbol: 'none',
      lineStyle: { type: 'dashed', width: 1.5 },
      data: forecast.days.map(() => capacity),
    },
  ],
})

/** Area treemap sized by planned hours; colour = area colour. Click to scope. */
export const areaTreemapOption = (areas: AreaStat[]) => ({
  tooltip: {
    formatter: (p: { name: string; data: { stat: AreaStat } }) => {
      const s = p.data.stat
      return `<b>${s.area}</b><br/>${s.count} tasks · ${s.done} done<br/>${s.hours}h planned · ${s.remainingHours}h left<br/>${s.avgProgress}% avg progress`
    },
  },
  graphic: emptyGraphic(!areas.length),
  series: [
    {
      type: 'treemap',
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      top: 4,
      left: 4,
      right: 4,
      bottom: 4,
      label: { show: true, formatter: '{b}\n{c}h', color: '#fff', fontSize: 12, lineHeight: 16 },
      itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2, borderRadius: 4 },
      data: areas.map((area) => ({ name: area.area, value: Math.max(area.hours, 0.1), stat: area, itemStyle: { color: area.color } })),
    },
  ],
})

/** Area health: average progress vs remaining hours. */
export const areaProgressOption = (areas: AreaStat[]) => ({
  color: [C.green, C.orange],
  tooltip: tooltipAxis,
  legend: legendTop,
  grid: { ...grid, left: 12 },
  xAxis: [
    { type: 'value', max: 100, name: '%', splitLine, axisLabel: { color: textColor } },
    { type: 'value', name: 'h', position: 'top', splitLine: { show: false }, axisLabel: { show: false } },
  ],
  yAxis: { type: 'category', inverse: true, data: areas.map((area) => area.area), axisLabel: { color: textColor, width: 110, overflow: 'truncate' } },
  series: [
    {
      name: 'Avg progress',
      type: 'bar',
      barMaxWidth: 12,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', formatter: '{c}%', color: textColor, fontSize: 11 },
      data: areas.map((area) => ({ value: area.avgProgress, itemStyle: { color: area.color } })),
    },
    { name: 'Hours left', type: 'bar', xAxisIndex: 1, barMaxWidth: 6, itemStyle: { borderRadius: [0, 3, 3, 0] }, data: areas.map((area) => area.remainingHours) },
  ],
})

/** Top tags: open vs done stacked horizontally. Click to filter by tag. */
export const tagOption = (tags: TagStat[]) => ({
  color: [C.blue, C.green],
  tooltip: tooltipAxis,
  legend: legendTop,
  grid: { ...grid, left: 12 },
  graphic: emptyGraphic(!tags.length),
  xAxis: { type: 'value', minInterval: 1, splitLine, axisLabel: { color: textColor } },
  yAxis: { type: 'category', inverse: true, data: tags.map((tag) => `#${tag.tag}`), axisLabel: { color: textColor, width: 110, overflow: 'truncate' } },
  series: [
    { name: 'Open', type: 'bar', stack: 'tag', barMaxWidth: 14, data: tags.map((tag) => tag.open) },
    { name: 'Done', type: 'bar', stack: 'tag', barMaxWidth: 14, itemStyle: { borderRadius: [0, 4, 4, 0] }, data: tags.map((tag) => tag.done) },
  ],
})

/** Simple single-series column chart for bucketed counts. */
export const bucketOption = (buckets: Bucket[], color: string, name = 'Tasks') => ({
  color: [color],
  tooltip: tooltipAxis,
  grid: { ...grid, top: 20 },
  graphic: emptyGraphic(buckets.every((bucket) => bucket.count === 0)),
  xAxis: { type: 'category', data: buckets.map((bucket) => bucket.label), axisLabel: { color: textColor, interval: 0 } },
  yAxis: { type: 'value', minInterval: 1, splitLine, axisLabel: { color: textColor } },
  series: [
    {
      name,
      type: 'bar',
      barMaxWidth: 34,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top', color: textColor, fontSize: 11 },
      data: buckets.map((bucket) => bucket.count),
    },
  ],
})

/** Weekday load as a radar so peaks stand out. */
export const weekdayOption = (stats: WeekdayStat[]) => {
  const max = Math.max(1, ...stats.map((stat) => stat.count))
  const maxHours = Math.max(1, ...stats.map((stat) => stat.hours))
  return {
    color: [C.blue, C.purple],
    tooltip: { trigger: 'item' },
    legend: { ...legendTop, data: ['Tasks due', 'Hours (scaled)'] },
    radar: {
      center: ['50%', '56%'],
      radius: '64%',
      indicator: stats.map((stat) => ({ name: stat.weekday, max })),
      axisName: { color: textColor },
      splitArea: { areaStyle: { color: ['#FAFBFC', '#F5F6F7'] } },
    },
    series: [
      {
        type: 'radar',
        symbolSize: 5,
        data: [
          { name: 'Tasks due', value: stats.map((stat) => stat.count), areaStyle: { color: withAlpha(C.blue, 0.2) } },
          { name: 'Hours (scaled)', value: stats.map((stat) => Math.round((stat.hours / maxHours) * max * 10) / 10), areaStyle: { color: withAlpha(C.purple, 0.12) } },
        ],
      },
    ],
  }
}

/** Checklist completion per area as a horizontal progress bar. */
export const checklistOption = (stats: ChecklistStat[]) => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: { dataIndex: number }[]) => {
      const s = stats[params[0]?.dataIndex ?? 0]
      return s ? `${s.area}<br/>${s.done}/${s.total} items · ${s.rate}%` : ''
    },
  },
  grid: { ...grid, left: 12, top: 12 },
  graphic: emptyGraphic(!stats.length),
  xAxis: { type: 'value', max: 100, splitLine, axisLabel: { color: textColor, formatter: '{value}%' } },
  yAxis: { type: 'category', inverse: true, data: stats.map((stat) => stat.area), axisLabel: { color: textColor, width: 110, overflow: 'truncate' } },
  series: [
    {
      type: 'bar',
      barMaxWidth: 14,
      showBackground: true,
      backgroundStyle: { color: '#F2F3F5', borderRadius: 4 },
      itemStyle: { borderRadius: 4 },
      label: { show: true, position: 'right', formatter: '{c}%', color: textColor, fontSize: 11 },
      data: stats.map((stat) => ({ value: stat.rate, itemStyle: { color: stat.color } })),
    },
  ],
})
