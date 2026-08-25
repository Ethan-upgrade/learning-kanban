import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { Button, Empty, Tag } from '@arco-design/web-react'
import { FileText, Link2, Pin, Plus, Search } from 'lucide-react'
import clsx from 'clsx'
import { buildKnowledgeGraph } from './chartBuilders'
import { parseWikiLinks, renderMarkdown } from './markdown'
import { PanelTitle } from './common'
import type { Note, Task } from '../types'

export function KnowledgeView({
  notes,
  tasks,
  filteredNotes,
  selectedNote,
  noteQuery,
  setNoteQuery,
  setSelectedNoteId,
  updateNote,
  addNote,
  deleteNote,
}: {
  notes: Note[]
  tasks: Task[]
  filteredNotes: Note[]
  selectedNote: Note | null
  noteQuery: string
  setNoteQuery: (query: string) => void
  setSelectedNoteId: (id: string) => void
  updateNote: (noteId: string, patch: Partial<Note>) => void
  addNote: () => void
  deleteNote: (noteId: string) => void
}) {
  const backlinks = selectedNote ? notes.filter((note) =>
        parseWikiLinks(note.content).some((link) => link === selectedNote.title),
      )
    : []
  const outgoing = selectedNote ? parseWikiLinks(selectedNote.content) : []
  const graphOption = useMemo(() => buildKnowledgeGraph(notes, selectedNote?.id), [notes, selectedNote?.id])

  return (
    <section className="knowledgePanel">
      <aside className="noteListPanel">
        <div className="knowledgeToolbar">
          <label className="knowledgeSearch">
            <Search size={15} />
            <input
              value={noteQuery}
              onChange={(event) => setNoteQuery(event.target.value)}
              placeholder="Search notes, tags, or content"
            />
          </label>
          <Button type="primary" icon={<Plus size={15} />} onClick={addNote}>New</Button>
        </div>
        <div className="noteList">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              type="button"
              className={clsx(selectedNote?.id === note.id && 'active')}
              onClick={() => setSelectedNoteId(note.id)}
            >
              <div>
                <strong>{note.title}</strong>
                <span>{note.tags.join(' / ') || 'No tags'}</span>
              </div>
              {note.pinned && <Pin size={14} />}
            </button>
          ))}
          {!filteredNotes.length && <Empty description="No notes" />}
        </div>
      </aside>

      {selectedNote ? (
        <>
          <section className="noteEditorPanel">
            <div className="noteMetaBar">
              <input
                className="noteTitleInput"
                value={selectedNote.title}
                onChange={(event) =>
                  updateNote(selectedNote.id, { title: event.target.value })
                }
              />
              <div className="noteActions">
                <Button
                  icon={<Pin size={15} />}
                  onClick={() =>
                    updateNote(selectedNote.id, { pinned: !selectedNote.pinned })
                  }
                >
                  {selectedNote.pinned ? 'Pinned' : 'Pin'}
                </Button>
                <Button status="danger" onClick={() => deleteNote(selectedNote.id)}>
                  Delete
                </Button>
              </div>
            </div>
            <input
              className="noteTagsInput"
              value={selectedNote.tags.join(', ')}
              onChange={(event) =>
                updateNote(selectedNote.id, {
                  tags: event.target.value
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Tags, separated by commas"
            />
            <div className="noteWorkArea">
              <textarea
                value={selectedNote.content}
                onChange={(event) =>
                  updateNote(selectedNote.id, { content: event.target.value })
                }
                placeholder="Write Markdown. Use [[Note Title]] to link notes."
              />
              <article className="markdownPreview">
                {renderMarkdown(selectedNote.content)}
              </article>
            </div>
          </section>

          <aside className="knowledgeSidePanel">
            <section className="managementPanel compactKnowledgePanel">
              <PanelTitle title="Bidirectional links" subtitle="Obsidian-style note links" />
              <div className="linkSection">
                <strong><Link2 size={14} /> Outgoing</strong>
                {outgoing.map((link) => (
                  <button
                    type="button"
                    key={link}
                    onClick={() => {
                      const target = notes.find((note) => note.title === link)
                      if (target) setSelectedNoteId(target.id)
                    }}
                  >
                    [[{link}]]
                  </button>
                ))}
                {!outgoing.length && <span>No outgoing links</span>}
              </div>
              <div className="linkSection">
                <strong><Link2 size={14} /> Backlinks</strong>
                {backlinks.map((note) => (
                  <button
                    type="button"
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                  >
                    {note.title}
                  </button>
                ))}
                {!backlinks.length && <span>No backlinks</span>}
              </div>
            </section>

            <section className="managementPanel compactKnowledgePanel">
              <PanelTitle title="Linked tasks" subtitle="Connect notes to execution" />
              <select
                multiple
                value={selectedNote.linkedTaskIds}
                onChange={(event) =>
                  updateNote(selectedNote.id, {
                    linkedTaskIds: Array.from(event.target.selectedOptions).map(
                      (option) => option.value,
                    ),
                  })
                }
              >
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              <div className="linkedTaskList">
                {selectedNote.linkedTaskIds.map((taskId) => {
                  const task = tasks.find((item) => item.id === taskId)
                  return task ? <Tag key={taskId}>{task.title}</Tag> : null
                })}
              </div>
            </section>

            <section className="managementPanel compactKnowledgePanel graphPanel">
              <PanelTitle title="Knowledge Graph" subtitle="Note network" />
              <ReactECharts option={graphOption} style={{ height: 240 }} />
            </section>
          </aside>
        </>
      ) : (
        <div className="emptyKnowledge">
          <FileText size={34} />
          <p>No note selected. Start building your knowledge base.</p>
          <Button type="primary" onClick={addNote}>New Note</Button>
        </div>
      )}
    </section>
  )
}
