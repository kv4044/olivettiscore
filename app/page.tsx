import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { bzzoiroService, BzzoiroEvent, BzzoiroLeague } from '@/services/bzzoiro'
import { favoritesService, UserFavorites } from '@/services/favorites'
import { getLeaguesLogos } from '@/services/logoService'
import StarButton from '@/components/favorites/StarButton'
import LocalTime from '@/components/LocalTime'
import LiveRefresher from '@/components/LiveRefresher'
import { 
  Calendar as CalendarIcon, 
  Star, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  ChevronRight
} from 'lucide-react'
import DateSelector from '@/components/matches/DateSelector'
import { getLeagueLogoUrl } from '@/utils/leagueLogo'

interface PageProps {
  searchParams: Promise<{
    date?: string;
    status?: string;
    league?: string;
    team?: string;
  }>;
}

export const revalidate = 10 // Revalidar a página a cada 10 segundos

// Lista estática de competições populares para a barra lateral
const POPULAR_LEAGUES = [
  { id: 27, name: 'Mundial', country: 'Internacional', icon: 'GL' },
  { id: 1, name: 'Premier League', country: 'Inglaterra', icon: 'GB' },
  { id: 2, name: 'Liga Portugal', country: 'Portugal', icon: 'PT' },
  { id: 3, name: 'La Liga', country: 'Espanha', icon: 'ES' },
  { id: 4, name: 'Serie A', country: 'Itália', icon: 'IT' },
  { id: 5, name: 'Bundesliga', country: 'Alemanha', icon: 'DE' },
  { id: 6, name: 'Ligue 1', country: 'França', icon: 'FR' },
  { id: 9, name: 'Série A', country: 'Brasil', icon: 'BR' },
  { id: 10, name: 'Eredivisie', country: 'Holanda', icon: 'NL' },
  { id: 18, name: 'MLS', country: 'EUA', icon: 'US' },
]

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const dateParam = params.date
  const statusParam = params.status || 'all'
  const leagueParam = params.league
  const teamParam = params.team

  // 1. Autenticação e Pontos do Utilizador
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Obter logótipos das ligas populares para a barra lateral
  const popularLeaguesWithLogos = await getLeaguesLogos(
    POPULAR_LEAGUES.map(l => ({ id: l.id, name: l.name }))
  )

  let favorites: UserFavorites = { leagues: [], teams: [], matches: [] }
  let favoriteTeamsList: Array<{ id: number; name: string; logo_url?: string }> = []

  if (user) {
    favorites = await favoritesService.getUserFavorites()

    if (favorites.teams.length > 0) {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, logo_url')
        .in('id', favorites.teams)
      if (teamsData) {
        favoriteTeamsList = teamsData
      }
    }
  }

  // Obter nomes das ligas e equipas se os filtros estiverem ativos
  let activeLeagueName = ''
  if (leagueParam) {
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('name')
      .eq('id', Number(leagueParam))
      .maybeSingle()
    activeLeagueName = leagueData?.name || `Liga #${leagueParam}`
  }

  let activeTeamName = ''
  if (teamParam) {
    const { data: teamData } = await supabase
      .from('teams')
      .select('name')
      .eq('id', Number(teamParam))
      .maybeSingle()
    activeTeamName = teamData?.name || `Equipa #${teamParam}`
  }

  // Helper para formatar data local em YYYY-MM-DD sem problemas de fuso horário
  const formatDateLocal = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // 2. Lógica de Datas
  const now = new Date()
  const todayStr = formatDateLocal(now)
  const activeDate = dateParam || todayStr

  // 3. Obter Jogos (API Bzzoiro)
  let events: BzzoiroEvent[] = []
  let errorMsg: string | null = null

  try {
    if (statusParam === 'live') {
      events = await bzzoiroService.getLiveEvents()
    } else {
      events = await bzzoiroService.getEvents({
        date_from: activeDate,
        date_to: activeDate
      })
    }
  } catch (error: any) {
    errorMsg = error.message || 'Erro ao carregar dados dos jogos.'
  }

  // 4. Filtrar por Estado (Todos, Ao Vivo, Terminados, Agendados, Favoritos) se não for o seletor principal LIVE
  if (statusParam !== 'all' && statusParam !== 'live') {
    events = events.filter((event) => {
      if (statusParam === 'finished') return event.status === 'FT'
      if (statusParam === 'scheduled') return event.status === 'NS'
      if (statusParam === 'favorites') {
        const isMatchFav = favorites.matches.includes(event.id)
        const isLeagueFav = favorites.leagues.includes(event.league.id)
        const isTeamFav = favorites.teams.includes(event.home_team.id) || favorites.teams.includes(event.away_team.id)
        return isMatchFav || isLeagueFav || isTeamFav
      }
      return true
    })
  }

  // 5. Filtrar por Liga se selecionado na Barra Lateral
  if (leagueParam) {
    events = events.filter((e) => e.league.id === Number(leagueParam))
  }

  // 5b. Filtrar por Equipa se selecionada na Barra de Pesquisa
  if (teamParam) {
    events = events.filter((e) => e.home_team.id === Number(teamParam) || e.away_team.id === Number(teamParam))
  }

  // 6. Agrupar Jogos por Liga e ordenar (Ligas favoritas do utilizador aparecem no topo!)
  const groupedEvents: Record<number, { league: BzzoiroLeague; events: BzzoiroEvent[] }> = {}
  
  events.forEach((event) => {
    const lId = event.league.id
    if (!groupedEvents[lId]) {
      groupedEvents[lId] = {
        league: event.league,
        events: []
      }
    }
    groupedEvents[lId].events.push(event)
  })

  // Ordenar os jogos de cada liga por data/hora (crescente)
  Object.values(groupedEvents).forEach((group) => {
    group.events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  })

  const sortedGroupedLeagues = Object.values(groupedEvents).sort((a, b) => {
    const aFav = favorites.leagues.includes(a.league.id) ? 1 : 0
    const bFav = favorites.leagues.includes(b.league.id) ? 1 : 0
    if (aFav !== bFav) return bFav - aFav // Favoritas primeiro

    // Obter horário do primeiro jogo de cada liga
    const aFirstGameTime = a.events.length > 0 ? new Date(a.events[0].date).getTime() : 0
    const bFirstGameTime = b.events.length > 0 ? new Date(b.events[0].date).getTime() : 0

    if (aFirstGameTime !== bFirstGameTime) {
      return aFirstGameTime - bFirstGameTime // Mais cedo primeiro
    }
    return a.league.name.localeCompare(b.league.name)
  })

  // Verificar se existem jogos ao vivo para ativar a atualização em tempo real no cliente
  const hasLiveEvents = events.some((e) => e.status === 'LIVE' || e.status === 'HT')

  // Helper para Status Badges dos jogos
  const getStatusBadge = (event: BzzoiroEvent) => {
    const { status, minute, date } = event
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block animate-ping mr-0.5" />
            <span>{minute != null ? `${minute}'` : 'AO VIVO'}</span>
          </span>
        )
      case 'HT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black">
            <span>Intervalo</span>
          </span>
        )
      case 'FT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-bold">
            <span>Terminado</span>
          </span>
        )
      default: {
        return <LocalTime utcDateString={date} />
      }
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-950 to-black text-zinc-100 flex flex-col font-sans">
      <LiveRefresher hasLiveEvents={hasLiveEvents} />
      
      {/* Background abstract glowing shapes */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main App Container */}
      <main className="z-10 flex-1 max-w-none w-full px-6 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: Sidebar de Ligas */}
        <aside className="lg:col-span-3 space-y-6 sticky top-24">
          
          {/* Olivetti Predictor Mini-Card */}
          {user ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-purple-950/20 border border-indigo-500/10 shadow-lg relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-500/20 transition-all" />
              <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulador Ativo</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Aposta e ganha pontos!</h4>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Faz prognósticos nos jogos de hoje e acumula score na classificação.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-white transition-colors"
              >
                <span>Ver as minhas apostas</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 shadow-lg text-center">
              <h4 className="text-sm font-bold text-zinc-300 mb-1.5">Previsões & Pontos</h4>
              <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                Regista-te grátis para fazer palpites, pontuar no Olivetti Score e seguir equipas.
              </p>
              <Link
                href="/login"
                className="w-full py-2.5 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-750 text-white text-xs block transition-all"
              >
                Criar Conta Grátis
              </Link>
            </div>
          )}

          {/* Competidor Favorites Title & Box */}
          {user && favorites.leagues.length > 0 && (
            <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-4 shadow">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Minhas Ligas</span>
              </h3>
              <ul className="space-y-1.5">
                {POPULAR_LEAGUES.filter(l => favorites.leagues.includes(l.id)).map((league) => (
                  <li key={league.id}>
                    <Link
                      href={`/liga/${league.id}`}
                      className="flex items-center justify-between text-xs px-2.5 py-2 rounded-lg transition-all text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                    >
                      <div className="flex items-center gap-2">
                        {popularLeaguesWithLogos[league.id] ? (
                          <img src={popularLeaguesWithLogos[league.id]} alt="" className="w-4 h-4 object-contain shrink-0" />
                        ) : (
                          <img src={getLeagueLogoUrl(league)} alt="" className="w-4 h-4 object-contain shrink-0" />
                        )}
                        <span>{league.name}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Minhas Equipas (Favorite Teams) */}
          {user && favoriteTeamsList.length > 0 && (
            <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-4 shadow">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                <span>Minhas Equipas</span>
              </h3>
              <ul className="space-y-1.5">
                {favoriteTeamsList.map((team) => (
                  <li key={team.id}>
                    <Link
                      href={`/equipa/${team.id}`}
                      className="flex items-center justify-between text-xs px-2.5 py-2 rounded-lg transition-all text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                    >
                      <div className="flex items-center gap-2">
                        {team.logo_url && team.logo_url !== 'no_logo' ? (
                          <img src={team.logo_url} alt="" className="w-4 h-4 object-contain shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded bg-zinc-950 border border-zinc-850 flex items-center justify-center text-[8px] font-black text-zinc-500 shrink-0">
                            {team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate">{team.name}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Popular Competitions List */}
          <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-4 shadow">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Competições</span>
            </h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/"
                  className={`flex items-center justify-between text-xs px-2.5 py-2 rounded-lg transition-all ${
                    !leagueParam
                      ? 'bg-indigo-500/10 text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-2'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  <span>Todas as Competições</span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                </Link>
              </li>
              {POPULAR_LEAGUES.map((league) => (
                <li key={league.id}>
                  <div className="flex items-center justify-between rounded-lg transition-all hover:bg-zinc-900/50">
                    <Link
                      href={`/liga/${league.id}`}
                      className="flex-1 flex items-center gap-2 text-xs px-2.5 py-2 transition-all text-zinc-400 hover:text-zinc-200"
                    >
                      {popularLeaguesWithLogos[league.id] ? (
                        <img src={popularLeaguesWithLogos[league.id]} alt="" className="w-4 h-4 object-contain shrink-0" />
                      ) : (
                        <img src={getLeagueLogoUrl(league)} alt="" className="w-4 h-4 object-contain shrink-0" />
                      )}
                      <span className="truncate">{league.name}</span>
                    </Link>
                    <div className="flex items-center gap-1 pr-2">
                      {user && (
                        <StarButton
                          type="league"
                          id={league.id}
                          name={league.name}
                          country={league.country}
                          isFavorited={favorites.leagues.includes(league.id)}
                          className="hover:bg-zinc-800 p-1 text-zinc-600"
                        />
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* COLUNA CENTRAL: Jogos e Filtros */}
        <section className="lg:col-span-9 space-y-6">
          
          {/* Banner de Filtro Ativo */}
          {(leagueParam || teamParam) && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-300">
                  Filtro Ativo:
                </span>
                {leagueParam && (
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-[10px] font-extrabold">
                    Liga: {activeLeagueName}
                  </span>
                )}
                {teamParam && (
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-[10px] font-extrabold">
                    Equipa: {activeTeamName}
                  </span>
                )}
              </div>
              <Link
                href="/"
                className="text-[10px] uppercase font-extrabold tracking-widest text-zinc-400 hover:text-white transition-colors"
              >
                Limpar Filtro
              </Link>
            </div>
          )}

          {/* Seletor de Estados & Seletor de Datas */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="flex p-1 bg-zinc-900/40 border border-zinc-800 rounded-2xl shadow-sm flex-1 w-full">
              <div className="flex p-0.5 bg-zinc-950 border border-zinc-850 rounded-xl w-full gap-0.5">
                <Link
                  href={`/?status=all${dateParam ? `&date=${dateParam}` : ''}${leagueParam ? `&league=${leagueParam}` : ''}`}
                  className={`flex-1 text-center px-3 py-1.5 text-xxs sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                    statusParam === 'all'
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Todos
                </Link>
                <Link
                  href={`/?status=live${leagueParam ? `&league=${leagueParam}` : ''}`}
                  className={`flex-1 text-center px-3 py-1.5 text-xxs sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                    statusParam === 'live'
                      ? 'bg-red-500/10 border border-red-500/20 text-red-400 font-extrabold shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-red-500 inline-block animate-ping" />
                  <span>Ao Vivo</span>
                </Link>
                <Link
                  href={`/?status=finished${dateParam ? `&date=${dateParam}` : ''}${leagueParam ? `&league=${leagueParam}` : ''}`}
                  className={`flex-1 text-center px-3 py-1.5 text-xxs sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                    statusParam === 'finished'
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Terminados
                </Link>
                <Link
                  href={`/?status=scheduled${dateParam ? `&date=${dateParam}` : ''}${leagueParam ? `&league=${leagueParam}` : ''}`}
                  className={`flex-1 text-center px-3 py-1.5 text-xxs sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                    statusParam === 'scheduled'
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Agendados
                </Link>
                {user && (
                  <Link
                    href={`/?status=favorites${dateParam ? `&date=${dateParam}` : ''}${leagueParam ? `&league=${leagueParam}` : ''}`}
                    className={`flex-1 text-center px-3 py-1.5 text-xxs sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                      statusParam === 'favorites'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold shadow'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Favoritos</span>
                  </Link>
                )}
              </div>
            </div>

            {statusParam !== 'live' && (
              <div className="shrink-0 w-full sm:w-auto flex justify-center sm:justify-end">
                <DateSelector
                  activeDate={activeDate}
                  statusParam={statusParam}
                  leagueParam={leagueParam}
                  teamParam={teamParam}
                  todayStr={todayStr}
                />
              </div>
            )}
          </div>

          {/* Mensagem de Erro de Ligação à API */}
          {errorMsg && (
            <div className="p-6 rounded-2xl bg-red-950/10 border border-red-900/30 text-center text-red-400 text-sm">
              <p className="font-bold">Houve um problema ao contactar o servidor de dados.</p>
              <p className="text-zinc-500 text-xs mt-1">{errorMsg}</p>
            </div>
          )}

          {/* LISTA DE JOGOS */}
          {!errorMsg && sortedGroupedLeagues.length === 0 ? (
            <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-20 text-center text-zinc-500">
              <CalendarIcon className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
              <p className="font-bold text-sm">Nenhum jogo encontrado</p>
              <p className="text-xs text-zinc-600 mt-1">
                Não existem partidas registadas de acordo com as tuas opções selecionadas.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedGroupedLeagues.map(({ league, events: leagueEvents }) => {
                const isLeagueFav = favorites.leagues.includes(league.id)
                return (
                  <div
                    key={league.id}
                    className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-2xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    {/* Cabeçalho da Liga */}
                    <div className="bg-zinc-900/50 border-b border-zinc-850 px-4 py-3 flex items-center justify-between">
                      <Link href={`/liga/${league.id}`} className="group/league-link flex items-center gap-3 hover:opacity-85 transition-opacity">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-zinc-950 overflow-hidden text-xxs font-mono font-bold text-zinc-500 shrink-0">
                          <img src={getLeagueLogoUrl({ id: league.id, name: league.name, country: league.country, logoUrl: league.logo })} alt="" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="font-extrabold text-sm text-zinc-200 group-hover/league-link:text-indigo-400 transition-colors">
                            {league.name}
                          </h3>
                          {league.country && (
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {league.country}
                            </span>
                          )}
                        </div>
                      </Link>

                      {user && (
                        <StarButton
                          type="league"
                          id={league.id}
                          name={league.name}
                          country={league.country}
                          isFavorited={isLeagueFav}
                        />
                      )}
                    </div>

                    {/* Jogos da Liga */}
                    <div className="divide-y divide-zinc-900/60">
                      {leagueEvents.map((event) => {
                        const isMatchFav = favorites.matches.includes(event.id)
                        return (
                          <div 
                            key={event.id} 
                            className="group hover:bg-zinc-900/30 transition-all duration-300 flex items-center justify-between p-4 gap-4"
                          >
                            {/* Favoritar Jogo e Hora/Status */}
                            <div className="flex items-center gap-3 min-w-[70px]">
                              {user && (
                                <StarButton
                                  type="match"
                                  id={event.id}
                                  name={`${event.home_team.name} vs ${event.away_team.name}`}
                                  isFavorited={isMatchFav}
                                />
                              )}
                              <div className="flex flex-col items-start">
                                {getStatusBadge(event)}
                              </div>
                            </div>

                            {/* Equipas e Golos */}
                            <div className="flex-1 flex items-center justify-between gap-6">
                              <div className="flex flex-col gap-2 flex-1">
                                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                                  {user && (
                                    <StarButton
                                      type="team"
                                      id={event.home_team.id}
                                      name={event.home_team.name}
                                      logoUrl={event.home_team.logo}
                                      isFavorited={favorites.teams.includes(event.home_team.id)}
                                      className="p-0.5 hover:bg-zinc-800"
                                    />
                                  )}
                                  <Link href={`/equipa/${event.home_team.id}`} className="flex min-w-0 items-center gap-2.5 hover:text-indigo-300 transition-colors">
                                    {event.home_team.logo ? (
                                      <img src={event.home_team.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                                    ) : (
                                      <div className="w-4 h-4 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-500 shrink-0 select-none">
                                        {event.home_team.name.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="truncate">{event.home_team.name}</span>
                                  </Link>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                                  {user && (
                                    <StarButton
                                      type="team"
                                      id={event.away_team.id}
                                      name={event.away_team.name}
                                      logoUrl={event.away_team.logo}
                                      isFavorited={favorites.teams.includes(event.away_team.id)}
                                      className="p-0.5 hover:bg-zinc-800"
                                    />
                                  )}
                                  <Link href={`/equipa/${event.away_team.id}`} className="flex min-w-0 items-center gap-2.5 hover:text-indigo-300 transition-colors">
                                    {event.away_team.logo ? (
                                      <img src={event.away_team.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                                    ) : (
                                      <div className="w-4 h-4 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-500 shrink-0 select-none">
                                        {event.away_team.name.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="truncate">{event.away_team.name}</span>
                                  </Link>
                                </div>
                              </div>

                              {/* Placar de Golos */}
                              {event.status !== 'NS' ? (
                                <div className="flex flex-col gap-2 font-black text-sm text-indigo-400 bg-indigo-500/5 px-2.5 py-1.5 border border-indigo-950 rounded-lg select-none text-center min-w-[32px]">
                                  <div>{event.score.home ?? '-'}</div>
                                  <div>{event.score.away ?? '-'}</div>
                                </div>
                              ) : (
                                <div className="text-zinc-600 text-xs px-2 select-none">-</div>
                              )}
                            </div>

                            {/* Prognósticos ML Indicator & Botão Ver Detalhes */}
                            <div className="flex items-center gap-4">
                              {event.predictions && (
                                <div className="hidden md:flex flex-col items-end gap-0.5 text-[9px] font-mono text-zinc-500 bg-zinc-950/40 p-1.5 border border-zinc-900 rounded-lg">
                                  <span className="text-zinc-600 font-bold uppercase tracking-wider text-[8px]">CatBoost ML:</span>
                                  <div className="flex gap-2">
                                    <span className="text-emerald-400/90 font-bold">1:{Math.round((event.predictions.home_win_prob || 0) * 100)}%</span>
                                    <span className="text-zinc-400 font-bold">X:{Math.round((event.predictions.draw_prob || 0) * 100)}%</span>
                                    <span className="text-purple-400/90 font-bold">2:{Math.round((event.predictions.away_win_prob || 0) * 100)}%</span>
                                  </div>
                                </div>
                              )}

                              <Link
                                href={`/jogo/${event.id}`}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xxs font-bold uppercase tracking-wider border border-zinc-800 bg-zinc-950/40 hover:bg-indigo-500 hover:text-white hover:border-indigo-400 text-zinc-400 transition-all select-none"
                              >
                                <span>Apostar</span>
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            </div>

                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>


      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-900/60 bg-zinc-950/30 text-center z-10 text-xs text-zinc-600">
        <p>&copy; {new Date().getFullYear()} Olivetti Score. Criado no âmbito de Projeto Integrado I.</p>
        <p className="mt-1 text-xxs text-zinc-700">Dados fornecidos em tempo real pela API Bzzoiro Sports.</p>
      </footer>
    </div>
  )
}
