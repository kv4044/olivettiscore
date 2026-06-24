import { bzzoiroService, type BzzoiroEvent } from '@/services/bzzoiro'

type LeagueMatchKind = 'completed' | 'upcoming'

function toDateString(date: Date) {
  return date.toISOString().split('T')[0]
}

function fallbackDate(yearOffset: number) {
  const date = new Date()
  date.setFullYear(date.getFullYear() + yearOffset)
  return toDateString(date)
}

async function getSeasonRange(leagueId: number) {
  try {
    const seasonData = await bzzoiroService.getLeagueCurrentSeason(leagueId)
    const season = seasonData?.season || seasonData || {}

    return {
      start: season.start_date || season.start || fallbackDate(-1),
      end: season.end_date || season.end || fallbackDate(1)
    }
  } catch {
    return {
      start: fallbackDate(-1),
      end: fallbackDate(1)
    }
  }
}

export async function getLeagueMatches(
  leagueId: number,
  kind: LeagueMatchKind
): Promise<BzzoiroEvent[]> {
  const today = toDateString(new Date())
  const seasonRange = await getSeasonRange(leagueId)
  const futureEnd = seasonRange.end >= today ? seasonRange.end : fallbackDate(1)

  const events = await bzzoiroService.getEvents(
    kind === 'completed'
      ? {
          league_id: String(leagueId),
          date_from: seasonRange.start,
          date_to: today,
          status: 'finished'
        }
      : {
          league_id: String(leagueId),
          date_from: today,
          date_to: futureEnd,
          status: 'notstarted'
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

export async function getLeagueSeasonMatches(leagueId: number): Promise<BzzoiroEvent[]> {
  const seasonRange = await getSeasonRange(leagueId)

  const events = await bzzoiroService.getEvents(
    {
      league_id: String(leagueId),
      date_from: seasonRange.start,
      date_to: seasonRange.end,
      limit: '200'
    },
    { fetchAll: true }
  )

  return events.sort((a, b) => {
    const roundA = a.round_number ?? Number.MAX_SAFE_INTEGER
    const roundB = b.round_number ?? Number.MAX_SAFE_INTEGER
    if (roundA !== roundB) return roundA - roundB

    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
}
