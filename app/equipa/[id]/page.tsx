import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { bzzoiroService, type BzzoiroEvent } from '@/services/bzzoiro'
import { getTeamsLogos } from '@/services/logoService'
import { getFlagUrl } from '@/utils/flags'
import StandingsTable, { getStandingsRows } from '@/components/StandingsTable'
import StarButton from '@/components/favorites/StarButton'
import TeamStandingsSelector, { TeamCompetitionOption, TeamSeasonOption } from '@/components/TeamStandingsSelector'
import TeamMatchesTabs from '@/components/TeamMatchesTabs'
import TeamTabs, { type TeamSquadPlayer } from '@/components/TeamTabs'
import { enrichStandingsWithLogos } from '@/utils/standings'
import type { LeagueStatsSummary, PlayerStats } from '@/utils/statsGenerator'
import { 
  MapPin, 
  Trophy
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const revalidate = 60 // Revalidar a cada minuto

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getTeamRow(standings: Parameters<typeof getStandingsRows>[0], teamId: number) {
  return getStandingsRows(standings).find((row: { team_id?: number | string }) => Number(row.team_id) === teamId)
}

type RawSquadPlayer = {
  id?: number
  player_id?: number
  name?: string
  player_name?: string
  position?: string | null
  shirt_number?: number | null
  number?: number | null
}

type PlayerStatRow = {
  player_id: number | string
  player_name?: string | null
  position?: string | null
  goals?: number | null
  assists?: number | null
  passes?: number | null
  yellow_cards?: number | null
  red_cards?: number | null
}

const emptyStatsSummary = (): LeagueStatsSummary => ({
  topGoals: [],
  topAssists: [],
  topPasses: [],
  topYellowCards: [],
  topRedCards: []
})

function normalizePosition(position: string | null | undefined) {
  const raw = position?.toUpperCase() || 'M'

  if (raw.startsWith('F') || raw === 'A' || raw === 'AV' || raw === 'FW' || raw === 'ATT') return 'F'
  if (raw.startsWith('D') || raw === 'DF' || raw === 'DEF') return 'D'
  if (raw.startsWith('G') || raw === 'GR' || raw === 'GK') return 'G'
  if (raw.startsWith('M') || raw === 'MC' || raw === 'MID') return 'M'

  return raw
}

function hasPlayers(value: unknown): value is { players: RawSquadPlayer[] } {
  return typeof value === 'object'
    && value !== null
    && 'players' in value
    && Array.isArray((value as { players?: unknown }).players)
}

function mapSquadPlayers(squadData: unknown): TeamSquadPlayer[] {
  const players: RawSquadPlayer[] = hasPlayers(squadData)
    ? squadData.players
    : Array.isArray(squadData)
      ? squadData
      : []

  return players
    .map((player) => ({
      id: Number(player.player_id || player.id),
      name: player.name || player.player_name || `Jogador #${player.player_id || player.id}`,
      position: normalizePosition(player.position),
      shirtNumber: player.shirt_number || player.number || null
    }))
    .filter((player: TeamSquadPlayer) => player.id && player.name)
    .sort((a: TeamSquadPlayer, b: TeamSquadPlayer) => {
      const shirtA = a.shirtNumber ?? 999
      const shirtB = b.shirtNumber ?? 999
      return shirtA - shirtB || a.name.localeCompare(b.name)
    })
}

function summarizeTeamPlayerStats(dbStats: PlayerStatRow[] | null, teamName: string): LeagueStatsSummary {
  if (!dbStats?.length) return emptyStatsSummary()

  const playerMap = new Map<number, PlayerStats>()

  dbStats.forEach((stat) => {
    const playerId = Number(stat.player_id)
    if (!playerId) return

    const existing = playerMap.get(playerId)
    if (existing) {
      existing.goals += stat.goals || 0
      existing.assists += stat.assists || 0
      existing.passes += stat.passes || 0
      existing.yellowCards += stat.yellow_cards || 0
      existing.redCards += stat.red_cards || 0
      return
    }

    playerMap.set(playerId, {
      id: playerId,
      name: stat.player_name || `Jogador #${playerId}`,
      position: normalizePosition(stat.position),
      teamName,
      goals: stat.goals || 0,
      assists: stat.assists || 0,
      passes: stat.passes || 0,
      yellowCards: stat.yellow_cards || 0,
      redCards: stat.red_cards || 0
    })
  })

  const players = Array.from(playerMap.values())

  return {
    topGoals: [...players].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)).slice(0, 10),
    topAssists: [...players].sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name)).slice(0, 10),
    topPasses: [...players].sort((a, b) => b.passes - a.passes || a.name.localeCompare(b.name)).slice(0, 10),
    topYellowCards: [...players].sort((a, b) => b.yellowCards - a.yellowCards || a.name.localeCompare(b.name)).slice(0, 10),
    topRedCards: [...players].sort((a, b) => b.redCards - a.redCards || b.yellowCards - a.yellowCards || a.name.localeCompare(b.name)).slice(0, 10)
  }
}

export default async function TeamDetailsPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const query = await searchParams
  const teamId = Number(id)

  if (isNaN(teamId)) {
    notFound()
  }

  // Verificar se a equipa está nos favoritos do utilizador
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isTeamFav = false
  if (user) {
    const { data: favData } = await supabase
      .from('favorite_teams')
      .select('id')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .maybeSingle()
    isTeamFav = !!favData
  }

  // 1. Procurar detalhes da equipa na API Bzzoiro
  let teamDetails;
  try {
    teamDetails = await bzzoiroService.getTeamDetails(teamId)
  } catch (err) {
    console.error('Erro ao buscar detalhes da equipa:', err)
    notFound()
  }

  if (!teamDetails || !teamDetails.name) {
    notFound()
  }

  // 2. Procurar o logótipo da equipa via LogoService
  let teamLogo = null
  try {
    const logos = await getTeamsLogos([{ id: teamId, name: teamDetails.name }])
    teamLogo = logos[teamId] || null
  } catch (err) {
    console.error('Erro ao obter logótipo da equipa:', err)
  }

  // 3. Procurar estádio (venue) se existir venue_id
  let venueDetails = null
  if (teamDetails.venue_id) {
    try {
      venueDetails = await bzzoiroService.getVenueDetails(teamDetails.venue_id)
    } catch (err) {
      console.error('Erro ao obter detalhes do estádio:', err)
    }
  }

  // 4. Procurar jogos envolvendo a equipa
  let events: BzzoiroEvent[] = []
  try {
    events = await bzzoiroService.getEvents({ team_id: String(teamId) }, { fetchAll: true, enrich: false })
  } catch (err) {
    console.error('Erro ao obter jogos da equipa:', err)
  }

  // 5. Obter classificação da liga
  let leagueStandings = null
  let leagueId: number | null = null
  
  if (events && events.length > 0) {
    // Tenta encontrar a liga ativa correspondente
    const firstEvent = events[0]
    leagueId = firstEvent.league.id
    try {
      leagueStandings = await bzzoiroService.getLeagueStandings(leagueId)
    } catch (err) {
      console.error('Erro ao obter classificações da liga:', err)
    }
  }

  const competitionsMap = new Map<number, TeamCompetitionOption>()
  events.forEach((event) => {
    if (event.league?.id) {
      competitionsMap.set(event.league.id, {
        id: event.league.id,
        name: event.league.name || `Liga #${event.league.id}`,
        country: event.league.country
      })
    }
  })

  const competitions = Array.from(competitionsMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))

  const requestedLeagueId = Number(getQueryValue(query.competicao))
  const selectedCompetition = competitions.find((competition) => competition.id === requestedLeagueId) || competitions[0] || null
  const selectedLeagueId = selectedCompetition?.id || null

  let seasons: TeamSeasonOption[] = []
  if (selectedLeagueId) {
    try {
      const seasonsData = await bzzoiroService.getLeagueSeasons(selectedLeagueId)
      seasons = Array.isArray(seasonsData?.seasons) ? seasonsData.seasons : []
    } catch (err) {
      console.error('Erro ao obter épocas da competição:', err)
    }
  }

  const requestedSeasonId = Number(getQueryValue(query.epoca))
  const selectedSeason = seasons.find((season) => season.id === requestedSeasonId)
    || seasons.find((season) => season.is_current)
    || seasons[0]
    || null
  const selectedSeasonId = selectedSeason?.id || null

  if (selectedLeagueId) {
    try {
      leagueStandings = await enrichStandingsWithLogos(
        await bzzoiroService.getLeagueStandings(selectedLeagueId, selectedSeasonId || undefined)
      )
    } catch (err) {
      console.error('Erro ao obter classificações da competição:', err)
    }
  }

  const selectedTeamStanding = getTeamRow(leagueStandings, teamId)

  let squad: TeamSquadPlayer[] = []
  try {
    squad = mapSquadPlayers(await bzzoiroService.getTeamSquad(teamId))
  } catch (err) {
    console.error('Erro ao obter plantel da equipa:', err)
  }

  let teamStatsSummary = emptyStatsSummary()
  try {
    const { data: initialStats, error: statsError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('team_id', teamId)

    if (statsError) throw statsError
    const dbStats = initialStats as PlayerStatRow[] | null
    teamStatsSummary = summarizeTeamPlayerStats(dbStats, teamDetails.name)
  } catch (err) {
    console.error('Erro ao obter estatisticas da equipa:', err)
  }

  // Filtros de jogos terminados e agendados
  const completedMatches = events
    .filter((event) => event.status === 'FT')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const upcomingMatches = events
    .filter((event) => event.status === 'NS')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-950 to-black text-zinc-100 flex flex-col font-sans">
      
      {/* Background glowing shapes */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <main className="z-10 flex-1 max-w-none w-full px-6 md:px-8 py-8 space-y-6">
        
        {/* TEAM HERO BANNER */}
        <section className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/15 transition-all" />
          
          {/* Logo do Clube */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-zinc-950 border border-zinc-850 p-4 md:p-6 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
            {teamLogo && teamLogo !== 'no_logo' ? (
              <img src={teamLogo} alt={`${teamDetails.name} Logo`} className="w-full h-full object-contain" />
            ) : (
              <span className="text-3xl md:text-5xl font-black text-zinc-700">
                {teamDetails.short_name?.substring(0, 2).toUpperCase() || teamDetails.name.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Nome e Nacionalidade */}
          <div className="text-center md:text-left space-y-2.5">
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-none">
                {teamDetails.name}
              </h1>
              {user && (
                <StarButton
                  type="team"
                  id={teamId}
                  name={teamDetails.name}
                  isFavorited={isTeamFav}
                  className="bg-zinc-950/60 border border-zinc-850 hover:bg-zinc-900"
                />
              )}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-bold text-zinc-400">
              {getFlagUrl(teamDetails.country) && (
                <img 
                  src={getFlagUrl(teamDetails.country)!} 
                  alt="" 
                  className="w-4 h-2.5 object-cover rounded-sm"
                />
              )}
              <span>{teamDetails.country || 'Nacionalidade desconhecida'}</span>
              {teamDetails.short_name && (
                <>
                  <span className="text-zinc-650">·</span>
                  <span className="text-zinc-500 font-mono text-[10px] uppercase font-black bg-zinc-950/80 px-2 py-0.5 border border-zinc-900 rounded-md">
                    {teamDetails.short_name}
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        <TeamTabs
          squad={squad}
          statsSummary={teamStatsSummary}
        >
          {/* DETAILS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUNA ESQUERDA: Estádio e Classificações (5/12) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* ESTÁDIO CARD */}
            <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-5 shadow-lg space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-400" />
                <span>Estádio da Equipa</span>
              </h3>

              {venueDetails ? (
                <div className="space-y-3">
                  <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl">
                    <p className="text-[9px] text-zinc-550 uppercase tracking-wider font-bold">Nome do Estádio</p>
                    <p className="text-sm font-black text-zinc-200 mt-0.5">{venueDetails.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl">
                      <p className="text-[9px] text-zinc-550 uppercase tracking-wider font-bold">Cidade</p>
                      <p className="text-xs font-semibold text-zinc-300 mt-0.5">{venueDetails.city}</p>
                    </div>
                    <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl">
                      <p className="text-[9px] text-zinc-550 uppercase tracking-wider font-bold">Capacidade</p>
                      <p className="text-xs font-semibold text-zinc-300 mt-0.5">{venueDetails.capacity ? `${venueDetails.capacity.toLocaleString()} espetadores` : 'N/A'}</p>
                    </div>
                    {venueDetails.built_year && (
                      <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl">
                        <p className="text-[9px] text-zinc-550 uppercase tracking-wider font-bold">Ano de Construção</p>
                        <p className="text-xs font-semibold text-zinc-300 mt-0.5">{venueDetails.built_year}</p>
                      </div>
                    )}
                    {venueDetails.pitch_length_m && (
                      <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl">
                        <p className="text-[9px] text-zinc-550 tracking-wider uppercase font-bold">Dimensão do Relvado</p>
                        <p className="text-xs font-semibold text-zinc-300 mt-0.5">{venueDetails.pitch_length_m}m x {venueDetails.pitch_width_m}m</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-zinc-500 text-xs">
                  Sem informações do estádio disponíveis.
                </div>
              )}
            </div>

            {/* LEAGUE STANDINGS CARD */}
            <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-5 shadow-lg space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Classificação ({selectedCompetition?.name || 'Competição'}{selectedSeason ? ` · ${selectedSeason.name}` : ''})</span>
              </h3>

              <TeamStandingsSelector
                competitions={competitions}
                seasons={seasons}
                selectedLeagueId={selectedLeagueId}
                selectedSeasonId={selectedSeasonId}
              />

              {selectedTeamStanding && (
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-center">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-indigo-300">Posição</p>
                    <p className="mt-1 text-lg font-black text-white">#{String(selectedTeamStanding.position ?? '-')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-indigo-300">Jogos</p>
                    <p className="mt-1 text-lg font-black text-white">{String(selectedTeamStanding.played ?? '-')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-indigo-300">Pontos</p>
                    <p className="mt-1 text-lg font-black text-white">{String(selectedTeamStanding.pts ?? '-')}</p>
                  </div>
                </div>
              )}

              {leagueStandings && (leagueStandings.standings || leagueStandings.groups) ? (
                <StandingsTable
                  standings={leagueStandings}
                  highlightedTeamIds={[teamId]}
                  maxHeightClassName="max-h-[460px]"
                  compact
                />
              ) : (
                <div className="p-4 text-center text-zinc-500 text-xs">
                  Sem classificação disponível no momento.
                </div>
              )}
            </div>

          </div>

          {/* COLUNA DIREITA: Calendário de Jogos (7/12) */}
            <div className="lg:col-span-7 space-y-6">
              <TeamMatchesTabs
                teamId={teamId}
                completedMatches={completedMatches}
                upcomingMatches={upcomingMatches}
              />
            </div>

          </div>
        </TeamTabs>

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-900/60 bg-zinc-950/30 text-center z-10 text-xs text-zinc-600">
        <p>&copy; {new Date().getFullYear()} Olivetti Score. Criado no âmbito de Projeto Integrado I.</p>
        <p className="mt-1 text-xxs text-zinc-700">Dados fornecidos em tempo real pela API Bzzoiro Sports.</p>
      </footer>
    </div>
  )
}
