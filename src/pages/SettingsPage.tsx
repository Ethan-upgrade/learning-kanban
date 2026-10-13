import { AuditView } from '../components/AuditView'
import { SettingsPanel } from '../components/SettingsPanel'
import type { SettingsSectionKey, ViewKey } from '../types'
import type { BoardData } from '../hooks/useBoardData'

export function SettingsPage({ data, section, onSectionChange, onNavigate }: {
  data: BoardData
  section: SettingsSectionKey
  onSectionChange: (section: SettingsSectionKey) => void
  onNavigate: (view: ViewKey) => void
}) {
  return (
    <section className="pageBody settingsPage">
      <SettingsPanel
        variant="page"
        section={section}
        onSectionChange={onSectionChange}
        auditContent={(
          <AuditView
            tasks={data.tasks}
            notes={data.notes}
            projects={data.projects}
            baseRecords={data.baseRecords}
            automations={data.automations}
            logs={data.automationLogs}
            settings={data.appSettings}
            startupStatus={data.startupStatus}
            notificationPermission={data.notificationPermission}
            syncStatus={{
              tasks: data.serverBacked,
              notes: data.notesServerBacked,
              projects: data.projectsServerBacked,
              base: data.baseServerBacked,
            }}
            onNavigate={onNavigate}
            onOpenSettings={() => onSectionChange('general')}
            onRequestNotifications={data.requestNotifications}
          />
        )}
        requestNotifications={data.requestNotifications}
        exportData={data.exportData}
        importData={data.importData}
        openImportWizard={() => data.setImportOpen(true)}
        resetDemo={data.resetDemo}
        serverBacked={data.serverBacked}
        notesServerBacked={data.notesServerBacked}
        projectsServerBacked={data.projectsServerBacked}
        baseServerBacked={data.baseServerBacked}
        settings={data.appSettings}
        updateSetting={data.updateSetting}
        notificationPermission={data.notificationPermission}
        startupStatus={data.startupStatus}
        toggleStartup={data.toggleStartup}
      />
    </section>
  )
}
