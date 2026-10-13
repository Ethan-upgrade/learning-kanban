import type { ReactNode } from 'react'
import ReactECharts from 'echarts-for-react'
import clsx from 'clsx'

export function TabTitle({ icon, text }: { icon: ReactNode; text: string }) {
  return <span className="tabTitle">{icon}{text}</span>
}

export function PanelTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="panelTitle">
      <h3>{title}</h3>
      {subtitle && <span>{subtitle}</span>}
    </div>
  )
}

export function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metricCard">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function ChartCard({
  title,
  subtitle,
  option,
  height = 280,
  className,
  children,
  onEvents,
}: {
  title: string
  subtitle?: string
  option: object
  height?: number
  className?: string
  children?: ReactNode
  /** ECharts event handlers, e.g. `{ click: (params) => … }`. Makes the card look clickable. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEvents?: Record<string, (params: any) => void>
}) {
  return (
    <article className={clsx('chartCard', onEvents && 'chartCardInteractive', className)}>
      <div className="chartCardHeader">
        <h3>{title}</h3>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <ReactECharts option={option} style={{ height }} onEvents={onEvents} notMerge />
      {children}
    </article>
  )
}
