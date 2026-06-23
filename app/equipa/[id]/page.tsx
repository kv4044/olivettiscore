import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { bzzoiroService } from '@/services/bzzoiro'
import { getTeamsLogos } from '@/services/logoService'
import { getFlagUrl } from '@/utils/flags'
import LocalTime from '@/components/LocalTime'
import StarButton from '@/components/favorites/StarButton'
import TeamStandingsSelector, { TeamCompetitionOption, TeamSeasonOption } from '@/components/TeamStandingsSelector'
import { enrichStandingsWithLogos } from '@/utils/standings'
import { 
  MapPin, 
  Calendar, 
  Trophy, 
  Clock, 
  TrendingUp
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const revalidate = 60 // Revalidar a cada minuto

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getStandingsRows(standings: any): any[] {
  if (!standings) return []

  if (standings.grouped && standings.groups) {
    return Object.values(standings.groups).flatMap((rows: any) => Array.isArray(rows) ? rows : [])
  }

  return Array.isArray(standings.standings) ? standings.standings : []
}

function getTeamRow(standings: any, teamId: number) {
  return getStandingsRows(standings).find((row: any) => Number(row.team_id) === teamId)
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
  let events: any[] = []
  try {
    events = await bzzoiroService.getEvents({ team_id: String(teamId) }, { fetchAll: true })
  } catch (err) {
    console.error('Erro ao obter jogos da equipa:', err)
  }

  // 5. Obter classificação da liga
  let leagueStandings = null
  let leagueName = ''
  let leagueId = null
  
  if (events && events.length > 0) {
    // Tenta encontrar a liga ativa correspondente
    const firstEvent = events[0]
    leagueId = firstEvent.league.id
    leagueName = firstEvent.league.name
    try {
      leagueStandings = await bzzoiroService.getLeagueStandings(leagueId)
    } catch (err) {
      console.error('Erro ao obter classificações da liga:', err)
    }
  }

  const competitionsMap = new Map<number, TeamCompetitionOption>()
  events.forEach((event: any) => {
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

  // Filtros de jogos terminados e agendados
  const completedMatches = events
    .filter((e: any) => e.status === 'FT')
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  const upcomingMatches = events
    .filter((e: any) => e.status === 'NS')
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10)

  // Helper para verificar o resultado da equipa (Vitória, Empate, Derrota)
  const getMatchResult = (event: any) => {
    const isHome = event.home_team.id === teamId
    const scoreHome = event.score.home
    const scoreAway = event.score.away

    if (scoreHome === null || scoreAway === null) return null

    if (scoreHome === scoreAway) {
      return { label: 'E', color: 'bg-zinc-800 text-zinc-400 border border-zinc-700' }
    }
    
    const won = isHome ? scoreHome > scoreAway : scoreAway > scoreHome
    if (won) {
      return { label: 'V', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black' }
    } else {
      return { label: 'D', color: 'bg-red-500/10 text-red-400 border border-red-500/20 font-black' }
    }
  }

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
                    <p className="mt-1 text-lg font-black text-white">#{selectedTeamStanding.position}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-indigo-300">Jogos</p>
                    <p className="mt-1 text-lg font-black text-white">{selectedTeamStanding.played}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-indigo-300">Pontos</p>
                    <p className="mt-1 text-lg font-black text-white">{selectedTeamStanding.pts}</p>
                  </div>
                </div>
              )}

              {leagueStandings && (leagueStandings.standings || leagueStandings.groups) ? (
                <div className="border border-zinc-850 rounded-2xl overflow-hidden max-h-[460px] overflow-y-auto pr-0.5">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-850">
                        <th className="py-2.5 px-3 text-center w-8">#</th>
                        <th className="py-2.5 px-2">Clube</th>
                        <th className="py-2.5 px-2 text-center">J</th>
                        <th className="py-2.5 px-2 text-center">Form</th>
                        <th className="py-2.5 px-3 text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/50">
                      {getStandingsRows(leagueStandings).map((row: any) => {
                        const isCurrentTeam = row.team_id === teamId
                        return (
                          <tr 
                            key={row.team_id}
                            className={`transition-colors ${
                              isCurrentTeam 
                                ? 'bg-indigo-500/10 text-indigo-300 font-black border-l-2 border-indigo-500 pl-2' 
                                : 'text-zinc-400 hover:bg-zinc-900/20'
                            }`}
                          >
                            <td className="py-2 px-3 text-center font-bold">
                              {row.position}
                            </td>
                            <td className="py-2 px-2 max-w-[120px] font-bold">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                                  {row.team_logo && row.team_logo !== 'no_logo' ? (
                                    <img src={row.team_logo} alt="" className="w-full h-full object-contain" />
                                  ) : null}
                                </span>
                                <span className="truncate">{row.team_name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center font-medium">
                              {row.played}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className="font-mono text-[9px] tracking-wide text-zinc-500">
                                {row.form || '-'}
                              </span>
                            </td>
                            <td className={`py-2 px-3 text-right font-black ${isCurrentTeam ? 'text-indigo-400' : 'text-zinc-200'}`}>
                              {row.pts}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-zinc-500 text-xs">
                  Sem classificação disponível no momento.
                </div>
              )}
            </div>

          </div>

          {/* COLUNA DIREITA: Calendário de Jogos (7/12) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* JOGOS CARD */}
            <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-6 shadow-lg space-y-6">
              
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2 border-b border-zinc-850 pb-3">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span>Historial de Jogos</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* ÚLTIMOS RESULTADOS */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 pl-1">
                    <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Últimos Resultados</span>
                  </h4>
                  
                  {completedMatches.length === 0 ? (
                    <div className="p-8 text-center text-zinc-550 border border-zinc-900 rounded-2xl text-xs">
                      Nenhum jogo terminado.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {completedMatches.map((event: any) => {
                        const res = getMatchResult(event)
                        const isHome = event.home_team.id === teamId
                        
                        return (
                          <div 
                            key={event.id}
                            className="p-3 bg-zinc-950/30 border border-zinc-900 rounded-xl flex items-center justify-between gap-3 text-xxs font-semibold"
                          >
                            <div className="flex-1 space-y-1 truncate">
                              <p className={`truncate ${isHome ? 'text-zinc-200 font-bold' : 'text-zinc-450'}`}>
                                {event.home_team.name}
                              </p>
                              <p className={`truncate ${!isHome ? 'text-zinc-200 font-bold' : 'text-zinc-450'}`}>
                                {event.away_team.name}
                              </p>
                            </div>

                            {/* Placar e WDL Tag */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-black text-xs text-indigo-400 bg-indigo-500/5 px-2 py-1 border border-indigo-950 rounded-lg min-w-[32px] text-center select-none">
                                {event.score.home}-{event.score.away}
                              </span>
                              {res && (
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${res.color}`}>
                                  {res.label}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* PRÓXIMOS COMPROMISSOS */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 pl-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Próximos Jogos</span>
                  </h4>

                  {upcomingMatches.length === 0 ? (
                    <div className="p-8 text-center text-zinc-550 border border-zinc-900 rounded-2xl text-xs">
                      Nenhum jogo agendado.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {upcomingMatches.map((event: any) => {
                        const isHome = event.home_team.id === teamId
                        return (
                          <div 
                            key={event.id}
                            className="p-3 bg-zinc-950/30 border border-zinc-900 rounded-xl flex items-center justify-between gap-3 text-xxs font-semibold"
                          >
                            <div className="flex-1 space-y-1 truncate">
                              <p className={`truncate ${isHome ? 'text-zinc-200 font-bold' : 'text-zinc-450'}`}>
                                {event.home_team.name}
                              </p>
                              <p className={`truncate ${!isHome ? 'text-zinc-200 font-bold' : 'text-zinc-450'}`}>
                                {event.away_team.name}
                              </p>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-0.5">
                              <LocalTime utcDateString={event.date} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-900/60 bg-zinc-950/30 text-center z-10 text-xs text-zinc-600">
        <p>&copy; {new Date().getFullYear()} Olivetti Score. Criado no âmbito de Projeto Integrado I.</p>
        <p className="mt-1 text-xxs text-zinc-700">Dados fornecidos em tempo real pela API Bzzoiro Sports.</p>
      </footer>
    </div>
  )
}
