import { createClient } from '@/utils/supabase/server'

export interface LeagueResult {
  id: number
  name: string
  country?: string
  logo_url?: string
}

export interface TeamResult {
  id: number
  name: string
  short_name?: string
  logo_url?: string
}

export interface PlayerResult {
  id: string
  email: string
  name?: string
  points: number
  rank: number
}

export interface FootballPlayerResult {
  id: number
  name: string
  position: string
  team_name: string
  team_logo?: string | null
  goals: number
  assists: number
  passes: number
  yellow_cards: number
  red_cards: number
}

export interface SearchResults {
  leagues: LeagueResult[]
  teams: TeamResult[]
  players: PlayerResult[]
  footballPlayers: FootballPlayerResult[]
}

const EMPTY_RESULTS: SearchResults = {
  leagues: [],
  teams: [],
  players: [],
  footballPlayers: [],
}

const LEAGUE_ALIASES: { keywords: string[]; id: number }[] = [
  { keywords: ['portuguesa', 'portugues', 'portugal', 'betclic', 'primeira liga'], id: 2 },
  { keywords: ['espanhola', 'espanhol', 'espanha', 'la liga', 'laliga', 'santander'], id: 3 },
  { keywords: ['inglesa', 'ingles', 'inglaterra', 'premier'], id: 1 },
  { keywords: ['italiana', 'italiano', 'italia', 'itália', 'serie a', 'calcio'], id: 4 },
  { keywords: ['alema', 'alemã', 'alemao', 'alemão', 'alemanha', 'bundesliga'], id: 5 },
  { keywords: ['francesa', 'frances', 'frança', 'ligue 1', 'ligue1'], id: 6 },
  { keywords: ['holandesa', 'holandes', 'holanda', 'eredivisie'], id: 10 },
  { keywords: ['brasileira', 'brasileiro', 'brasil', 'brasileirao', 'brasileirão'], id: 9 },
  { keywords: ['champions', 'champions league', 'liga dos campeoes', 'liga dos campeões'], id: 7 },
  { keywords: ['europa league', 'liga europa'], id: 8 },
]

const EXCLUDED_TEAM_IDS = [999991, 999992, 999993, 999994, 926, 913, 924, 911, 843, 889, 767, 1328]

export async function searchSite(query: string, options?: { fullResults?: boolean }): Promise<SearchResults> {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length < 2) {
    return EMPTY_RESULTS
  }

  const fullResults = options?.fullResults ?? false
  const leagueLimit = fullResults ? 30 : 5
  const teamLimit = fullResults ? 50 : 5
  const profileLimit = fullResults ? 25 : 5
  const footballPlayerLimit = fullResults ? 50 : 5
  const supabase = await createClient()

  const lowerQuery = trimmedQuery.toLowerCase()
  const matchedAliasIds = LEAGUE_ALIASES
    .filter((alias) => alias.keywords.some((keyword) => lowerQuery.includes(keyword)))
    .map((alias) => alias.id)

  const resolvedLeagues: LeagueResult[] = []

  if (matchedAliasIds.length > 0) {
    const { data: aliasLeagues } = await supabase
      .from('leagues')
      .select('id, name, country, logo_url')
      .in('id', matchedAliasIds)

    if (aliasLeagues) {
      resolvedLeagues.push(...aliasLeagues)
    }
  }

  const { data: searchedLeagues } = await supabase
    .from('leagues')
    .select('id, name, country, logo_url')
    .or(`name.ilike.%${trimmedQuery}%,country.ilike.%${trimmedQuery}%`)
    .limit(fullResults ? 60 : 10)

  if (searchedLeagues) {
    searchedLeagues.forEach((league) => {
      if (!resolvedLeagues.some((resolvedLeague) => resolvedLeague.id === league.id)) {
        resolvedLeagues.push(league)
      }
    })
  }

  const { data: rawTeams } = await supabase
    .from('teams')
    .select('id, name, short_name, logo_url')
    .or(`name.ilike.%${trimmedQuery}%,short_name.ilike.%${trimmedQuery}%`)
    .limit(fullResults ? 80 : 20)

  const filteredTeams = (rawTeams || [])
    .filter((team) => !EXCLUDED_TEAM_IDS.includes(team.id))
    .slice(0, teamLimit)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, points, first_name, last_name, username')
    .or(`email.ilike.%${trimmedQuery}%,first_name.ilike.%${trimmedQuery}%,last_name.ilike.%${trimmedQuery}%,username.ilike.%${trimmedQuery}%`)
    .limit(profileLimit)

  const resolvedPlayers = await Promise.all(
    (profiles || []).map(async (profile) => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('points', profile.points)

      const firstName = profile.first_name || ''
      const lastName = profile.last_name || ''
      const fullName = [firstName, lastName].filter(Boolean).join(' ')

      return {
        id: profile.id,
        email: maskEmail(profile.email),
        name: profile.username || fullName || maskEmail(profile.email),
        points: profile.points / 100,
        rank: (count || 0) + 1,
      }
    })
  )

  const { data: dbFootballPlayers } = await supabase
    .from('player_stats')
    .select('player_id, player_name, position, goals, assists, passes, yellow_cards, red_cards, team_id, teams(name, logo_url)')
    .ilike('player_name', `%${trimmedQuery}%`)
    .limit(fullResults ? 120 : 30)

  const uniqueFootballPlayers = new Map<number, FootballPlayerResult>()
  if (dbFootballPlayers) {
    dbFootballPlayers.forEach((player) => {
      const id = Number(player.player_id)
      const team = Array.isArray(player.teams) ? player.teams[0] : player.teams
      if (!uniqueFootballPlayers.has(id)) {
        uniqueFootballPlayers.set(id, {
          id,
          name: player.player_name,
          position: player.position,
          team_name: team?.name || 'Equipa Desconhecida',
          team_logo: team?.logo_url || null,
          goals: player.goals,
          assists: player.assists,
          passes: player.passes,
          yellow_cards: player.yellow_cards,
          red_cards: player.red_cards,
        })
      }
    })
  }

  return {
    leagues: resolvedLeagues.slice(0, leagueLimit),
    teams: filteredTeams,
    players: resolvedPlayers,
    footballPlayers: Array.from(uniqueFootballPlayers.values()).slice(0, footballPlayerLimit),
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'utilizador'
  if (local.length <= 3) {
    return `${local.substring(0, 1)}***@${domain}`
  }
  return `${local.substring(0, 3)}***@${domain}`
}
