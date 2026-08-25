import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Checkbox, Empty, Tag, Tooltip } from '@arco-design/web-react'
import {
  ArrowDownAZ,
  Bell,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Filter,
  Hash,
  ListFilter,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'
import { format, parseISO } from 'date-fns'
import { areas, automationActionMeta, automationFieldLabels, automationTriggerMeta, columns } from '../constants'
import { automationActionSummary } from '../utils'
import type { AutomationAction, AutomationField, AutomationLog, AutomationRule, AutomationTrigger, Task } from '../types'

function AutomationCenter({
  rules,
  logs,
  selectedTask,
  createRequest,
  onCreate,
  onToggle,
  onDelete,
  onRun,
  onClearLogs,
}: {
  rules: AutomationRule[]
  logs: AutomationLog[]
  selectedTask?: Task
  createRequest: number
  onCreate: (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>) => void
  onToggle: (ruleId: string) => void
  onDelete: (ruleId: string) => void
  onRun: (ruleId: string) => void
  onClearLogs: () => void
}) {
  const [section, setSection] = useState<'manage' | 'activity'>('manage')
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState({
    name: '',
    active: true,
    trigger: 'record_updated' as AutomationTrigger,
    triggerField: 'status' as AutomationField,
    conditionEnabled: false,
    conditionField: 'priority' as AutomationField,
    conditionValue: 'high',
    action: 'notify' as AutomationAction,
    actionValue: 'A task needs your attention.',
  })

  const resetDraft = () => setDraft({
    name: '',
    active: true,
    trigger: 'record_updated',
    triggerField: 'status',
    conditionEnabled: false,
    conditionField: 'priority',
    conditionValue: 'high',
    action: 'notify',
    actionValue: 'A task needs your attention.',
  })

  useEffect(() => {
    if (!createRequest) return
    setSection('manage')
    setCreating(true)
  }, [createRequest])

  const filteredRules = rules.filter((rule) =>
    !search.trim() || [rule.name, automationTriggerMeta[rule.trigger].label, automationActionMeta[rule.action].label]
      .join(' ').toLowerCase().includes(search.trim().toLowerCase()),
  )
  const filteredLogs = logs.filter((log) =>
    !search.trim() || [log.ruleName, log.taskTitle, log.detail, log.result]
      .join(' ').toLowerCase().includes(search.trim().toLowerCase()),
  )

  const conditionValueEditor = (
    <AutomationValueEditor
      field={draft.conditionField}
      value={draft.conditionValue}
      onChange={(conditionValue) => setDraft((current) => ({ ...current, conditionValue }))}
    />
  )

  return (
    <section className="automationCenter">
      <header className="automationHeader">
        <div>
          <p className="eyebrow">Task automation</p>
          <h2>Automation Center</h2>
          <span>Build trigger-and-action rules for the task board.</span>
        </div>
      </header>

      <div className="automationStats">
        <div><Zap size={17} /><span>Active</span><strong>{rules.filter((rule) => rule.active).length}</strong></div>
        <div><Workflow size={17} /><span>Automations</span><strong>{rules.length}</strong></div>
        <div><CheckCircle2 size={17} /><span>Successful runs</span><strong>{logs.filter((log) => log.result === 'Succeeded').length}</strong></div>
        <div><Clock3 size={17} /><span>Last run</span><strong>{logs[0] ? format(parseISO(logs[0].createdAt), 'MM-dd HH:mm') : 'Never'}</strong></div>
      </div>

      {creating ? (
        <section className="automationBuilder">
          <header>
            <div><p className="eyebrow">New automation</p><h3>Configure trigger and action</h3></div>
            <button type="button" className="iconButton" onClick={() => setCreating(false)} aria-label="Close automation builder"><X size={17} /></button>
          </header>
          <label className="automationNameField">Automation name
            <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="For example: Notify when a high-priority task starts" />
          </label>

          <div className="automationFlow">
            <section className="flowNode triggerNode">
              <div className="flowNodeTitle"><span><Zap size={16} /></span><div><strong>When this happens</strong><small>Trigger</small></div></div>
              <label>Event
                <select value={draft.trigger} onChange={(event) => setDraft((current) => ({ ...current, trigger: event.target.value as AutomationTrigger }))}>
                  {Object.entries(automationTriggerMeta).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}
                </select>
              </label>
              {draft.trigger === 'record_updated' && (
                <label>Field to watch
                  <select value={draft.triggerField} onChange={(event) => setDraft((current) => ({ ...current, triggerField: event.target.value as AutomationField }))}>
                    {Object.entries(automationFieldLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
                  </select>
                </label>
              )}
              <p>{automationTriggerMeta[draft.trigger].description}</p>
            </section>

            <div className="flowConnector"><span /><ArrowFlowIcon /></div>

            <section className="flowNode conditionNode">
              <div className="flowNodeTitle"><span><Filter size={16} /></span><div><strong>Only if</strong><small>Optional condition</small></div></div>
              <Checkbox checked={draft.conditionEnabled} onChange={(conditionEnabled) => setDraft((current) => ({ ...current, conditionEnabled }))}>Add a task condition</Checkbox>
              {draft.conditionEnabled && (
                <>
                  <label>Task field
                    <select value={draft.conditionField} onChange={(event) => setDraft((current) => ({ ...current, conditionField: event.target.value as AutomationField, conditionValue: '' }))}>
                      {Object.entries(automationFieldLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
                    </select>
                  </label>
                  <label>Equals{conditionValueEditor}</label>
                </>
              )}
            </section>

            <div className="flowConnector"><span /><ArrowFlowIcon /></div>

            <section className="flowNode actionNode">
              <div className="flowNodeTitle"><span><Play size={16} /></span><div><strong>Then do this</strong><small>Action</small></div></div>
              <label>Action
                <select value={draft.action} onChange={(event) => {
                  const action = event.target.value as AutomationAction
                  const defaults: Record<AutomationAction, string> = { set_status: 'doing', set_priority: 'high', add_tag: 'Automated', set_reminder: '30', notify: 'A task needs your attention.' }
                  setDraft((current) => ({ ...current, action, actionValue: defaults[action] }))
                }}>
                  {Object.entries(automationActionMeta).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}
                </select>
              </label>
              <AutomationActionValue action={draft.action} value={draft.actionValue} onChange={(actionValue) => setDraft((current) => ({ ...current, actionValue }))} />
              <p>{automationActionMeta[draft.action].description}</p>
            </section>
          </div>

          <footer className="builderActions">
            <span>{selectedTask ? `Test target: ${selectedTask.title}` : 'Select a task to use Run now later.'}</span>
            <div>
              <Button onClick={() => { resetDraft(); setCreating(false) }}>Cancel</Button>
              <Button type="primary" icon={<Zap size={16} />} onClick={() => {
                onCreate({ ...draft, name: draft.name.trim() || `${automationTriggerMeta[draft.trigger].label} → ${automationActionMeta[draft.action].label}` })
                resetDraft()
                setCreating(false)
              }}>Save and Activate</Button>
            </div>
          </footer>
        </section>
      ) : (
        <div className="automationWorkspace">
          <aside className="automationNav">
            <button type="button" className={clsx(section === 'manage' && 'active')} onClick={() => setSection('manage')}><Workflow size={16} />Manage<span>{rules.length}</span></button>
            <button type="button" className={clsx(section === 'activity' && 'active')} onClick={() => setSection('activity')}><Clock3 size={16} />Activity Log<span>{logs.length}</span></button>
            <div className="automationNavGroup"><strong>Status</strong><span>Active {rules.filter((rule) => rule.active).length}</span><span>Inactive {rules.filter((rule) => !rule.active).length}</span></div>
            <div className="automationNavGroup"><strong>Trigger</strong>{Object.entries(automationTriggerMeta).map(([key, meta]) => <span key={key}>{meta.label.replace('When a task ', '').replace('When a ', '')} {rules.filter((rule) => rule.trigger === key).length}</span>)}</div>
          </aside>

          <section className="automationContent">
            <div className="automationContentToolbar">
              <label className="automationSearch"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={section === 'manage' ? 'Search automations' : 'Search activity'} /></label>
              {section === 'activity' && logs.length > 0 && <Button onClick={onClearLogs}>Clear Log</Button>}
            </div>

            {section === 'manage' ? (
              <div className="automationRuleList">
                {!filteredRules.length && <Empty description="No automations yet" />}
                {filteredRules.map((rule) => (
                  <article className="automationRuleCard" key={rule.id}>
                    <button type="button" className={clsx('automationSwitch', rule.active && 'active')} onClick={() => onToggle(rule.id)} aria-label={rule.active ? 'Pause automation' : 'Activate automation'}>{rule.active ? <Play size={13} /> : <Pause size={13} />}</button>
                    <div className="automationRuleMain">
                      <div className="automationRuleTitle"><strong>{rule.name}</strong><Tag color={rule.active ? 'green' : 'gray'}>{rule.active ? 'Active' : 'Inactive'}</Tag></div>
                      <div className="ruleFlowSummary"><span><Zap size={14} />{automationTriggerMeta[rule.trigger].label}</span><ChevronRight size={14} /><span><Play size={14} />{automationActionMeta[rule.action].label}: {automationActionSummary(rule)}</span></div>
                      {rule.conditionEnabled && <small>Only if {automationFieldLabels[rule.conditionField]} equals {rule.conditionValue}</small>}
                    </div>
                    <div className="automationRuleMeta"><strong>{rule.runCount || 0}</strong><span>runs</span></div>
                    <div className="automationRuleActions">
                      <Tooltip content="Run now on selected task"><button type="button" aria-label="Run automation now" onClick={() => onRun(rule.id)}><Play size={15} /></button></Tooltip>
                      <Tooltip content="Delete automation"><button type="button" aria-label="Delete automation" onClick={() => onDelete(rule.id)}><Trash2 size={15} /></button></Tooltip>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="automationLogList">
                {!filteredLogs.length && <Empty description="No automation activity" />}
                {filteredLogs.map((log) => (
                  <article key={log.id}>
                    <span className="logStatus"><CheckCircle2 size={16} /></span>
                    <div><strong>{log.ruleName}</strong><p>{log.detail}</p><small>{log.taskTitle}</small></div>
                    <Tag color="green">{log.result}</Tag>
                    <time>{format(parseISO(log.createdAt), 'MM-dd HH:mm:ss')}</time>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  )
}

// Retained temporarily for local data compatibility while the redesigned center is validated.
void AutomationCenter

export function AutomationCenterV2({
  rules,
  logs,
  selectedTask,
  createRequest,
  onCreate,
  onToggle,
  onDelete,
  onRun,
  onClearLogs,
}: {
  rules: AutomationRule[]
  logs: AutomationLog[]
  selectedTask?: Task
  createRequest: number
  onCreate: (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>) => void
  onToggle: (ruleId: string) => void
  onDelete: (ruleId: string) => void
  onRun: (ruleId: string) => void
  onClearLogs: () => void
}) {
  type Section = 'recommended' | 'manage' | 'activity'
  type RuleFilter = 'all' | 'active' | 'inactive' | 'created' | 'scheduled'
  type RuleSort = 'updated' | 'name' | 'runs'
  const emptyDraft = () => ({
    name: '', active: true, trigger: 'record_updated' as AutomationTrigger,
    triggerField: 'status' as AutomationField, conditionEnabled: false,
    conditionField: 'priority' as AutomationField, conditionValue: 'high',
    action: 'notify' as AutomationAction, actionValue: 'A task needs your attention.',
  })
  const [section, setSection] = useState<Section>('manage')
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [ruleFilter, setRuleFilter] = useState<RuleFilter>('all')
  const [ruleSort, setRuleSort] = useState<RuleSort>('updated')
  const [control, setControl] = useState<'filter' | 'sort' | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft)

  useEffect(() => {
    if (!createRequest) return
    setSection('manage')
    setCreating(true)
  }, [createRequest])

  const activeCount = rules.filter((rule) => rule.active).length
  const filteredRules = [...rules].filter((rule) => {
    const queryMatch = !search.trim() || [rule.name, automationTriggerMeta[rule.trigger].label, automationActionMeta[rule.action].label]
      .join(' ').toLowerCase().includes(search.trim().toLowerCase())
    const filterMatch = ruleFilter === 'all' || ruleFilter === 'created' ||
      (ruleFilter === 'active' && rule.active) || (ruleFilter === 'inactive' && !rule.active) ||
      (ruleFilter === 'scheduled' && rule.trigger === 'due_time')
    return queryMatch && filterMatch
  }).sort((a, b) => ruleSort === 'name' ? a.name.localeCompare(b.name)
    : ruleSort === 'runs' ? (b.runCount || 0) - (a.runCount || 0)
      : b.updatedAt.localeCompare(a.updatedAt))
  const filteredLogs = logs.filter((log) => !search.trim() || [log.ruleName, log.taskTitle, log.detail, log.result]
    .join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  const templates: Array<{ title: string; description: string; icon: ReactNode; rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'runCount'> }> = [
    { title: 'High-priority alert', description: 'Notify you when a high-priority task is created.', icon: <Bell size={18} />, rule: { name: 'High-priority task alert', active: true, trigger: 'task_created', triggerField: 'status', conditionEnabled: true, conditionField: 'priority', conditionValue: 'high', action: 'notify', actionValue: 'A high-priority task needs your attention.' } },
    { title: 'Due-time reminder', description: 'Send a desktop notification when a task reaches its due time.', icon: <CalendarClock size={18} />, rule: { name: 'Due-time reminder', active: true, trigger: 'due_time', triggerField: 'dueDate', conditionEnabled: false, conditionField: 'status', conditionValue: 'doing', action: 'notify', actionValue: 'A task is due now.' } },
    { title: 'Tag completed work', description: 'Add an archive tag when a task changes to Done.', icon: <Hash size={18} />, rule: { name: 'Tag completed work', active: true, trigger: 'record_updated', triggerField: 'status', conditionEnabled: true, conditionField: 'status', conditionValue: 'done', action: 'add_tag', actionValue: 'Completed' } },
  ]

  const openManageFilter = (filter: RuleFilter) => {
    setSection('manage')
    setCreating(false)
    setRuleFilter(filter)
  }
  const saveDraft = () => {
    onCreate({ ...draft, name: draft.name.trim() || `${automationTriggerMeta[draft.trigger].label} to ${automationActionMeta[draft.action].label}` })
    setDraft(emptyDraft())
    setCreating(false)
    setSection('manage')
  }

  return (
    <section className="automationCenter automationCenterV2">
      <header className="automationProductHeader">
        <div className="automationBrand"><span><Bot size={18} /></span><strong>Automation Center</strong></div>
        <nav className="automationTopTabs" aria-label="Automation sections">
          <button type="button" className={clsx(section === 'recommended' && 'active')} onClick={() => { setSection('recommended'); setCreating(false) }}>Recommended</button>
          <button type="button" className={clsx(section === 'manage' && 'active')} onClick={() => { setSection('manage'); setCreating(false) }}>Manage ({activeCount}/{rules.length})</button>
        </nav>
      </header>

      <div className="automationWorkspace automationWorkspaceV2">
        <aside className="automationNav automationNavV2">
          <div className="automationNavMain">
            <button type="button" className={clsx(section === 'manage' && ruleFilter === 'all' && 'active')} onClick={() => openManageFilter('all')}><Workflow size={16} />All Automations<span>{rules.length}</span></button>
            <button type="button" className={clsx(section === 'manage' && ruleFilter === 'active' && 'active')} onClick={() => openManageFilter('active')}><CheckCircle2 size={16} />Active<span>{activeCount}</span></button>
            <button type="button" className={clsx(section === 'manage' && ruleFilter === 'inactive' && 'active')} onClick={() => openManageFilter('inactive')}><Pause size={16} />Inactive<span>{rules.length - activeCount}</span></button>
            <button type="button" className={clsx(section === 'manage' && ruleFilter === 'created' && 'active')} onClick={() => openManageFilter('created')}><UserRound size={16} />Created by Me<span>{rules.length}</span></button>
            <button type="button" className={clsx(section === 'manage' && ruleFilter === 'scheduled' && 'active')} onClick={() => openManageFilter('scheduled')}><Clock3 size={16} />At Scheduled Time<span>{rules.filter((rule) => rule.trigger === 'due_time').length}</span></button>
          </div>
          <button type="button" className="automationGuideLink" onClick={() => setGuideOpen(true)}><CircleHelp size={16} />User Guide</button>
        </aside>

        <section className="automationContent automationContentV2">
          <div className="automationContentToolbar automationToolbarV2">
            <label className="automationSearch"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={section === 'activity' ? 'Search activity' : section === 'recommended' ? 'Search templates' : 'Enter automation name'} /></label>
            <div className="automationPrimaryActions">
              <Button icon={<Clock3 size={15} />} onClick={() => { setSection('activity'); setCreating(false) }}>Activity Log</Button>
              <Button type="primary" icon={<Plus size={16} />} onClick={() => { setDraft(emptyDraft()); setCreating(true); setSection('manage') }}>Create Automation</Button>
            </div>
          </div>

          {creating ? (
            <div className="automationBuilderWrap"><section className="automationBuilder automationBuilderV2">
              <header><div><p className="eyebrow">New automation</p><h3>Configure trigger and action</h3></div><button type="button" className="iconButton" onClick={() => setCreating(false)} aria-label="Close automation builder"><X size={17} /></button></header>
              <label className="automationNameField">Automation name<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="For example: Notify when a high-priority task starts" /></label>
              <div className="automationFlow">
                <section className="flowNode triggerNode"><div className="flowNodeTitle"><span><Zap size={16} /></span><div><strong>When this happens</strong><small>Trigger</small></div></div><label>Event<select value={draft.trigger} onChange={(event) => setDraft((current) => ({ ...current, trigger: event.target.value as AutomationTrigger }))}>{Object.entries(automationTriggerMeta).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}</select></label>{draft.trigger === 'record_updated' && <label>Field to watch<select value={draft.triggerField} onChange={(event) => setDraft((current) => ({ ...current, triggerField: event.target.value as AutomationField }))}>{Object.entries(automationFieldLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>}</section>
                <div className="flowConnector"><span /><ArrowFlowIcon /></div>
                <section className="flowNode conditionNode"><div className="flowNodeTitle"><span><Filter size={16} /></span><div><strong>Only if</strong><small>Optional condition</small></div></div><Checkbox checked={draft.conditionEnabled} onChange={(conditionEnabled) => setDraft((current) => ({ ...current, conditionEnabled }))}>Add a task condition</Checkbox>{draft.conditionEnabled && <><label>Task field<select value={draft.conditionField} onChange={(event) => setDraft((current) => ({ ...current, conditionField: event.target.value as AutomationField, conditionValue: '' }))}>{Object.entries(automationFieldLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>Equals<AutomationValueEditor field={draft.conditionField} value={draft.conditionValue} onChange={(conditionValue) => setDraft((current) => ({ ...current, conditionValue }))} /></label></>}</section>
                <div className="flowConnector"><span /><ArrowFlowIcon /></div>
                <section className="flowNode actionNode"><div className="flowNodeTitle"><span><Play size={16} /></span><div><strong>Then do this</strong><small>Action</small></div></div><label>Action<select value={draft.action} onChange={(event) => { const action = event.target.value as AutomationAction; const defaults: Record<AutomationAction, string> = { set_status: 'doing', set_priority: 'high', add_tag: 'Automated', set_reminder: '30', notify: 'A task needs your attention.' }; setDraft((current) => ({ ...current, action, actionValue: defaults[action] })) }}>{Object.entries(automationActionMeta).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}</select></label><AutomationActionValue action={draft.action} value={draft.actionValue} onChange={(actionValue) => setDraft((current) => ({ ...current, actionValue }))} /></section>
              </div>
              <footer className="builderActions"><span>{selectedTask ? `Test target: ${selectedTask.title}` : 'Select a task to use Run now later.'}</span><div><Button onClick={() => setCreating(false)}>Cancel</Button><Button type="primary" icon={<Zap size={16} />} onClick={saveDraft}>Save and Activate</Button></div></footer>
            </section></div>
          ) : section === 'recommended' ? (
            <div className="automationRecommendations"><header><div><p className="eyebrow">Recommended</p><h3>Start with a proven workflow</h3></div><span>Templates create active rules that you can manage immediately.</span></header><div className="automationTemplateGrid">{templates.filter((template) => !search.trim() || [template.title, template.description].join(' ').toLowerCase().includes(search.trim().toLowerCase())).map((template) => <article key={template.title}><span>{template.icon}</span><div><strong>{template.title}</strong><p>{template.description}</p></div><Button onClick={() => { onCreate(template.rule); setSection('manage') }}>Use Template</Button></article>)}</div></div>
          ) : section === 'manage' ? (
            <div className="automationManageBody">
              <div className="automationListSummary"><span>All automations: {filteredRules.length} <b>Active: {filteredRules.filter((rule) => rule.active).length}</b></span><div><button type="button" className={clsx(control === 'filter' && 'active')} onClick={() => setControl((value) => value === 'filter' ? null : 'filter')}><ListFilter size={14} />Filter</button><button type="button" className={clsx(control === 'sort' && 'active')} onClick={() => setControl((value) => value === 'sort' ? null : 'sort')}><ArrowDownAZ size={14} />Sort</button></div></div>
              {control && <div className="automationInlineControls">{control === 'filter' ? <label>Status<select value={ruleFilter} onChange={(event) => setRuleFilter(event.target.value as RuleFilter)}><option value="all">All automations</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="created">Created by me</option><option value="scheduled">At scheduled time</option></select></label> : <label>Sort by<select value={ruleSort} onChange={(event) => setRuleSort(event.target.value as RuleSort)}><option value="updated">Recently updated</option><option value="name">Name A-Z</option><option value="runs">Most runs</option></select></label>}</div>}
              <div className="automationRuleList">{!filteredRules.length && <Empty description="No automations match this view" />}{filteredRules.map((rule) => <article className="automationRuleCard automationRuleCardV2" key={rule.id}><div className="automationRuleMain"><div className="automationRuleTitle"><strong>{rule.name}</strong></div><div className="ruleFlowSummary"><span>{automationTriggerMeta[rule.trigger].label}, then {automationActionMeta[rule.action].label.toLowerCase()}: {automationActionSummary(rule)}.</span></div>{rule.conditionEnabled && <small>Only if {automationFieldLabels[rule.conditionField]} equals {rule.conditionValue}</small>}<div className="automationRuleFooter"><span>Created by Me</span><i /><span>Updated {format(parseISO(rule.updatedAt), 'MMM d, HH:mm')}</span><i /><span>{rule.runCount || 0} runs</span></div></div><button type="button" className={clsx('automationToggle', rule.active && 'active')} onClick={() => onToggle(rule.id)} aria-label={rule.active ? 'Pause automation' : 'Activate automation'}><span /></button><div className="automationMoreWrap"><button type="button" className="automationMoreButton" onClick={() => setOpenMenuId((current) => current === rule.id ? null : rule.id)} aria-label="More automation actions"><MoreHorizontal size={18} /></button>{openMenuId === rule.id && <div className="automationMoreMenu"><button type="button" onClick={() => { onRun(rule.id); setOpenMenuId(null) }}><Play size={14} />Run now</button><button type="button" onClick={() => { onDelete(rule.id); setOpenMenuId(null) }}><Trash2 size={14} />Delete</button></div>}</div></article>)}</div>
            </div>
          ) : (
            <div className="automationActivityBody"><div className="automationListSummary"><span>Activity Log: {filteredLogs.length} events</span>{logs.length > 0 && <Button onClick={onClearLogs}>Clear Log</Button>}</div><div className="automationLogList">{!filteredLogs.length && <Empty description="No automation activity" />}{filteredLogs.map((log) => <article key={log.id}><span className="logStatus"><CheckCircle2 size={16} /></span><div><strong>{log.ruleName}</strong><p>{log.detail}</p><small>{log.taskTitle}</small></div><Tag color="green">{log.result}</Tag><time>{format(parseISO(log.createdAt), 'MM-dd HH:mm:ss')}</time></article>)}</div></div>
          )}
        </section>
      </div>
      {guideOpen && <AutomationGuide onClose={() => setGuideOpen(false)} />}
    </section>
  )
}

function AutomationGuide({ onClose }: { onClose: () => void }) {
  return <div className="automationGuideOverlay" role="dialog" aria-modal="true" aria-label="Automation Center user guide"><section className="automationGuidePanel"><header><div><p className="eyebrow">CJ Board Help</p><h2>Automation Center Guide</h2></div><button type="button" className="iconButton" onClick={onClose} aria-label="Close user guide"><X size={17} /></button></header><div className="automationGuideIntro"><Sparkles size={20} /><div><strong>Automate repetitive task management</strong><p>Each automation watches for a trigger, optionally checks a condition, and then performs one action.</p></div></div><ol><li><strong>Create or choose a template</strong><span>Open Recommended for ready-made workflows, or choose Create Automation to build your own.</span></li><li><strong>Choose a trigger</strong><span>Run a rule when a task is created, a field changes, a condition becomes true, or a due time arrives.</span></li><li><strong>Add a condition</strong><span>Restrict the rule by status, priority, area, or due date. Conditions are optional.</span></li><li><strong>Choose an action</strong><span>Change status or priority, add a tag, schedule a reminder, or send a desktop notification.</span></li><li><strong>Manage and review</strong><span>Use the left filters to find rules, the switch to pause them, the more menu to test or delete, and Activity Log to review runs.</span></li></ol><div className="automationGuideNote"><Bell size={16} /><span>Desktop alerts require notification permission. Enable it in Settings &gt; System.</span></div></section></div>
}

function ArrowFlowIcon() {
  return <ChevronRight size={17} />
}

function AutomationValueEditor({ field, value, onChange }: { field: AutomationField; value: string; onChange: (value: string) => void }) {
  if (field === 'status') return <select value={value} onChange={(event) => onChange(event.target.value)}>{columns.map((column) => <option value={column.id} key={column.id}>{column.title}</option>)}</select>
  if (field === 'priority') return <select value={value} onChange={(event) => onChange(event.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
  if (field === 'area') return <select value={value} onChange={(event) => onChange(event.target.value)}>{areas.slice(1).map((item) => <option value={item} key={item}>{item}</option>)}</select>
  return <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
}

function AutomationActionValue({ action, value, onChange }: { action: AutomationAction; value: string; onChange: (value: string) => void }) {
  if (action === 'set_status') return <label>New status<select value={value} onChange={(event) => onChange(event.target.value)}>{columns.map((column) => <option value={column.id} key={column.id}>{column.title}</option>)}</select></label>
  if (action === 'set_priority') return <label>New priority<select value={value} onChange={(event) => onChange(event.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
  if (action === 'set_reminder') return <label>Minutes after trigger<input type="number" min="1" max="10080" value={value} onChange={(event) => onChange(event.target.value)} /></label>
  return <label>{action === 'add_tag' ? 'Tag' : 'Notification message'}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={action === 'add_tag' ? 'Automated' : 'Task needs attention'} /></label>
}
