import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { bzzoiroService } from '@/services/bzzoiro'
import { favoritesService, UserFavorites } from '@/services/favorites'
import { predictionsService } from '@/services/predictions'
import StarButton from '@/components/favorites/StarButton'
import MatchTabs from '@/components/matches/MatchTabs'
import LocalTime from '@/components/LocalTime'
import LiveRefresher from '@/components/LiveRefresher'
import { 
  ArrowLeft, 
  Clock, 
  Play, 
  CheckCircle2, 
  Calendar,
  AlertCircle
} from 'lucide-react'

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 10 // Revalidar a página a cada 10 segundos para score live

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params
  const matchId = Number(id)

  if (isNaN(matchId)) {
    return notFound()
  }

  // 1. Obter Sessão do Utilizador
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Obter Dados Relacionados ao Jogo (API Bzzoiro e Supabase)
  let event: any = null
  let isMatchFav = false
  let userPrediction: any = null
  let venue: any = null
  let referee: any = null
  let stats: any = null
  let lineups: any = null
  let standings: any = null
  let incidents: any = null
  let errorMsg: string | null = null

  try {
    const [eventRes, favRes, predRes] = await Promise.all([
      bzzoiroService.getEventDetails(matchId),
      user ? favoritesService.getUserFavorites() : Promise.resolve<UserFavorites>({ leagues: [], teams: [], matches: [] }),
      user ? predictionsService.getUserPredictionForMatch(matchId) : Promise.resolve(null)
    ])

    event = eventRes
    isMatchFav = favRes.matches.includes(matchId)
    userPrediction = predRes

    if (event) {
      const [venueRes, refereeRes, statsRes, lineupsRes, standingsRes, incidentsRes] = await Promise.all([
        event.venue_id ? bzzoiroService.getVenueDetails(event.venue_id).catch(() => null) : Promise.resolve(null),
        event.referee_id ? bzzoiroService.getRefereeDetails(event.referee_id).catch(() => null) : Promise.resolve(null),
        bzzoiroService.getEventStats(matchId).catch(() => null),
        bzzoiroService.getEventLineups(matchId).catch(() => null),
        bzzoiroService.getLeagueStandings(event.league.id).catch(() => null),
        bzzoiroService.getEventIncidents(matchId).catch(() => null)
      ])

      venue = venueRes
      referee = refereeRes
      stats = statsRes
      lineups = lineupsRes
      standings = standingsRes
      incidents = incidentsRes
    }
  } catch (error: any) {
    console.error('Erro ao carregar detalhe do jogo:', error)
    errorMsg = error.message || 'Ocorreu um erro ao ligar à API Bzzoiro.'
  }

  // Se a API não encontrar o jogo, ou der erro e não tivermos dados
  if (!event) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 backdrop-blur-xl bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 shadow-xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h3 className="text-xl font-bold">Jogo Não Encontrado</h3>
          <p className="text-sm text-zinc-400">
            {errorMsg || 'Não foi possível carregar os detalhes desta partida de futebol.'}
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar aos Resultados</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Auxiliares de badge de tempo no cabeçalho
  const renderTimeHeader = () => {
    const { status, minute } = event
    if (status === 'LIVE') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-extrabold text-xs animate-pulse">
          <Play className="w-3.5 h-3.5 fill-red-400" />
          <span>{minute != null ? `${minute}'` : 'AO VIVO'}</span>
        </div>
      )
    }
    if (status === 'HT') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>Intervalo</span>
        </div>
      )
    }
    if (status === 'FT') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Terminado</span>
        </div>
      )
    }
    // Agendado
    const hora = new Date(event.date).toLocaleTimeString('pt-PT', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'Europe/Lisbon' 
    })
    const dataLabel = new Date(event.date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short'
    })
    return (
      <div className="text-zinc-400 text-xs font-semibold flex items-center gap-1.5 bg-zinc-950 border border-zinc-850 px-3 py-1 rounded-full">
        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
        <span>{dataLabel} · </span>
        <LocalTime utcDateString={event.date} />
      </div>
    )
  }

  // Extrair golos para o cabeçalho
  const incidentsList = incidents?.incidents || []
  const goals = incidentsList.filter((i: any) => i.type === 'goal')
  const sortedGoals = [...goals].sort((a: any, b: any) => a.minute - b.minute)
  const homeGoals = sortedGoals.filter((g: any) => g.is_home)
  const awayGoals = sortedGoals.filter((g: any) => !g.is_home)
  
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-950 to-black text-zinc-100 flex flex-col font-sans">
      <LiveRefresher hasLiveEvents={event.status === 'LIVE' || event.status === 'HT'} />
      
      {/* Background abstract glowing shapes */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Mini-Header de navegação */}
      <header className="z-50 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md sticky top-0">
        <div className="max-w-none px-6 md:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Resultados</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-semibold truncate max-w-[200px] hidden sm:inline">
              {event.league.name}
            </span>
            {user && (
              <StarButton
                type="match"
                id={matchId}
                name={`${event.home_team.name} vs ${event.away_team.name}`}
                isFavorited={isMatchFav}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="z-10 flex-1 max-w-none w-full px-6 md:px-8 py-8 space-y-8">
        
        {/* CABEÇALHO DO PLACAR (SCOREBOARD) */}
        <section className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl">
          
          {/* Informações da Liga e Tempo */}
          <div className="flex flex-col items-center gap-3 text-center mb-6 border-b border-zinc-850 pb-4">
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/5 px-2.5 py-0.5 rounded border border-indigo-950/50">
              {event.league.name} {event.league.country ? `· ${event.league.country}` : ''}
            </span>
            {renderTimeHeader()}
          </div>

          {/* Teams and Score Grid */}
          <div className="grid grid-cols-12 items-center gap-4">
            {/* Equipa da Casa */}
            <div className="col-span-4 flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-zinc-950/40 border border-zinc-850 flex items-center justify-center p-3.5 shadow-inner">
                {event.home_team.logo ? (
                  <img src={event.home_team.logo} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xl font-black text-zinc-600">{event.home_team.name.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <h2 className="font-extrabold text-sm md:text-base text-zinc-100 max-w-[120px] md:max-w-[160px] truncate leading-tight">
                {event.home_team.name}
              </h2>
            </div>

            {/* Placar / Score */}
            <div className="col-span-4 flex flex-col items-center justify-center text-center">
              {event.status !== 'NS' ? (
                <div className="flex items-center justify-center gap-3 md:gap-5">
                  <span className="text-4xl md:text-5xl font-black text-white font-mono select-none">
                    {event.score.home ?? 0}
                  </span>
                  <span className="text-zinc-700 text-xl font-bold font-mono">:</span>
                  <span className="text-4xl md:text-5xl font-black text-white font-mono select-none">
                    {event.score.away ?? 0}
                  </span>
                </div>
              ) : (
                <span className="text-zinc-600 text-xs uppercase font-extrabold tracking-wider bg-zinc-950 px-4 py-1.5 border border-zinc-850 rounded-lg">
                  Agendado
                </span>
              )}

              {/* Marcadores de intervalo (se existirem) */}
              {event.score.halftime && event.score.halftime.home !== null && (
                <span className="text-[10px] text-zinc-500 font-semibold mt-3 bg-zinc-950/40 px-2 py-0.5 rounded border border-zinc-900">
                  Int: {event.score.halftime.home} - {event.score.halftime.away}
                </span>
              )}
            </div>

            {/* Equipa de Fora */}
            <div className="col-span-4 flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-zinc-950/40 border border-zinc-850 flex items-center justify-center p-3.5 shadow-inner">
                {event.away_team.logo ? (
                  <img src={event.away_team.logo} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xl font-black text-zinc-600">{event.away_team.name.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <h2 className="font-extrabold text-sm md:text-base text-zinc-100 max-w-[120px] md:max-w-[160px] truncate leading-tight">
                {event.away_team.name}
              </h2>
            </div>
          </div>

          {/* Marcadores dos golos e cartões */}
          {(homeGoals.length > 0 || awayGoals.length > 0 || incidentsList.some((i: any) => i.type === 'card')) && (
            <div className="mt-6 pt-4 border-t border-zinc-850/60 space-y-3">
              {/* Golos */}
              {(homeGoals.length > 0 || awayGoals.length > 0) && (
                <div className="grid grid-cols-12 gap-4 text-xs text-zinc-400">
                  {/* Golos da Casa */}
                  <div className="col-span-5 text-right space-y-1">
                    {homeGoals.map((g: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-end gap-1.5">
                        {g.goal_type === 'own' && <span className="text-[10px] text-red-400 font-semibold">(P.B.)</span>}
                        {g.goal_type === 'penalty' && <span className="text-[10px] text-emerald-400 font-semibold">(Pen.)</span>}
                        <span className="font-medium text-zinc-300">{g.player}</span>
                        <span className="text-zinc-500 font-mono">{g.minute}'{g.added_time ? `+${g.added_time}` : ''}</span>
                        <span className="text-zinc-400">⚽</span>
                      </div>
                    ))}
                  </div>

                  {/* Espaço central */}
                  <div className="col-span-2 flex justify-center items-center">
                    <span className="text-[9px] uppercase font-black text-zinc-650 tracking-wider">Golos</span>
                  </div>

                  {/* Golos de Fora */}
                  <div className="col-span-5 text-left space-y-1">
                    {awayGoals.map((g: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-start gap-1.5">
                        <span className="text-zinc-400">⚽</span>
                        <span className="text-zinc-500 font-mono">{g.minute}'{g.added_time ? `+${g.added_time}` : ''}</span>
                        <span className="font-medium text-zinc-300">{g.player}</span>
                        {g.goal_type === 'penalty' && <span className="text-[10px] text-emerald-400 font-semibold">(Pen.)</span>}
                        {g.goal_type === 'own' && <span className="text-[10px] text-red-400 font-semibold">(P.B.)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cartões */}
              {incidentsList.some((i: any) => i.type === 'card') && (
                <div className="grid grid-cols-12 gap-4 text-xs text-zinc-400 pt-2 border-t border-dashed border-zinc-900">
                  {/* Cartões Casa */}
                  <div className="col-span-5 text-right flex items-center justify-end gap-3">
                    {(() => {
                      const yellows = incidentsList.filter((i: any) => i.is_home && i.type === 'card' && i.card_type === 'yellow').length
                      const reds = incidentsList.filter((i: any) => i.is_home && i.type === 'card' && (i.card_type === 'red' || i.card_type === 'yellow_red')).length
                      return (
                        <>
                          {yellows > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/20">
                              <span className="w-2.5 h-3.5 bg-amber-500 rounded-[2px]" /> {yellows}
                            </span>
                          )}
                          {reds > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/20">
                              <span className="w-2.5 h-3.5 bg-red-500 rounded-[2px]" /> {reds}
                            </span>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  {/* Espaço central */}
                  <div className="col-span-2 flex justify-center items-center">
                    <span className="text-[9px] uppercase font-black text-zinc-650 tracking-wider">Cartões</span>
                  </div>

                  {/* Cartões Fora */}
                  <div className="col-span-5 text-left flex items-center justify-start gap-3">
                    {(() => {
                      const yellows = incidentsList.filter((i: any) => !i.is_home && i.type === 'card' && i.card_type === 'yellow').length
                      const reds = incidentsList.filter((i: any) => !i.is_home && i.type === 'card' && (i.card_type === 'red' || i.card_type === 'yellow_red')).length
                      return (
                        <>
                          {yellows > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/20">
                              <span className="w-2.5 h-3.5 bg-amber-500 rounded-[2px]" /> {yellows}
                            </span>
                          )}
                          {reds > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/20">
                              <span className="w-2.5 h-3.5 bg-red-500 rounded-[2px]" /> {reds}
                            </span>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* DETALHES, PREVISÕES ML E SIMULADOR (Abas Dinâmicas) */}
        <section className="w-full">
          <MatchTabs
            event={event}
            userPrediction={userPrediction}
            isUserLoggedIn={!!user}
            matchId={matchId}
            venue={venue}
            referee={referee}
            stats={stats}
            lineups={lineups}
            standings={standings}
            incidents={incidents}
          />
        </section>

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-900/60 bg-zinc-950/30 text-center z-10 text-xs text-zinc-600">
        <p>&copy; {new Date().getFullYear()} Olivetti Score. Criado no âmbito de Projeto Integrado I.</p>
        <p className="mt-1 text-xxs text-zinc-700">Dados em tempo real por Bzzoiro Sports API.</p>
      </footer>
    </div>
  )
}
