import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Dropdown, Input, Menu, Modal, Select, Tooltip } from '@arco-design/web-react'
import {
  BarChart3,
  Bot,
  CalendarRange,
  ChevronDown,
  Database,
  FileText,
  Hash,
  LayoutDashboard,
  ListFilter,
  ListTodo,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sun,
  Target,
  Upload,
  Workflow,
} from 'lucide-react'
import clsx from 'clsx'
import type { InsightsSection, Priority, RouteState, SettingsSectionKey, TaskSubView, ViewKey } from './types'
import { areas, readRouteFromUrl, writeRouteToUrl } from './constants'
import { loadAppSettings } from './utils'
import { useBoardData } from './hooks/useBoardData'
import { AutomationCenterV2 } from './components/AutomationCenter'
import { ImportWizard } from './components/ImportWizard'
import { ProjectManagementView } from './components/ProjectManagementView'
import { BaseRecordsView } from './components/BaseRecordsView'
import { KnowledgeView } from './components/KnowledgeView'
import { TaskDetail } from './components/TaskDetail'
import { ColorPicker } from './components/ColorPicker'
import { areaColor } from './colors'
import { TodayPage } from './pages/TodayPage'
import { TasksPage } from './pages/TasksPage'
import { PlanningPage } from './pages/PlanningPage'
import { InsightsPage } from './pages/InsightsPage'
import { AssistantPage } from './pages/AssistantPage'
import { SettingsPage } from './pages/SettingsPage'
import './App.css'
import './feishu.css'

type NavItem = { key: ViewKey; label: string; hint: string; icon: ReactNode }

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Work',
    items: [
      { key: 'today', label: 'Today', hint: 'Focus and due work', icon: <Sun size={15} /> },
      { key: 'tasks', label: 'Tasks', hint: 'Board, table, process', icon: <ListTodo size={15} /> },
      { key: 'planning', label: 'Planning', hint: 'Timeline and templates', icon: <CalendarRange size={15} /> },
      { key: 'insights', label: 'Insights', hint: 'Charts and KPIs', icon: <BarChart3 size={15} /> },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { key: 'projects', label: 'Projects', hint: 'Portfolio progress', icon: <Target size={15} /> },
      { key: 'base', label: 'Base', hint: 'Multiview records', icon: <Database size={15} /> },
      { key: 'knowledge', label: 'Knowledge', hint: 'Notes and graph', icon: <Network size={15} /> },
    ],
  },
  {
    label: 'System',
    items: [
      { key: 'automations', label: 'Automations', hint: 'Rules and logs', icon: <Workflow size={15} /> },
      { key: 'assistant', label: 'Assistant', hint: 'Learning agent', icon: <Bot size={15} /> },
      { key: 'settings', label: 'Settings', hint: 'Preferences and audit', icon: <Settings size={15} /> },
    ],
  },
]

const pageTitles: Record<ViewKey, string> = {
  today: 'Today',
  tasks: 'Tasks',
  planning: 'Planning',
  insights: 'Insights',
  projects: 'Projects',
  base: 'Base',
  knowledge: 'Knowledge',
  automations: 'Automations',
  assistant: 'Assistant',
  settings: 'Settings',
}

const detailViews: ViewKey[] = ['today', 'tasks', 'planning']

function App() {
  const [route, setRoute] = useState<Required<RouteState>>(() => readRouteFromUrl(loadAppSettings().defaultView))
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  useEffect(() => {
    writeRouteToUrl(route)
  }, [route])

  const navigate = useCallback((view: ViewKey) => {
    setRoute((current) => ({ ...current, view }))
  }, [])
  const setTaskView = (taskView: TaskSubView) => setRoute((current) => ({ ...current, view: 'tasks', taskView }))
  const setInsights = (insights: InsightsSection) => setRoute((current) => ({ ...current, view: 'insights', insights }))
  const setSettingsSection = (settingsSection: SettingsSectionKey) => setRoute((current) => ({ ...current, view: 'settings', settingsSection }))

  const data = useBoardData(navigate)
  const { view } = route
  const showDetail = detailViews.includes(view)

  const submitQuickAdd = () => {
    if (!data.draft.title.trim()) {
      data.setToast('Enter a task title first')
      return
    }
    data.addTask()
    setQuickAddOpen(false)
    data.setToast('Task added')
  }

  const newMenu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key === 'task') setQuickAddOpen(true)
        if (key === 'note') data.addNote()
        if (key === 'project') data.addProject()
        if (key === 'record') data.addBaseRecord()
        if (key === 'import') data.setImportOpen(true)
        if (key === 'automation') {
          navigate('automations')
          data.setAutomationCreateRequest((current) => current + 1)
        }
      }}
    >
      <Menu.Item key="task"><ListTodo size={14} /> Task</Menu.Item>
      <Menu.Item key="note"><FileText size={14} /> Note</Menu.Item>
      <Menu.Item key="project"><Target size={14} /> Project</Menu.Item>
      <Menu.Item key="record"><Database size={14} /> Base record</Menu.Item>
      <Menu.Item key="automation"><Workflow size={14} /> Automation</Menu.Item>
      <Menu.Item key="import"><Upload size={14} /> Import schedule…</Menu.Item>
    </Menu>
  )

  const renderPage = () => {
    switch (view) {
      case 'today':
        return <TodayPage data={data} />
      case 'tasks':
        return <TasksPage data={data} taskView={route.taskView} onTaskViewChange={setTaskView} />
      case 'planning':
        return <PlanningPage data={data} />
      case 'insights':
        return (
          <InsightsPage
            data={data}
            section={route.insights}
            onSectionChange={setInsights}
            onOpenTasks={() => setTaskView('table')}
            onOpenTask={(id) => { data.openTaskDetail(id); navigate('tasks') }}
          />
        )
      case 'projects':
        return (
          <ProjectManagementView
            projects={data.filteredProjects}
            allProjects={data.projects}
            tasks={data.tasks}
            selectedProject={data.selectedProject}
            projectQuery={data.projectQuery}
            setProjectQuery={data.setProjectQuery}
            setSelectedProjectId={data.setSelectedProjectId}
            setSelectedTaskId={(id) => { data.openTaskDetail(id); navigate('tasks') }}
            addProject={data.addProject}
            updateProject={data.updateProject}
            deleteProject={data.deleteProject}
          />
        )
      case 'base':
        return (
          <BaseRecordsView
            records={data.filteredBaseRecords}
            allRecords={data.baseRecords}
            selectedRecord={data.selectedBaseRecord}
            feishuConfig={data.feishuConfig}
            onSelect={data.setSelectedBaseRecordId}
            onAdd={data.addBaseRecord}
            onUpdate={data.updateBaseRecord}
            onDelete={data.deleteBaseRecord}
            onConfigUpdate={data.updateFeishuConfig}
            onImportRecords={data.importBaseRecords}
          />
        )
      case 'knowledge':
        return (
          <KnowledgeView
            notes={data.notes}
            tasks={data.tasks}
            filteredNotes={data.filteredNotes}
            selectedNote={data.selectedNote}
            noteQuery={data.noteQuery}
            setNoteQuery={data.setNoteQuery}
            setSelectedNoteId={data.setSelectedNoteId}
            updateNote={data.updateNote}
            addNote={data.addNote}
            deleteNote={data.deleteNote}
          />
        )
      case 'automations':
        return (
          <AutomationCenterV2
            rules={data.automations}
            logs={data.automationLogs}
            selectedTask={data.selectedTask}
            createRequest={data.automationCreateRequest}
            onCreate={data.createAutomation}
            onToggle={data.toggleAutomation}
            onDelete={data.deleteAutomation}
            onRun={data.runAutomationNow}
            onClearLogs={data.clearAutomationLogs}
          />
        )
      case 'assistant':
        return <AssistantPage data={data} />
      case 'settings':
        return <SettingsPage data={data} section={route.settingsSection} onSectionChange={setSettingsSection} onNavigate={navigate} />
      default:
        return null
    }
  }

  return (
    <main
      className={clsx(
        'appShell',
        data.appSettings.interfaceDensity === 'compact' && 'densityCompact',
        data.navCollapsed && 'navCollapsed',
        data.detailCollapsed && 'detailCollapsed',
        !showDetail && 'noDetail',
      )}
    >
      <aside className={clsx('sidebar', data.navCollapsed && 'sidebarCollapsed')}>
        <div className="brand">
          <div className="brandIcon"><LayoutDashboard size={20} /></div>
          <div className="brandCopy">
            <strong>CJ Board</strong>
            <span>{data.serverBacked ? 'Desktop sync on' : 'Local browser mode'}</span>
          </div>
        </div>

        <Tooltip content={data.navCollapsed ? 'Expand navigation' : 'Collapse navigation'} position="right">
          <button
            type="button"
            className="sidebarEdgeToggle"
            onClick={() => data.setNavCollapsed((current) => !current)}
            aria-label={data.navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {data.navCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </Tooltip>

        {navGroups.map((group) => (
          <section className="sideSection sidebarContent" key={group.label}>
            <div className="sectionLabel">{group.label}</div>
            <nav className="pageNav" aria-label={`${group.label} pages`}>
              {group.items.map((item) => (
                <Tooltip key={item.key} content={item.label} position="right" disabled={!data.navCollapsed}>
                  <button
                    type="button"
                    className={clsx(view === item.key && 'active')}
                    aria-current={view === item.key ? 'page' : undefined}
                    onClick={() => navigate(item.key)}
                  >
                    {item.icon}
                    <span><strong>{item.label}</strong><small>{item.hint}</small></span>
                  </button>
                </Tooltip>
              ))}
            </nav>
          </section>
        ))}
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">CJ Board</p>
            <h1>{pageTitles[view]}</h1>
          </div>
          <div className="toolbar">
            <label className="searchBox">
              <Search size={16} />
              <input value={data.query} onChange={(event) => data.setQuery(event.target.value)} placeholder="Search tasks, tags, notes" />
            </label>
            {data.area !== 'All' && ['today', 'tasks', 'planning', 'insights'].includes(view) && (
              <button type="button" className="scopeChip" onClick={() => data.setArea('All')} title="Clear area scope">
                <ListFilter size={13} /> {data.area} ×
              </button>
            )}
            <Dropdown droplist={newMenu} trigger="click" position="br">
              <Button type="primary" icon={<Plus size={16} />}>New <ChevronDown size={14} /></Button>
            </Dropdown>
            {view !== 'assistant' && (
              <Button icon={<Bot size={17} />} onClick={() => navigate('assistant')} title="Open assistant">Assistant</Button>
            )}
          </div>
        </header>

        {renderPage()}
      </section>

      {showDetail && (
        <TaskDetail
          selectedTask={data.selectedTask}
          updateTask={data.updateTask}
          addChecklistItem={data.addChecklistItem}
          collapsed={data.detailCollapsed}
          setCollapsed={data.setDetailCollapsed}
        />
      )}

      <Modal
        title="New task"
        visible={quickAddOpen}
        onOk={submitQuickAdd}
        onCancel={() => setQuickAddOpen(false)}
        okText="Add task"
        autoFocus={false}
        unmountOnExit
      >
        <form className="quickAdd quickAddModal" onSubmit={(event) => { event.preventDefault(); submitQuickAdd() }}>
          <label>
            <span>Title</span>
            <Input autoFocus value={data.draft.title} onChange={(value) => data.setDraft((current) => ({ ...current, title: value }))} placeholder="Task title" onPressEnter={submitQuickAdd} />
          </label>
          <div className="formGrid">
            <label>
              <span>Area</span>
              <Select value={data.draft.area} onChange={(value) => data.setDraft((current) => ({ ...current, area: String(value) }))}>
                {areas.slice(1).map((item) => <Select.Option key={item} value={item}>{item}</Select.Option>)}
              </Select>
            </label>
            <label>
              <span>Priority</span>
              <Select value={data.draft.priority} onChange={(value) => data.setDraft((current) => ({ ...current, priority: value as Priority }))}>
                <Select.Option value="high">High</Select.Option>
                <Select.Option value="medium">Medium</Select.Option>
                <Select.Option value="low">Low</Select.Option>
              </Select>
            </label>
          </div>
          <div className="formGrid">
            <label>
              <span>Start</span>
              <input type="date" value={data.draft.startDate} onChange={(event) => data.setDraft((current) => ({ ...current, startDate: event.target.value }))} />
            </label>
            <label>
              <span>Due</span>
              <input type="date" value={data.draft.dueDate} onChange={(event) => data.setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
          </div>
          <div className="formGrid">
            <label>
              <span>Reminder</span>
              <input type="datetime-local" value={data.draft.reminderAt} onChange={(event) => data.setDraft((current) => ({ ...current, reminderAt: event.target.value }))} />
            </label>
            <label>
              <span>Estimate (h)</span>
              <input type="number" min={0} step={0.5} value={data.draft.estimateHours} onChange={(event) => data.setDraft((current) => ({ ...current, estimateHours: Number(event.target.value) }))} />
            </label>
          </div>
          <ColorPicker
            compact
            value={data.draft.color}
            autoColor={areaColor(data.draft.area)}
            onChange={(color) => data.setDraft((current) => ({ ...current, color: color ?? '' }))}
          />
          <label className="quickTagInput">
            <Hash size={14} />
            <input value={data.draft.tags} onChange={(event) => data.setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="Custom tags, comma separated" />
          </label>
        </form>
      </Modal>

      <ImportWizard data={data} />
      {data.toast && <button type="button" className="toast" onClick={() => data.setToast(null)}>{data.toast}</button>}
    </main>
  )
}

export default App
