import { createClient } from '@/lib/supabase/server'
import { buildWeekInReviewData } from '@/lib/utils/week-in-review'
import WeekInReviewPanel from './WeekInReviewPanel'
import type { Session } from '@/types'

interface Member {
  user_id: string
  display_name: string | null
  points: number
}

interface Props {
  groupId: string
  currentUserId: string
  members: Member[]
}

export default async function WeekInReview({ groupId, currentUserId, members }: Props) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: allSessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('group_id', groupId)
    .order('scheduled_date', { ascending: true })

  if (!allSessions?.length) return null

  const data = buildWeekInReviewData(
    allSessions as Session[],
    currentUserId,
    members,
    today
  )

  if (!data) return null

  return (
    <WeekInReviewPanel
      weekNumber={data.weekNumber}
      dateRange={data.dateRange}
      teaser={data.teaser}
      myStats={data.myStats}
      priorStats={data.priorStats}
      memberStats={data.memberStats}
      currentUserId={currentUserId}
      upcomingSessions={data.upcomingSessions}
    />
  )
}
