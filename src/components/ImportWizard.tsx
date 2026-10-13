// Schedule import wizard: file / paste -> column mapping -> preview -> import.
// Also hosts the editable import spec ("data口径") editor.
import { useMemo, useState } from 'react'
import { Button, Input, Modal, Radio, Select, Switch, Tabs } from '@arco-design/web-react'
import { Download, FileUp, RotateCcw, Save } from 'lucide-react'
import type { BoardData } from '../hooks/useBoardData'
import { parseImportFile, parsePastedText, type RawTable } from '../importing/parsers'
import { autoMapColumns, buildImportPreview, missingRequired, type ColumnMapping } from '../importing/normalize'
import { defaultImportSpec, loadImportSpec, sanitizeImportSpec, saveImportSpec, type ImportFieldKey, type ImportSpec } from '../importing/spec'
import { downloadBlob, downloadTemplate } from '../importing/templates'

const ACCEPT = '.xlsx,.csv,.tsv,.txt,.json,.ndjson'

export function ImportWizard({ data }: { data: BoardData }) {
  const { importOpen, setImportOpen, importTasks, tasks } = data
  const [spec, setSpec] = useState<ImportSpec>(loadImportSpec)
  const [tables, setTables] = useState<RawTable[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [sourceName, setSourceName] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [tab, setTab] = useState('import')
  const [specText, setSpecText] = useState(() => JSON.stringify(loadImportSpec(), null, 2))
  const [specErrors, setSpecErrors] = useState<string[]>([])

  const table = tables[sheetIndex]

  const loadTables = (next: RawTable[], name: string) => {
    if (!next.length || !next[0].rows.length) {
      setError('No data rows found.')
      setTables([])
      return
    }
    setError(null)
    setTables(next)
    setSheetIndex(0)
    setSourceName(name)
    setMapping(autoMapColumns(next[0].headers, spec))
  }

  const onFile = async (file?: File) => {
    if (!file) return
    try {
      const parsed = await parseImportFile(file)
      loadTables(parsed.tables, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const onPaste = () => {
    try {
      loadTables([parsePastedText(pasteText)], 'Pasted text')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const pickSheet = (index: number) => {
    setSheetIndex(index)
    setMapping(autoMapColumns(tables[index].headers, spec))
  }

  const missing = useMemo(() => missingRequired(mapping, spec), [mapping, spec])
  const preview = useMemo(() => {
    if (!table || missing.length) return null
    return buildImportPreview(table, { spec, mapping, existing: mode === 'append' ? tasks : [], skipDuplicates })
  }, [table, mapping, spec, missing.length, mode, tasks, skipDuplicates])

  const reset = () => {
    setTables([])
    setMapping({})
    setSourceName('')
    setPasteText('')
    setError(null)
  }

  const close = () => {
    setImportOpen(false)
    reset()
  }

  const confirm = () => {
    if (!preview?.tasks.length) return
    importTasks(preview.tasks, mode)
    close()
  }

  const saveSpec = () => {
    try {
      const { spec: next, errors } = sanitizeImportSpec(JSON.parse(specText))
      setSpecErrors(errors)
      setSpec(next)
      saveImportSpec(next)
      setSpecText(JSON.stringify(next, null, 2))
      if (table) setMapping(autoMapColumns(table.headers, next))
    } catch (err) {
      setSpecErrors([`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`])
    }
  }

  const resetSpec = () => {
    saveImportSpec(null)
    setSpec(defaultImportSpec)
    setSpecText(JSON.stringify(defaultImportSpec, null, 2))
    setSpecErrors([])
  }

  const fieldOptions = [
    { label: '— ignore (append to notes) —', value: '' },
    ...spec.fields.map((field) => ({ label: `${field.label}${field.required ? ' *' : ''} (${field.key})`, value: field.key })),
  ]
  const errorCount = preview?.issues.filter((issue) => issue.level === 'error').length ?? 0
  const warningCount = preview?.issues.filter((issue) => issue.level === 'warning').length ?? 0

  return (
    <Modal
      title="Import schedule"
      visible={importOpen}
      onCancel={close}
      style={{ width: 'min(960px, 96vw)' }}
      footer={tab === 'import' ? (
        <div className="importFooter">
          <span>{preview ? `${preview.tasks.length} ready · ${preview.skipped} skipped · ${preview.duplicates} duplicates` : 'Load a file to preview'}</span>
          <Button onClick={close}>Cancel</Button>
          <Button type="primary" disabled={!preview?.tasks.length} onClick={confirm}>
            Import {preview?.tasks.length || ''} tasks
          </Button>
        </div>
      ) : null}
    >
      <Tabs activeTab={tab} onChange={setTab}>
        <Tabs.TabPane key="import" title="Import">
          <div className="importWizard">
            <section className="importStep">
              <h4>1. Source</h4>
              <div className="importSourceRow">
                <label className="settingsFileButton">
                  <FileUp size={15} /> Choose file (xlsx / csv / tsv / json)
                  <input type="file" accept={ACCEPT} onChange={(event) => { void onFile(event.target.files?.[0]); event.target.value = '' }} />
                </label>
                <span className="importTemplates">
                  Templates:
                  <Button size="mini" icon={<Download size={13} />} onClick={() => downloadTemplate('xlsx', spec)}>Excel</Button>
                  <Button size="mini" icon={<Download size={13} />} onClick={() => downloadTemplate('csv', spec)}>CSV</Button>
                  <Button size="mini" icon={<Download size={13} />} onClick={() => downloadTemplate('json', spec)}>JSON</Button>
                </span>
              </div>
              <Input.TextArea
                placeholder="…or paste rows copied from Excel / Google Sheets, CSV text or JSON"
                value={pasteText}
                onChange={setPasteText}
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
              <div className="importSourceRow">
                <Button size="small" disabled={!pasteText.trim()} onClick={onPaste}>Parse pasted text</Button>
                {sourceName && <span className="importMeta">Loaded: <b>{sourceName}</b> · {table?.rows.length ?? 0} rows · {table?.format}</span>}
                {sourceName && <Button size="mini" onClick={reset}>Clear</Button>}
              </div>
              {error && <p className="importError">{error}</p>}
            </section>

            {table && (
              <section className="importStep">
                <h4>2. Column mapping</h4>
                {tables.length > 1 && (
                  <Select
                    size="small"
                    style={{ width: 240, marginBottom: 8 }}
                    value={sheetIndex}
                    onChange={pickSheet}
                    options={tables.map((item, index) => ({ label: `Sheet: ${item.sheetName || index + 1} (${item.rows.length})`, value: index }))}
                  />
                )}
                <div className="importMapping">
                  {table.headers.map((header) => (
                    <label key={header}>
                      <span title={header}>{header}</span>
                      <Select
                        size="small"
                        value={mapping[header] || ''}
                        options={fieldOptions}
                        onChange={(value: string) => setMapping((current) => {
                          const next = { ...current }
                          // keep each target field unique
                          if (value) for (const key of Object.keys(next)) if (next[key] === value) next[key] = null
                          next[header] = (value || null) as ImportFieldKey | null
                          return next
                        })}
                      />
                    </label>
                  ))}
                </div>
                {missing.length > 0 && <p className="importError">Required column not mapped: {missing.map((field) => field.label).join(', ')}</p>}
              </section>
            )}

            {preview && (
              <section className="importStep">
                <h4>3. Preview &amp; options</h4>
                <div className="importSourceRow">
                  <Radio.Group type="button" size="small" value={mode} onChange={setMode}>
                    <Radio value="append">Append</Radio>
                    <Radio value="replace">Replace all</Radio>
                  </Radio.Group>
                  <label className="importToggle">
                    <Switch size="small" checked={skipDuplicates} onChange={setSkipDuplicates} /> Skip duplicates (title + due date)
                  </label>
                  <span className="importMeta">{errorCount} errors · {warningCount} warnings</span>
                </div>
                <div className="importPreviewTable">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Title</th><th>Area</th><th>Status</th><th>Priority</th><th>Start</th><th>Due</th><th>Hours</th><th>Tags</th></tr>
                    </thead>
                    <tbody>
                      {preview.tasks.slice(0, 50).map((task, index) => (
                        <tr key={task.id}>
                          <td>{preview.sourceRows[index]}</td>
                          <td>{task.title}</td>
                          <td>{task.area}</td>
                          <td>{task.status}</td>
                          <td>{task.priority}</td>
                          <td>{task.startDate}</td>
                          <td>{task.dueDate}</td>
                          <td>{task.estimateHours}</td>
                          <td>{task.tags.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.tasks.length > 50 && <p className="importMeta">…and {preview.tasks.length - 50} more</p>}
                </div>
                {preview.issues.length > 0 && (
                  <ul className="importIssues">
                    {preview.issues.slice(0, 30).map((issue, index) => (
                      <li key={index} className={issue.level}>Row {issue.row}{issue.field ? ` · ${issue.field}` : ''}: {issue.message}</li>
                    ))}
                    {preview.issues.length > 30 && <li>…{preview.issues.length - 30} more</li>}
                  </ul>
                )}
              </section>
            )}
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="spec" title="Data spec (editable)">
          <div className="importWizard">
            <p className="importMeta">
              The spec defines target fields, header aliases, value maps (status / priority / area), date order and defaults.
              Edits are saved locally and applied to every import. Missing parts fall back to the built-in defaults.
            </p>
            <Input.TextArea className="importSpecEditor" value={specText} onChange={setSpecText} autoSize={{ minRows: 16, maxRows: 28 }} />
            {specErrors.length > 0 && <ul className="importIssues">{specErrors.map((item) => <li key={item} className="warning">{item}</li>)}</ul>}
            <div className="importSourceRow">
              <Button type="primary" size="small" icon={<Save size={14} />} onClick={saveSpec}>Validate &amp; save</Button>
              <Button size="small" icon={<RotateCcw size={14} />} onClick={resetSpec}>Restore default</Button>
              <Button size="small" icon={<Download size={14} />} onClick={() => downloadBlob(JSON.stringify(spec, null, 2), 'cjboard-import-spec.json', 'application/json')}>Export spec</Button>
              <label className="settingsFileButton">
                <FileUp size={14} /> Load spec file
                <input type="file" accept=".json" onChange={async (event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) setSpecText(await file.text())
                }} />
              </label>
            </div>
          </div>
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  )
}
