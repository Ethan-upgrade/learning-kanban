import type { ReactNode } from 'react'
import clsx from 'clsx'

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="pageHeader">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description && <span>{description}</span>}
      </div>
      {actions && <div className="pageHeaderActions">{actions}</div>}
    </header>
  )
}

export function SubNav<K extends string>({ items, active, onChange, label }: {
  items: { key: K; label: string; icon?: ReactNode }[]
  active: K
  onChange: (key: K) => void
  label: string
}) {
  return (
    <nav className="subNav" aria-label={label}>
      {items.map((item) => (
        <button
          type="button"
          key={item.key}
          className={clsx(item.key === active && 'active')}
          aria-current={item.key === active ? 'page' : undefined}
          onClick={() => onChange(item.key)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
