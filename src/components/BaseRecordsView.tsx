import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import ReactECharts from 'echarts-for-react'
import { Button, Empty, Select, Tag } from '@arco-design/web-react'
import {
  ArrowDownAZ,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Columns3,
  Database,
  Download,
  FileText,
  Filter,
  LayoutDashboard,
  Link2,
  ListFilter,
  PanelRightOpen,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { baseStatusMeta, baseStatuses, priorityMeta } from '../constants'
import { dueLabel } from '../utils'
import { buildBaseStatsOption, buildBaseTimelineOption, baseRecordsToCsv } from './chartBuilders'
import { Metric, PanelTitle } from './common'
import type { BaseRecord, BaseRecordPriority, BaseRecordStatus, BaseViewMode, FeishuConnectorConfig } from '../types'

export function BaseRecordsView({
  records,
  allRecords,
  selectedRecord,
  feishuConfig,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onConfigUpdate,
  onImportRecords,
}: {
  records: BaseRecord[]
  allRecords: BaseRecord[]
  selectedRecord?: BaseRecord
  feishuConfig: FeishuConnectorConfig
  onSelect: (id: string) => void
  onAdd: () => void
  onUpdate: (recordId: string, patch: Partial<BaseRecord>) => void
  onDelete: (recordId: string) => void
  onConfigUpdate: (patch: Partial<FeishuConnectorConfig>) => void
  onImportRecords: (records: BaseRecord[]) => void
}) {
  const [mode, setMode] = useState<BaseViewMode>('grid')
  const [statusFilter, setStatusFilter] = useState<BaseRecordStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<BaseRecordPriority | 'all'>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'priority' | 'city'>('status')
  const [sortBy, setSortBy] = useState<'deadline' | 'applyDate' | 'company' | 'priority'>('deadline')
  const [fieldDensity, setFieldDensity] = useState<'core' | 'full'>('core')
  const [connectorOpen, setConnectorOpen] = useState(false)

  const tagOptions = useMemo(() => {
    const tags = new Set<string>()
    allRecords.forEach((record) => record.tags.forEach((tag) => tags.add(tag)))
    return Array.from(tags).sort((a, b) => a.localeCompare(b))
  }, [allRecords])

  const visibleRecords = useMemo(() => {
    const priorityRank: Record<BaseRecordPriority, number> = { high: 0, medium: 1, low: 2 }
    return records
      .filter((record) => {
        const statusMatch = statusFilter === 'all' || record.status === statusFilter
        const priorityMatch = priorityFilter === 'all' || record.priority === priorityFilter
        const tagMatch = tagFilter === 'all' || record.tags.includes(tagFilter)
        return statusMatch && priorityMatch && tagMatch
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return priorityRank[a.priority] - priorityRank[b.priority]
        return String(a[sortBy]).localeCompare(String(b[sortBy]))
      })
  }, [priorityFilter, records, sortBy, statusFilter, tagFilter])

  const groupedRecords = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'All records', records: visibleRecords }]
    const groups = new Map<string, BaseRecord[]>()
    visibleRecords.forEach((record) => {
      const key = groupBy === 'status'
        ? baseStatusMeta[record.status].title
        : groupBy === 'priority'
          ? priorityMeta[record.priority].label
          : record.city || 'No city'
      groups.set(key, [...(groups.get(key) || []), record])
    })
    return Array.from(groups.entries()).map(([key, groupRecords]) => ({ key, records: groupRecords }))
  }, [groupBy, visibleRecords])

  const activeRecords = allRecords.filter((record) => !['rejected', 'archived'].includes(record.status))
  const interviewRecords = allRecords.filter((record) => record.status === 'interview')
  const offerRecords = allRecords.filter((record) => record.status === 'offer')
  const dueSoonRecords = allRecords.filter((record) => {
    const diff = differenceInCalendarDays(parseISO(record.deadline), new Date())
    return !['rejected', 'archived'].includes(record.status) && diff >= 0 && diff <= 7
  })
  const timelineOption = useMemo(() => buildBaseTimelineOption(visibleRecords), [visibleRecords])
  const statsOption = useMemo(() => buildBaseStatsOption(visibleRecords), [visibleRecords])

  return (
    <section className="basePage">
      <header className="baseHeader">
        <div>
          <p className="eyebrow">Multidimensional Records</p>
          <h2>Application Base</h2>
          <span>One local table with synced Grid, Kanban, Timeline, and Stats views for recruiting and structured tracking.</span>
        </div>
        <div className="baseHeaderActions">
          <Button icon={<Link2 size={16} />} onClick={() => setConnectorOpen(true)}>Feishu Base</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={onAdd}>New Record</Button>
        </div>
      </header>

      <div className="baseMetrics">
        <Metric icon={<Database size={18} />} label="Records" value={`${allRecords.length}`} />
        <Metric icon={<BriefcaseBusiness size={18} />} label="Active" value={`${activeRecords.length}`} />
        <Metric icon={<CalendarClock size={18} />} label="Due in 7d" value={`${dueSoonRecords.length}`} />
        <Metric icon={<CheckCircle2 size={18} />} label="Offers" value={`${offerRecords.length}`} />
      </div>

      <div className="baseToolbar">
        <div className="baseViewTabs" role="tablist" aria-label="Base views">
          {([
            ['grid', <TableIcon key="grid-icon" />, 'Grid'],
            ['kanban', <Columns3 key="kanban-icon" size={15} />, 'Kanban'],
            ['timeline', <CalendarClock key="timeline-icon" size={15} />, 'Timeline'],
            ['gallery', <LayoutDashboard key="gallery-icon" size={15} />, 'Gallery'],
            ['stats', <BarChart3 key="stats-icon" size={15} />, 'Stats'],
          ] as Array<[BaseViewMode, ReactNode, string]>).map(([key, icon, label]) => (
            <button type="button" key={key} className={clsx(mode === key && 'active')} onClick={() => setMode(key)}>
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
        <Select value={statusFilter} onChange={(value) => setStatusFilter(value as BaseRecordStatus | 'all')}>
          <Select.Option value="all">All statuses</Select.Option>
          {baseStatuses.map((status) => <Select.Option key={status} value={status}>{baseStatusMeta[status].title}</Select.Option>)}
        </Select>
        <Select value={priorityFilter} onChange={(value) => setPriorityFilter(value as BaseRecordPriority | 'all')}>
          <Select.Option value="all">All priorities</Select.Option>
          <Select.Option value="high">High</Select.Option>
          <Select.Option value="medium">Medium</Select.Option>
          <Select.Option value="low">Low</Select.Option>
        </Select>
        <Select value={tagFilter} onChange={(value) => setTagFilter(String(value))}>
          <Select.Option value="all">All tags</Select.Option>
          {tagOptions.map((tag) => <Select.Option key={tag} value={tag}>{tag}</Select.Option>)}
        </Select>
        <Select value={groupBy} onChange={(value) => setGroupBy(value as typeof groupBy)}>
          <Select.Option value="none">No grouping</Select.Option>
          <Select.Option value="status">Group by status</Select.Option>
          <Select.Option value="priority">Group by priority</Select.Option>
          <Select.Option value="city">Group by city</Select.Option>
        </Select>
        <Select value={sortBy} onChange={(value) => setSortBy(value as typeof sortBy)}>
          <Select.Option value="deadline">Sort by deadline</Select.Option>
          <Select.Option value="applyDate">Sort by apply date</Select.Option>
          <Select.Option value="company">Sort by company</Select.Option>
          <Select.Option value="priority">Sort by priority</Select.Option>
        </Select>
        <Select value={fieldDensity} onChange={(value) => setFieldDensity(value as typeof fieldDensity)}>
          <Select.Option value="core">Core fields</Select.Option>
          <Select.Option value="full">Full fields</Select.Option>
        </Select>
      </div>

      <div className="baseWorkspace">
        <section className="baseMainPane">
          {mode === 'grid' && (
            <div className="baseGridPanel baseSheetPanel">
              <div className="baseSheetMeta">
                <span><Filter size={14} /> {visibleRecords.length} records</span>
                <span><Columns3 size={14} /> {fieldDensity === 'core' ? 'Core fields' : 'Full fields'}</span>
                <span><ArrowDownAZ size={14} /> {sortBy}</span>
              </div>
              <div className="baseSheetScroll">
                {groupedRecords.map((group) => (
                  <section className="baseSheetGroup" key={group.key}>
                    <header><strong>{group.key}</strong><span>{group.records.length}</span></header>
                    <table className="baseSheetTable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Company</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>City</th>
                          <th>Deadline</th>
                          <th>Next Action</th>
                          {fieldDensity === 'full' && <th>Channel</th>}
                          {fieldDensity === 'full' && <th>Applied</th>}
                          {fieldDensity === 'full' && <th>Tags</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {group.records.map((record, index) => (
                          <tr key={record.id} className={clsx(selectedRecord?.id === record.id && 'selected')} onClick={() => onSelect(record.id)}>
                            <td>{index + 1}</td>
                            <td><input value={record.company} onChange={(event) => onUpdate(record.id, { company: event.target.value })} /></td>
                            <td><input value={record.role} onChange={(event) => onUpdate(record.id, { role: event.target.value })} /></td>
                            <td><select value={record.status} onChange={(event) => onUpdate(record.id, { status: event.target.value as BaseRecordStatus })}>{baseStatuses.map((status) => <option key={status} value={status}>{baseStatusMeta[status].title}</option>)}</select></td>
                            <td><select value={record.priority} onChange={(event) => onUpdate(record.id, { priority: event.target.value as BaseRecordPriority })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></td>
                            <td><input value={record.city} onChange={(event) => onUpdate(record.id, { city: event.target.value })} /></td>
                            <td><input type="date" value={record.deadline} onChange={(event) => onUpdate(record.id, { deadline: event.target.value })} /></td>
                            <td><input value={record.nextAction} onChange={(event) => onUpdate(record.id, { nextAction: event.target.value })} /></td>
                            {fieldDensity === 'full' && <td><input value={record.channel} onChange={(event) => onUpdate(record.id, { channel: event.target.value })} /></td>}
                            {fieldDensity === 'full' && <td><input type="date" value={record.applyDate} onChange={(event) => onUpdate(record.id, { applyDate: event.target.value })} /></td>}
                            {fieldDensity === 'full' && <td><input value={record.tags.join(', ')} onChange={(event) => onUpdate(record.id, { tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></td>}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td />
                          <td>{group.records.length} records</td>
                          <td />
                          <td>{baseStatuses.filter((status) => group.records.some((record) => record.status === status)).length} statuses</td>
                          <td />
                          <td />
                          <td>{group.records.filter((record) => differenceInCalendarDays(parseISO(record.deadline), new Date()) <= 7).length} due soon</td>
                          <td />
                          {fieldDensity === 'full' && <td />}
                          {fieldDensity === 'full' && <td />}
                          {fieldDensity === 'full' && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </section>
                ))}
              </div>
            </div>
          )}

          {mode === 'kanban' && (
            <div className="baseKanban">
              {baseStatuses.map((status) => {
                const statusRecords = visibleRecords.filter((record) => record.status === status)
                return (
                  <section key={status} className="baseKanbanColumn">
                    <header>
                      <div><strong>{baseStatusMeta[status].title}</strong><span>{baseStatusMeta[status].hint}</span></div>
                      <b>{statusRecords.length}</b>
                    </header>
                    <div className="baseKanbanCards">
                      {statusRecords.map((record) => (
                        <button type="button" key={record.id} className={clsx(selectedRecord?.id === record.id && 'active')} onClick={() => onSelect(record.id)}>
                          <div className="baseCardTop">
                            <Tag color={priorityMeta[record.priority].color}>{priorityMeta[record.priority].label}</Tag>
                            <span>{dueLabel(record.deadline)}</span>
                          </div>
                          <strong>{record.company}</strong>
                          <small>{record.role} · {record.city || 'No city'}</small>
                          <p>{record.nextAction || 'No next action'}</p>
                          <select value={record.status} onChange={(event) => onUpdate(record.id, { status: event.target.value as BaseRecordStatus })}>
                            {baseStatuses.map((candidate) => <option key={candidate} value={candidate}>{baseStatusMeta[candidate].title}</option>)}
                          </select>
                          <span className="detailOpenIcon" aria-hidden="true"><PanelRightOpen size={15} /></span>
                        </button>
                      ))}
                      {!statusRecords.length && <span className="projectEmpty">No records</span>}
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          {mode === 'timeline' && (
            <div className="baseTimelinePanel">
              <ReactECharts option={timelineOption} style={{ height: Math.max(380, visibleRecords.length * 42 + 130) }} />
            </div>
          )}

          {mode === 'gallery' && (
            <div className="baseGallery">
              {visibleRecords.map((record) => (
                <button type="button" key={record.id} className={clsx(selectedRecord?.id === record.id && 'active')} onClick={() => onSelect(record.id)}>
                  <div className="baseCardTop">
                    <Tag color={baseStatusMeta[record.status].color}>{baseStatusMeta[record.status].title}</Tag>
                    <Tag color={priorityMeta[record.priority].color}>{priorityMeta[record.priority].label}</Tag>
                  </div>
                  <strong>{record.company}</strong>
                  <span>{record.role}</span>
                  <p>{record.nextAction || 'No next action'}</p>
                  <small>{record.city || 'No city'} · {dueLabel(record.deadline)}</small>
                  <span className="detailOpenIcon" aria-hidden="true"><PanelRightOpen size={15} /></span>
                </button>
              ))}
              {!visibleRecords.length && <Empty description="No records" />}
            </div>
          )}

          {mode === 'stats' && (
            <div className="baseStatsPanel">
              <ReactECharts option={statsOption.statusPie} style={{ height: 300 }} />
              <ReactECharts option={statsOption.priorityBar} style={{ height: 300 }} />
              <ReactECharts option={statsOption.deadlineLine} style={{ height: 300 }} />
              <section className="baseInsightPanel">
                <PanelTitle title="Pipeline summary" subtitle="Current filtered records" />
                <div className="usageDoc">
                  <p><strong>Interviews: </strong>{interviewRecords.length}</p>
                  <p><strong>Offers: </strong>{offerRecords.length}</p>
                  <p><strong>Due soon: </strong>{dueSoonRecords.length}</p>
                  <p><strong>Visible: </strong>{visibleRecords.length} of {allRecords.length}</p>
                </div>
              </section>
            </div>
          )}
        </section>

        <aside className="baseDetailPanel">
          {selectedRecord ? (
            <>
              <div className="baseDetailHeader">
                <div>
                  <input value={selectedRecord.company} onChange={(event) => onUpdate(selectedRecord.id, { company: event.target.value })} aria-label="Company" />
                  <span>{selectedRecord.role} · Updated {format(parseISO(selectedRecord.updatedAt), 'MM-dd HH:mm')}</span>
                </div>
                <Button status="danger" icon={<Trash2 size={15} />} onClick={() => onDelete(selectedRecord.id)}>Delete</Button>
              </div>

              <div className="baseDetailGrid">
                <label>Role<input value={selectedRecord.role} onChange={(event) => onUpdate(selectedRecord.id, { role: event.target.value })} /></label>
                <label>Status<select value={selectedRecord.status} onChange={(event) => onUpdate(selectedRecord.id, { status: event.target.value as BaseRecordStatus })}>{baseStatuses.map((status) => <option key={status} value={status}>{baseStatusMeta[status].title}</option>)}</select></label>
                <label>Priority<select value={selectedRecord.priority} onChange={(event) => onUpdate(selectedRecord.id, { priority: event.target.value as BaseRecordPriority })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
                <label>City<input value={selectedRecord.city} onChange={(event) => onUpdate(selectedRecord.id, { city: event.target.value })} /></label>
                <label>Channel<input value={selectedRecord.channel} onChange={(event) => onUpdate(selectedRecord.id, { channel: event.target.value })} /></label>
                <label>Owner<input value={selectedRecord.owner} onChange={(event) => onUpdate(selectedRecord.id, { owner: event.target.value })} /></label>
                <label>Apply date<input type="date" value={selectedRecord.applyDate} onChange={(event) => onUpdate(selectedRecord.id, { applyDate: event.target.value })} /></label>
                <label>Deadline<input type="date" value={selectedRecord.deadline} onChange={(event) => onUpdate(selectedRecord.id, { deadline: event.target.value })} /></label>
                <label>Next action time<input type="datetime-local" value={selectedRecord.nextActionAt} onChange={(event) => onUpdate(selectedRecord.id, { nextActionAt: event.target.value })} /></label>
                <label>Salary range<input value={selectedRecord.salaryRange} onChange={(event) => onUpdate(selectedRecord.id, { salaryRange: event.target.value })} /></label>
                <label>Link<input value={selectedRecord.link} onChange={(event) => onUpdate(selectedRecord.id, { link: event.target.value })} /></label>
                <label>Tags<input value={selectedRecord.tags.join(', ')} onChange={(event) => onUpdate(selectedRecord.id, { tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></label>
              </div>

              <label className="baseTextField">Next action<textarea value={selectedRecord.nextAction} onChange={(event) => onUpdate(selectedRecord.id, { nextAction: event.target.value })} /></label>
              <label className="baseTextField">Notes<textarea value={selectedRecord.notes} onChange={(event) => onUpdate(selectedRecord.id, { notes: event.target.value })} /></label>
            </>
          ) : (
            <div className="emptyKnowledge">
              <Database size={34} />
              <p>No record selected. Create a record to start using the base.</p>
              <Button type="primary" onClick={onAdd}>New Record</Button>
            </div>
          )}
        </aside>
      </div>

      {connectorOpen && (
        <FeishuConnectorPanel
          config={feishuConfig}
          records={allRecords}
          onClose={() => setConnectorOpen(false)}
          onConfigUpdate={onConfigUpdate}
          onImportRecords={onImportRecords}
        />
      )}
    </section>
  )
}

function TableIcon() {
  return <ListFilter size={15} />
}

function FeishuConnectorPanel({
  config,
  records,
  onClose,
  onConfigUpdate,
  onImportRecords,
}: {
  config: FeishuConnectorConfig
  records: BaseRecord[]
  onClose: () => void
  onConfigUpdate: (patch: Partial<FeishuConnectorConfig>) => void
  onImportRecords: (records: BaseRecord[]) => void
}) {
  const [draft, setDraft] = useState(config)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [message, setMessage] = useState('Ready')
  const docsUrl = draft.tenant === 'lark'
    ? 'https://open.larksuite.com/document/server-docs/docs/bitable-v1/bitable-overview'
    : 'https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview'

  const saveConfig = () => {
    onConfigUpdate(draft)
    setMessage('Connector settings saved locally.')
  }

  const exportCsv = () => {
    const csv = baseRecordsToCsv(records)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cj-board-base-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setMessage(`Exported ${records.length} records as CSV.`)
  }

  const copyConfig = async () => {
    const summary = [
      'CJ Board Feishu Base Connector',
      `Tenant: ${draft.tenant}`,
      `Embed URL: ${draft.embedUrl || '(not set)'}`,
      `App Token: ${draft.appToken || '(not set)'}`,
      `Table ID: ${draft.tableId || '(not set)'}`,
      `View ID: ${draft.viewId || '(not set)'}`,
      `App ID: ${draft.appId || '(not set)'}`,
      'Next API step: create a backend route that exchanges app_id/app_secret for tenant_access_token, then maps CJ Board BaseRecord fields to Bitable records.',
    ].join('\n')
    await navigator.clipboard.writeText(summary)
    setMessage('Connector summary copied to clipboard.')
  }

  const importJson = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BaseRecord[] | { records?: BaseRecord[] }
        const nextRecords = Array.isArray(parsed) ? parsed : parsed.records
        if (!Array.isArray(nextRecords)) throw new Error('JSON must be an array or { records: [] }')
        onImportRecords(nextRecords)
        setMessage(`Imported ${nextRecords.length} records from JSON.`)
      } catch (error) {
        setMessage(`Import failed: ${String(error)}`)
      }
    }
    reader.readAsText(file)
  }

  return (
    <section className="connectorOverlay">
      <div className="connectorPanel" role="dialog" aria-modal="true" aria-label="Feishu Base connector">
        <header className="connectorHeader">
          <div>
            <p className="eyebrow">Integration</p>
            <h2>Feishu Base Connector</h2>
            <span>Embed a shared Base link now, then use API identifiers later for real cloud sync.</span>
          </div>
          <button type="button" className="iconButton" onClick={onClose} aria-label="Close connector"><X size={17} /></button>
        </header>

        <div className="connectorBody">
          <section className="connectorConfig">
            <PanelTitle title="Connection settings" subtitle="Saved locally in CJ Board" />
            <div className="connectorFormGrid">
              <label>Tenant<select value={draft.tenant} onChange={(event) => setDraft((current) => ({ ...current, tenant: event.target.value as FeishuConnectorConfig['tenant'] }))}><option value="feishu">Feishu</option><option value="lark">Lark</option></select></label>
              <label>App ID<input value={draft.appId} onChange={(event) => setDraft((current) => ({ ...current, appId: event.target.value }))} placeholder="cli_xxx or app id" /></label>
              <label>App Token<input value={draft.appToken} onChange={(event) => setDraft((current) => ({ ...current, appToken: event.target.value }))} placeholder="Base app_token" /></label>
              <label>Table ID<input value={draft.tableId} onChange={(event) => setDraft((current) => ({ ...current, tableId: event.target.value }))} placeholder="tbl_xxx" /></label>
              <label>View ID<input value={draft.viewId} onChange={(event) => setDraft((current) => ({ ...current, viewId: event.target.value }))} placeholder="vew_xxx" /></label>
              <label>Embed URL<input value={draft.embedUrl} onChange={(event) => setDraft((current) => ({ ...current, embedUrl: event.target.value }))} placeholder="Paste a published/shared Base URL" /></label>
            </div>
            <div className="connectorActions">
              <Button type="primary" icon={<CheckCircle2 size={16} />} onClick={saveConfig}>Save</Button>
              <Button icon={<LayoutDashboard size={16} />} onClick={() => { setPreviewOpen((value) => !value); setMessage(draft.embedUrl ? 'Embed preview toggled.' : 'Paste an embed URL before previewing.') }}>Preview Embed</Button>
              <Button icon={<Link2 size={16} />} onClick={() => window.open(docsUrl, '_blank', 'noopener,noreferrer')}>Open API Docs</Button>
              <Button icon={<Download size={16} />} onClick={exportCsv}>Export CSV</Button>
              <label className="connectorFileButton">
                <Upload size={16} />
                <span>Import JSON</span>
                <input type="file" accept="application/json" onChange={(event) => importJson(event.target.files?.[0])} />
              </label>
              <Button icon={<FileText size={16} />} onClick={copyConfig}>Copy API Plan</Button>
            </div>
            <p className="connectorStatus">{message}</p>
          </section>

          <section className="connectorGuide">
            <PanelTitle title="GitHub implementation pattern" subtitle="Use embed first, then API sync" />
            <div className="usageDoc">
              <p><strong>Embed mode: </strong>Paste a public/shared Base URL and use Preview Embed inside CJ Board.</p>
              <p><strong>API mode: </strong>Store app_token, table_id, and view_id here, then add a backend sync route when credentials are ready.</p>
              <p><strong>Local data: </strong>CSV export and JSON import already work without cloud credentials.</p>
              <p><strong>Safety: </strong>Do not paste app_secret into this panel. Secrets belong in the hidden local server environment.</p>
            </div>
          </section>
        </div>

        {previewOpen && (
          <section className="connectorPreview">
            {draft.embedUrl ? (
              <iframe title="Feishu Base embed preview" src={draft.embedUrl} />
            ) : (
              <div className="connectorEmptyPreview"><Database size={32} /><p>Paste an embed URL to preview a Feishu/Lark Base here.</p></div>
            )}
          </section>
        )}
      </div>
    </section>
  )
}
