import { Button } from '@arco-design/web-react'
import { Bot, Send } from 'lucide-react'
import clsx from 'clsx'
import { chatModes } from '../constants'
import type { BoardData } from '../hooks/useBoardData'

export function AssistantPage({ data }: { data: BoardData }) {
  const { selectedTask } = data
  return (
    <section className="pageBody assistantPage">
      <div className="assistantPanel assistantPanelPage">
        <header className="assistantHeader">
          <div>
            <p className="eyebrow">Terminal API</p>
            <h2>Learning Assistant</h2>
            <span>Current task: {selectedTask ? `${selectedTask.area} / ${selectedTask.title}` : 'No task selected'}</span>
          </div>
        </header>

        <div className="modeTabs">
          {chatModes.map((mode) => (
            <button key={mode.id} type="button" className={clsx(mode.id === data.chatMode && 'active')} onClick={() => data.setChatMode(mode.id)}>
              {mode.icon}
              {mode.label}
            </button>
          ))}
        </div>

        <div className="quickPrompts">
          <button type="button" onClick={() => data.sendChat('Analyze the current task and give me the next execution steps.')}>Next steps</button>
          <button type="button" onClick={() => data.sendChat('Review the current plan for risks and priorities.')}>Risks</button>
          <button type="button" onClick={() => data.sendChat('Based on the current work, choose my top 3 tasks for today.')}>Top 3</button>
        </div>

        <div className="chatLog">
          {!data.chatMessages.length && (
            <div className="assistantEmpty">
              <Bot size={32} />
              <strong>Ask the learning agent.</strong>
              <p>The current task is sent to local <code>/api/chat</code>, which bridges to the Codex terminal agent.</p>
            </div>
          )}
          {data.chatMessages.map((message) => (
            <article key={message.id} className={clsx('chatBubble', message.role === 'user' && 'user')}>
              <span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
              <p>{message.content}</p>
            </article>
          ))}
        </div>

        <form className="chatComposer" onSubmit={(event) => { event.preventDefault(); data.sendChat() }}>
          <textarea value={data.chatInput} onChange={(event) => data.setChatInput(event.target.value)} placeholder="Ask about a task, code explanation, progress, SQL, algorithms, or learning strategy." />
          <Button htmlType="submit" type="primary" icon={<Send size={17} />} loading={data.chatBusy} disabled={!data.chatInput.trim()}>Send</Button>
        </form>
      </div>
    </section>
  )
}
