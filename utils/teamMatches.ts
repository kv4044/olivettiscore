import { bzzoiroService, type BzzoiroEvent } from '@/services/bzzoiro'

export type TeamMatchKind = 'completed' | 'upcoming'

export async function getTeamMatches(
  teamId: number,
  kind: TeamMatchKind
): Promise<BzzoiroEvent[]> {
  const events = await bzzoiroService.getEvents(
    {
      team_id: String(teamId),
      status: kind === 'completed' ? 'finished' : 'notstarted'
    },
    { fetchAll: true }
  )

  return events
    .filter((event) => (kind === 'completed' ? event.status === 'FT' : event.status === 'NS'))
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime()
      const timeB = new Date(b.date).getTime()
      return kind === 'completed' ? timeB - timeA : timeA - timeB
    })
}
