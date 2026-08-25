import { Progress } from '@arco-design/web-react'
import { processNodes } from '../constants'
import { getTaskProgress } from '../utils'
import type { Task } from '../types'

export function ProcessView({ tasks }: { tasks: Task[] }) {
  return (
    <section className="processPanel">
      {processNodes.map((node) => {
        const nodeTasks = tasks.filter((task) => task.tags.includes(node) || task.notes.includes(node))
        const progress = nodeTasks.length ? Math.round(nodeTasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / nodeTasks.length)
          : 0
        return (
          <article className="processNode" key={node}>
            <div className="nodeIndex">{processNodes.indexOf(node) + 1}</div>
            <div><h3>{node}</h3><p>{nodeTasks.length ? `${nodeTasks.length} linked items` : 'No linked items'}</p></div>
            <Progress percent={progress} size="small" />
          </article>
        )
      })}
    </section>
  )
}
