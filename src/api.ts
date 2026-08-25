import { normalizeBaseRecord, normalizeNote, normalizeProject, normalizeTask } from './utils'
import type { BaseRecord, ChatMessage, ManagedProject, Note, StartupStatus, Task } from './types'

export async function fetchStartupStatus(): Promise<StartupStatus> {
  const response = await fetch('/api/system/startup', { cache: 'no-store' })
  const payload = (await response.json()) as StartupStatus & { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Could not read startup status')
  return payload
}

export async function updateStartupStatus(enabled: boolean): Promise<StartupStatus> {
  const response = await fetch('/api/system/startup', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  const payload = (await response.json()) as StartupStatus & { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Could not update startup status')
  return payload
}

export async function fetchServerTasks() {
  const response = await fetch('/api/tasks', { cache: 'no-store' })
  if (!response.ok) throw new Error('Cannot load server tasks')
  const payload = (await response.json()) as { tasks: Task[] | null }
  return payload.tasks?.map(normalizeTask) ?? null
}

export async function saveServerTasks(tasks: Task[]) {
  await fetch('/api/tasks', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks }),
  })
}

export async function fetchServerNotes() {
  const response = await fetch('/api/notes', { cache: 'no-store' })
  if (!response.ok) throw new Error('Cannot load server notes')
  const payload = (await response.json()) as { notes: Note[] | null }
  return payload.notes?.map(normalizeNote) ?? null
}

export async function saveServerNotes(notes: Note[]) {
  await fetch('/api/notes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  })
}

export async function fetchServerProjects() {
  const response = await fetch('/api/projects', { cache: 'no-store' })
  if (!response.ok) throw new Error('Cannot load server projects')
  const payload = (await response.json()) as { projects: ManagedProject[] | null }
  return payload.projects?.map(normalizeProject) ?? null
}

export async function saveServerProjects(projects: ManagedProject[]) {
  await fetch('/api/projects', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects }),
  })
}

export async function fetchServerBaseRecords() {
  const response = await fetch('/api/base-records', { cache: 'no-store' })
  if (!response.ok) throw new Error('Cannot load server base records')
  const payload = (await response.json()) as { records: BaseRecord[] | null }
  return payload.records?.map(normalizeBaseRecord) ?? null
}

export async function saveServerBaseRecords(records: BaseRecord[]) {
  await fetch('/api/base-records', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  })
}

export async function fetchChatMessages() {
  const response = await fetch('/api/chat', { cache: 'no-store' })
  if (!response.ok) return []
  const payload = (await response.json()) as { messages: ChatMessage[] }
  return payload.messages || []
}
