import { CalendarClock, Clock3, Flame, Target } from 'lucide-react'
import { Metric } from '../components/common'
import { OverviewView } from '../components/OverviewView'
import type { BoardData } from '../hooks/useBoardData'

export function TodayPage({ data }: { data: BoardData }) {
  return (
    <section className="pageBody">
      <section className="metricGrid">
        <Metric icon={<Target size={18} />} label="Completion" value={`${data.completion}%`} />
        <Metric icon={<Flame size={18} />} label="Overdue" value={`${data.overdueCount}`} />
        <Metric icon={<CalendarClock size={18} />} label="Due in 3d" value={`${data.dueSoonCount}`} />
        <Metric icon={<Clock3 size={18} />} label="Open hours" value={`${data.activeHours}h`} />
      </section>
      <OverviewView
        tasks={data.filteredTasks}
        totalTasks={data.tasks.length}
        completion={data.completion}
        overdueCount={data.overdueCount}
        dueSoonCount={data.dueSoonCount}
        weightedProgress={data.weightedProgress}
        setSelectedId={data.openTaskDetail}
      />
    </section>
  )
}
