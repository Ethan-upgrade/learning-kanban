import { useState, type ReactNode } from 'react'
import { Button, Select, Tag } from '@arco-design/web-react'
import {
  Bell,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Download,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'
import type { AppSettings, SettingsSectionKey, StartupStatus, ViewKey } from '../types'
import { settingsSectionKeys } from '../constants'

export function SettingsPanel({
  variant = 'overlay',
  section: controlledSection,
  onSectionChange,
  auditContent,
  onClose,
  requestNotifications,
  exportData,
  importData,
  openImportWizard,
  resetDemo,
  serverBacked,
  notesServerBacked,
  projectsServerBacked,
  baseServerBacked,
  settings,
  updateSetting,
  notificationPermission,
  startupStatus,
  toggleStartup,
}: {
  variant?: 'overlay' | 'page'
  section?: SettingsSectionKey
  onSectionChange?: (section: SettingsSectionKey) => void
  auditContent?: ReactNode
  onClose?: () => void
  requestNotifications: () => void
  exportData: () => void
  importData: (file?: File) => void
  openImportWizard?: () => void
  resetDemo: () => void
  serverBacked: boolean
  notesServerBacked: boolean
  projectsServerBacked: boolean
  baseServerBacked: boolean
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  notificationPermission: NotificationPermission | 'unsupported'
  startupStatus: StartupStatus
  toggleStartup: (enabled: boolean) => void
}) {
  const [localSection, setLocalSection] = useState<SettingsSectionKey>(() => {
    const requested = new URLSearchParams(window.location.search).get('settingsSection') as SettingsSectionKey | null
    return requested && settingsSectionKeys.includes(requested) ? requested : 'general'
  })
  const section = controlledSection ?? localSection
  const setSection = (next: SettingsSectionKey) => {
    setLocalSection(next)
    onSectionChange?.(next)
  }
  const notificationLabel =
    notificationPermission === 'unsupported' ? 'Unsupported'
      : notificationPermission === 'granted' ? 'Allowed'
        : notificationPermission === 'denied' ? 'Blocked'
          : 'Not enabled'
  const notificationColor =
    notificationPermission === 'granted' && settings.notificationsEnabled ? 'green'
      : notificationPermission === 'denied' ? 'red'
        : 'orange'
  const startupEnabled = startupStatus.enabled
  const sections: { id: SettingsSectionKey; label: string; icon: ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings size={15} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
    { id: 'startup', label: 'Startup', icon: <Zap size={15} /> },
    { id: 'data', label: 'Data', icon: <Download size={15} /> },
    { id: 'appearance', label: 'Appearance', icon: <SlidersHorizontal size={15} /> },
    ...(auditContent ? [{ id: 'audit' as const, label: 'Audit', icon: <CheckCircle2 size={15} /> }] : []),
    { id: 'guide', label: 'Guide', icon: <CircleHelp size={15} /> },
    { id: 'about', label: 'About', icon: <BookOpen size={15} /> },
  ]

  const isPage = variant === 'page'
  const panel = (
      <aside className={clsx('settingsPanel', isPage && 'page')}>
        <header className="settingsHeader">
          <div>
            <p className="eyebrow">CJ Board</p>
            <h2>Settings</h2>
          </div>
          {!isPage && onClose && (
            <button type="button" className="iconButton" onClick={onClose} title="Close settings" aria-label="Close settings">
              <X size={17} />
            </button>
          )}
        </header>

        <div className="settingsBody">
          <nav className="settingsNav" aria-label="Settings sections">
            {sections.map((item) => (
              <button
                type="button"
                key={item.id}
                className={clsx(section === item.id && 'active')}
                onClick={() => setSection(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="settingsContent">
            {section === 'general' && (
              <section className="settingsSection">
                <h3>General</h3>
                <div className="settingsStatus">
                  <Tag color={serverBacked ? 'green' : 'orange'}>Tasks {serverBacked ? 'Synced' : 'Local'}</Tag>
                  <Tag color={notesServerBacked ? 'green' : 'orange'}>Notes {notesServerBacked ? 'Synced' : 'Local'}</Tag>
                  <Tag color={projectsServerBacked ? 'green' : 'orange'}>Projects {projectsServerBacked ? 'Synced' : 'Local'}</Tag>
                  <Tag color={baseServerBacked ? 'green' : 'orange'}>Base {baseServerBacked ? 'Synced' : 'Local'}</Tag>
                  <Tag color="blue">CJ Board 0.1.0</Tag>
                </div>
                <label className="settingsField">
                  <span>Default landing view</span>
                  <Select value={settings.defaultView} onChange={(value) => updateSetting('defaultView', value as ViewKey)}>
                    <Select.Option value="today">Today</Select.Option>
                    <Select.Option value="tasks">Tasks</Select.Option>
                    <Select.Option value="planning">Planning</Select.Option>
                    <Select.Option value="insights">Insights</Select.Option>
                    <Select.Option value="projects">Projects</Select.Option>
                    <Select.Option value="base">Base</Select.Option>
                    <Select.Option value="knowledge">Knowledge</Select.Option>
                    <Select.Option value="automations">Automations</Select.Option>
                    <Select.Option value="assistant">Assistant</Select.Option>
                  </Select>
                </label>
                <label className="settingsField">
                  <span>Week starts on</span>
                  <Select value={settings.weekStartsOn} onChange={(value) => updateSetting('weekStartsOn', value as AppSettings['weekStartsOn'])}>
                    <Select.Option value="Monday">Monday</Select.Option>
                    <Select.Option value="Sunday">Sunday</Select.Option>
                  </Select>
                </label>
                <SettingToggle
                  title="Confirm destructive actions"
                  description="Ask before resetting demo data, deleting notes, deleting automations, or clearing logs."
                  checked={settings.confirmDestructiveActions}
                  onChange={(checked) => updateSetting('confirmDestructiveActions', checked)}
                />
              </section>
            )}

            {section === 'notifications' && (
              <section className="settingsSection">
                <h3>Notifications & Reminders</h3>
                <div className="settingsStatus">
                  <Tag color={notificationColor}>Permission: {notificationLabel}</Tag>
                  <Tag color={settings.notificationsEnabled ? 'green' : 'gray'}>{settings.notificationsEnabled ? 'App alerts on' : 'App alerts off'}</Tag>
                </div>
                <SettingToggle
                  title="Desktop notifications"
                  description="Allow CJ Board reminders and automation alerts to show operating-system notifications."
                  checked={settings.notificationsEnabled}
                  onChange={(checked) => checked ? requestNotifications() : updateSetting('notificationsEnabled', false)}
                />
                <SettingToggle
                  title="Reminder checking"
                  description="Check task reminder times while CJ Board is running and mark fired reminders."
                  checked={settings.reminderChecksEnabled}
                  onChange={(checked) => updateSetting('reminderChecksEnabled', checked)}
                />
                <SettingToggle
                  title="Automation notifications"
                  description="Allow automation rules with the notify action to create desktop notifications."
                  checked={settings.automationNotificationsEnabled}
                  onChange={(checked) => updateSetting('automationNotificationsEnabled', checked)}
                />
                <div className="usageDoc">
                  <p><strong>Permission note: </strong>If Windows or WebView blocks notifications, turn them back on in system notification settings, then enable this switch again.</p>
                </div>
              </section>
            )}

            {section === 'startup' && (
              <section className="settingsSection">
                <h3>Startup</h3>
                <div className="settingsStatus">
                  <Tag color={startupEnabled ? 'green' : 'gray'}>{startupEnabled ? 'Enabled' : 'Disabled'}</Tag>
                  <Tag color={startupStatus.supported ? 'blue' : 'orange'}>{startupStatus.supported ? 'Windows Startup folder' : 'Not available'}</Tag>
                </div>
                <SettingToggle
                  title="Launch CJ Board at sign-in"
                  description="Create or remove the Windows Startup shortcut. This is off by default."
                  checked={startupEnabled}
                  disabled={!startupStatus.supported}
                  onChange={toggleStartup}
                />
                <div className="usageDoc">
                  <p><strong>Current shortcut: </strong>{startupStatus.path || 'No startup shortcut path available.'}</p>
                  {startupStatus.error && <p><strong>Status error: </strong>{startupStatus.error}</p>}
                  <p><strong>Desktop shortcut: </strong>The desktop icon is independent from startup and stays available even when startup is disabled.</p>
                </div>
              </section>
            )}

            {section === 'data' && (
              <section className="settingsSection">
                <h3>Data</h3>
                <div className="settingsActions">
                  <Button icon={<Download size={16} />} onClick={exportData} title="Export task JSON">Export Tasks</Button>
                  {openImportWizard && (
                    <Button type="primary" icon={<Upload size={16} />} onClick={openImportWizard} title="Import Excel / CSV / JSON with column mapping">
                      Import schedule (Excel / CSV / JSON)
                    </Button>
                  )}
                  <label className="settingsFileButton" title="Restore a full CJ Board task backup (replaces all tasks)">
                    <Upload size={16} />
                    <span>Restore backup JSON</span>
                    <input type="file" accept="application/json" onChange={(event) => importData(event.target.files?.[0])} />
                  </label>
                  <Button status="warning" icon={<RotateCcw size={16} />} onClick={resetDemo} title="Restore sample tasks">Reset Demo</Button>
                </div>
                <div className="usageDoc">
                  <p><strong>Task storage: </strong><code>D:\agent-projects\learning-kanban\data\tasks.json</code></p>
                  <p><strong>Project storage: </strong><code>D:\agent-projects\learning-kanban\data\projects.json</code></p>
                  <p><strong>Base storage: </strong><code>D:\agent-projects\learning-kanban\data\base-records.json</code></p>
                  <p><strong>Note storage: </strong><code>D:\agent-projects\learning-kanban\data\notes.json</code></p>
                  <p><strong>Chat storage: </strong><code>D:\agent-projects\learning-kanban\data\chat.json</code></p>
                  <p>Use export before large changes, imports, or template resets.</p>
                </div>
              </section>
            )}

            {section === 'appearance' && (
              <section className="settingsSection">
                <h3>Appearance</h3>
                <label className="settingsField">
                  <span>Interface density</span>
                  <Select value={settings.interfaceDensity} onChange={(value) => updateSetting('interfaceDensity', value as AppSettings['interfaceDensity'])}>
                    <Select.Option value="comfortable">Comfortable</Select.Option>
                    <Select.Option value="compact">Compact</Select.Option>
                  </Select>
                </label>
                <div className="usageDoc">
                  <p><strong>Tooltips: </strong>Hover over icon buttons and compact controls. Settings, Assistant, New Note, import, export, reminder, automation, and panel controls use title tooltips.</p>
                  <p><strong>Progress bars: </strong>Task progress is automatic. It is derived from checklist completion, task status, and the Done stage, so it is not draggable.</p>
                </div>
              </section>
            )}

            {section === 'audit' && auditContent && (
              <section className="settingsSection settingsAudit">
                {auditContent}
              </section>
            )}

            {section === 'guide' && (
              <section className="settingsSection">
                <h3>User Guide</h3>
                <div className="usageDoc guideGrid">
                  <article className="guideModule"><span>Entry</span><strong>Today</strong><p>Home page for today's focus, overdue and due-soon work, and key progress metrics.</p></article>
                  <article className="guideModule"><span>Create</span><strong>+ New</strong><p>Use the top-bar New menu to add a task, note, project, or Base record. Tasks open a quick-add dialog with area, priority, dates, estimate, reminder, and tags.</p></article>
                  <article className="guideModule"><span>Tasks</span><strong>Board / Table / Process</strong><p>Switch views with the sub-navigation. Open Filters to scope by area, stage, priority, and tags. Clicking a task opens the detail panel.</p></article>
                  <article className="guideModule"><span>Plan</span><strong>Planning</strong><p>Read the timeline of scheduled tasks and apply plan templates from the template center.</p></article>
                  <article className="guideModule"><span>Analyze</span><strong>Insights</strong><p>Overview KPIs, progress trends, and priority/risk distribution split into three sections.</p></article>
                  <article className="guideModule"><span>Portfolio</span><strong>Projects</strong><p>Create general projects, assign owner and stage, link tasks, then read progress and risk from the linked task set.</p></article>
                  <article className="guideModule"><span>Database</span><strong>Base</strong><p>Manage structured records like applications, vendors, reading lists, or inventories with Grid, Kanban, Timeline, Gallery, and Stats views.</p></article>
                  <article className="guideModule"><span>Knowledge</span><strong>Notes</strong><p>Write Markdown notes, tag and pin important content, connect pages with [[Note Title]], and inspect backlinks or graph links.</p></article>
                  <article className="guideModule"><span>Rules</span><strong>Automation Center</strong><p>Create rules from templates or with trigger, condition, and action. Search, pause, run, delete, and audit rule activity.</p></article>
                  <article className="guideModule"><span>Quality</span><strong>Audit</strong><p>Under Settings → Audit: check sync state, reminders, notifications, Base records, knowledge links, automations, and startup policy.</p></article>
                  <article className="guideModule"><span>Help</span><strong>Assistant</strong><p>Open the terminal-backed learning agent from the app and ask for planning, code explanation, quiz practice, or review help.</p></article>
                  <article className="guideModule"><span>System</span><strong>Settings</strong><p>Control notifications, reminder checks, startup, data export/import, appearance density, default view, and this guide.</p></article>
                  <article className="guideModule"><span>Recovery</span><strong>Data</strong><p>Local data lives under <code>D:\agent-projects\learning-kanban\data</code>. Export task JSON before large imports or resets.</p></article>
                </div>
              </section>
            )}

            {section === 'about' && (
              <section className="settingsSection">
                <h3>About CJ Board</h3>
                <div className="usageDoc">
                  <p><strong>Product role: </strong>CJ Board is a local-first planning, learning, knowledge, automation, and assistant workspace.</p>
                  <p><strong>Desktop shell: </strong>Tauri opens CJ Board as an independent desktop window and starts the local service hidden in the background.</p>
                  <p><strong>Project root: </strong><code>D:\agent-projects\learning-kanban</code></p>
                  <p><strong>Executable: </strong><code>D:\agent-projects\learning-kanban\src-tauri\target\release\cj-board.exe</code></p>
                  <p><strong>Privacy: </strong>Core tasks and notes stay on this computer unless you export or connect an external assistant command.</p>
                </div>
              </section>
            )}
          </div>
        </div>
      </aside>
  )
  return isPage ? panel : <section className="settingsOverlay">{panel}</section>
}

function SettingToggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className={clsx('settingToggle', disabled && 'disabled')}>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <button
        type="button"
        className={clsx('settingsSwitch', checked && 'active')}
        aria-pressed={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  )
}
