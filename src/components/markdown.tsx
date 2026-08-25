import type { ReactNode } from 'react'

export function parseWikiLinks(content: string) {
  return Array.from(content.matchAll(/\[\[([^\]]+)\]\]/g))
    .map((match) => match[1].trim())
    .filter(Boolean)
}

export function renderMarkdown(content: string): ReactNode[] {
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

export function renderInline(line: string) {
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
