'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  X, 
  Users, 
  Trophy, 
  Shield, 
  Loader2, 
  Calendar, 
  CheckCircle, 
  Clock, 
  ChevronRight,
  Sparkles,
  Award
} from 'lucide-react'

interface LeagueResult {
  id: number
  name: string
  country?: string
  logo_url?: string
}

interface TeamResult {
  id: number
  name: string
  short_name?: string
  logo_url?: string
}

interface PlayerResult {
  id: string
  email: string
  points: number
  rank: number
}

interface SearchResults {
  leagues: LeagueResult[]
  teams: TeamResult[]
  players: PlayerResult[]
}

interface PlayerDetails {
  profile: {
    email: string
    points: number
    rank: number
    createdAt: string
  }
  predictions: Array<{
    id: string
    matchId: number
    homeTeam: string
    awayTeam: string
    homeLogo?: string
    awayLogo?: string
    status: string
    scoreHome: number | null
    scoreAway: number | null
    predictedOutcome: string
    predictedOutcomeText: string
    isCalculated: boolean
    pointsAwarded: number
    date: string
  }>
}

export default function SearchHeader() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'leagues' | 'teams' | 'players'>('all')
  const [results, setResults] = useState<SearchResults>({ leagues: [], teams: [], players: [] })
  const [isLoading, setIsLoading] = useState(false)
  
  // Detalhes do jogador selecionado para o Sub-Modal
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [playerDetails, setPlayerDetails] = useState<PlayerDetails | null>(null)
  const [isPlayerLoading, setIsPlayerLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const inputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // 1. Escuta do atalho global Ctrl + K / Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        if (selectedPlayerId) {
          setSelectedPlayerId(null)
          setPlayerDetails(null)
        } else {
          setIsOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPlayerId])

  // Foca o input de pesquisa quando o painel abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      document.body.style.overflow = 'hidden' // Impede scroll no background
    } else {
      document.body.style.overflow = ''
      setQuery('')
      setResults({ leagues: [], teams: [], players: [] })
      setSelectedPlayerId(null)
      setPlayerDetails(null)
    }
  }, [isOpen])

  // 2. Procurar dados via API ao digitar (com debounce simples)
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ leagues: [], teams: [], players: [] })
      setIsLoading(false)
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch (err) {
        console.error('Erro ao pesquisar:', err)
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  // 3. Obter detalhes adicionais de um jogador selecionado (Server-Side resolvido)
  useEffect(() => {
    if (!selectedPlayerId) return

    const fetchPlayerDetails = async () => {
      setIsPlayerLoading(true)
      try {
        const res = await fetch(`/api/players/${selectedPlayerId}`)
        if (res.ok) {
          const data = await res.json()
          setPlayerDetails(data)
        }
      } catch (err) {
        console.error('Erro ao carregar perfil do jogador:', err)
      } finally {
        setIsPlayerLoading(false)
      }
    }

    fetchPlayerDetails()
  }, [selectedPlayerId])

  const handleResultClick = (type: 'league' | 'team', id: number) => {
    setIsOpen(false)
    startTransition(() => {
      if (type === 'league') {
        router.push(`/?league=${id}`)
      } else if (type === 'team') {
        router.push(`/?team=${id}`)
      }
    })
  }

  // Filtragem local baseada na tab ativa
  const filteredResults = {
    leagues: activeTab === 'all' || activeTab === 'leagues' ? results.leagues : [],
    teams: activeTab === 'all' || activeTab === 'teams' ? results.teams : [],
    players: activeTab === 'all' || activeTab === 'players' ? results.players : [],
  }

  const hasAnyResults = 
    filteredResults.leagues.length > 0 || 
    filteredResults.teams.length > 0 || 
    filteredResults.players.length > 0

  return (
    <>
      {/* Botão de ativação visual no header */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex-1 max-w-md mx-4 h-10 px-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-between group cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
      >
        <div className="flex items-center gap-2.5">
          <Search className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
          <span className="text-xs font-semibold">Pesquisar ligas, equipas ou jogadores...</span>
        </div>
        <kbd className="hidden md:inline-flex h-5 select-none items-center gap-0.5 rounded border border-zinc-800 bg-zinc-950/80 px-1.5 font-mono text-[10px] font-bold text-zinc-500">
          <span className="text-[9px]">⌘</span>K
        </kbd>
      </button>

      {/* OVERLAY DE PESQUISA (MODAL) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 backdrop-blur-md bg-zinc-950/70 animate-in fade-in duration-200">
          
          {/* Caixa de Pesquisa Principal */}
          <div 
            ref={searchContainerRef}
            className="w-full max-w-2xl bg-zinc-900/90 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
          >
            
            {/* Input e Ícone */}
            <div className="flex items-center px-4 py-3.5 border-b border-zinc-800 bg-zinc-950/30">
              <Search className="w-5 h-5 text-indigo-400 mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digita uma liga (ex: La Liga), equipa (ex: Real Madrid) ou jogador..."
                className="w-full bg-transparent border-0 text-sm font-semibold text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-0"
              />
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0 ml-2" />
              ) : query ? (
                <button 
                  onClick={() => setQuery('')}
                  className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-xxs font-black text-zinc-500 border border-zinc-800 rounded bg-zinc-950 px-2 py-1 hover:text-white transition-all cursor-pointer"
                >
                  ESC
                </button>
              )}
            </div>

            {/* Abas dos Separadores (Filtro Interno) */}
            <div className="flex border-b border-zinc-800/50 bg-zinc-950/10 p-1.5 gap-1 shrink-0">
              {(['all', 'leagues', 'teams', 'players'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xxs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab 
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab === 'all' ? 'Tudo' : tab === 'leagues' ? 'Ligas' : tab === 'teams' ? 'Equipas' : 'Jogadores'}
                </button>
              ))}
            </div>

            {/* ZONA DE RESULTADOS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
              
              {/* Se não digitou nada ou menos que 2 letras */}
              {query.trim().length < 2 && (
                <div className="text-center py-12 text-zinc-500 space-y-2">
                  <Sparkles className="w-8 h-8 text-indigo-500/30 mx-auto animate-pulse" />
                  <p className="text-xs font-bold">Pesquisa Instantânea Olivetti Score</p>
                  <p className="text-xxs text-zinc-600 max-w-xs mx-auto">
                    Digita pelo menos 2 letras para pesquisar campeonatos, equipas ou outros utilizadores da plataforma.
                  </p>
                </div>
              )}

              {/* Se digitou e não obteve resultados */}
              {query.trim().length >= 2 && !isLoading && !hasAnyResults && (
                <div className="text-center py-12 text-zinc-500">
                  <p className="text-xs font-bold">Nenhum resultado encontrado</p>
                  <p className="text-xxs text-zinc-600 mt-1">
                    Experimenta palavras alternativas ou verifica se está escrito corretamente.
                  </p>
                </div>
              )}

              {/* Resultados Ocupados/Renderizados */}
              {query.trim().length >= 2 && hasAnyResults && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  
                  {/* Categoria Ligas */}
                  {filteredResults.leagues.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-2 flex items-center gap-1.5">
                        <Trophy className="w-3 h-3 text-indigo-400" />
                        <span>Ligas / Competições ({filteredResults.leagues.length})</span>
                      </h3>
                      <div className="space-y-1">
                        {filteredResults.leagues.map((league) => (
                          <div
                            key={league.id}
                            onClick={() => handleResultClick('league', league.id)}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/20 border border-zinc-850 hover:bg-zinc-800/40 hover:border-zinc-850 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center text-xxs font-mono font-bold text-zinc-500">
                                {league.country?.substring(0, 2).toUpperCase() || 'L'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-zinc-200 group-hover:text-white">{league.name}</p>
                                {league.country && <p className="text-[9px] text-zinc-500 font-semibold mt-0.5">{league.country}</p>}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categoria Equipas */}
                  {filteredResults.teams.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-2 flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-purple-400" />
                        <span>Equipas ({filteredResults.teams.length})</span>
                      </h3>
                      <div className="space-y-1">
                        {filteredResults.teams.map((team) => (
                          <div
                            key={team.id}
                            onClick={() => handleResultClick('team', team.id)}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/20 border border-zinc-850 hover:bg-zinc-800/40 hover:border-zinc-850 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-purple-500/5 border border-purple-950 flex items-center justify-center text-[10px] font-black text-purple-400">
                                {team.short_name || team.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-zinc-200 group-hover:text-white">{team.name}</p>
                                {team.short_name && <p className="text-[9px] text-zinc-500 font-semibold mt-0.5">{team.short_name}</p>}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categoria Jogadores */}
                  {filteredResults.players.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-2 flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-amber-400" />
                        <span>Jogadores da Plataforma ({filteredResults.players.length})</span>
                      </h3>
                      <div className="space-y-1">
                        {filteredResults.players.map((player) => (
                          <div
                            key={player.id}
                            onClick={() => setSelectedPlayerId(player.id)}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/20 border border-zinc-850 hover:bg-indigo-500/5 hover:border-indigo-950 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-center text-xxs font-mono font-bold text-zinc-500">
                                #{player.rank}
                              </div>
                              <div>
                                <p className="text-xs font-extrabold text-zinc-200 group-hover:text-indigo-300">{player.email}</p>
                                <p className="text-[9px] text-zinc-500 font-semibold mt-0.5">Pontuação: <span className="text-indigo-400 font-bold">{player.points} PTS</span></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400/70 group-hover:text-indigo-400 transition-all">
                              <span>Ver Perfil</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
            
            {/* Rodapé informativo */}
            <div className="border-t border-zinc-800 px-4 py-2 text-xxs text-zinc-650 bg-zinc-950/40 flex items-center justify-between shrink-0 select-none">
              <span>Carrega em <span className="font-bold text-zinc-400">Esc</span> para fechar</span>
              <span>Classificação atualizada em tempo real</span>
            </div>

          </div>

          {/* SUB-MODAL: PERFIL PÚBLICO E PROGNÓSTICOS DO JOGADOR SELECIONADO */}
          {selectedPlayerId && (
            <div className="fixed inset-0 z-55 flex items-center justify-center p-4 backdrop-blur-md bg-zinc-950/80 animate-in fade-in duration-200">
              <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                
                {/* Cabeçalho */}
                <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/25">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-zinc-100">Perfil de Olivetti Score</h4>
                      <p className="text-[10px] text-zinc-500">Detalhes de desempenho e palpites públicos</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPlayerId(null)
                      setPlayerDetails(null)
                    }}
                    className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Corpo do Detalhe (Loading ou Resolvido) */}
                {isPlayerLoading ? (
                  <div className="py-20 text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                    <p className="text-xs text-zinc-550">A ligar ao Supabase...</p>
                  </div>
                ) : playerDetails ? (
                  <div className="space-y-6">
                    
                    {/* Cartão de Resumo */}
                    <div className="grid grid-cols-2 gap-4">
                      
                      <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-850 flex flex-col justify-between">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Pontuação Geral</span>
                        <div className="flex items-baseline gap-1.5 mt-2">
                          <span className="text-2xl font-black text-indigo-400">{playerDetails.profile.points}</span>
                          <span className="text-[9px] font-bold text-zinc-600">PTS</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-850 flex flex-col justify-between">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Classificação (Rank)</span>
                        <div className="flex items-baseline gap-1.5 mt-2">
                          <span className="text-2xl font-black text-amber-400">#{playerDetails.profile.rank}</span>
                          <span className="text-[9px] font-bold text-zinc-650">LUGAR</span>
                        </div>
                      </div>

                      <div className="col-span-2 p-3.5 rounded-2xl bg-zinc-950/30 border border-zinc-850/60 flex items-center justify-between text-xxs text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                          <span>Jogador desde:</span>
                        </div>
                        <span className="font-semibold text-zinc-300">
                          {new Date(playerDetails.profile.createdAt).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                    </div>

                    {/* Histórico de Palpites */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black text-zinc-550 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Prognósticos Recentes (Últimos 5)</span>
                      </h5>

                      {playerDetails.predictions.length === 0 ? (
                        <div className="py-6 text-center text-zinc-550 text-xxs border border-dashed border-zinc-800 rounded-2xl">
                          Este jogador ainda não efetuou palpites.
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {playerDetails.predictions.map((pred) => (
                            <div
                              key={pred.id}
                              className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-850/70 flex flex-col gap-1.5 hover:border-zinc-800 transition-colors"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 font-bold text-zinc-300">
                                  {pred.homeLogo && <img src={pred.homeLogo} alt="" className="w-3.5 h-3.5 object-contain" />}
                                  <span className="truncate max-w-[120px]">{pred.homeTeam}</span>
                                  <span className="text-zinc-650 font-normal text-xxs">vs</span>
                                  {pred.awayLogo && <img src={pred.awayLogo} alt="" className="w-3.5 h-3.5 object-contain" />}
                                  <span className="truncate max-w-[120px]">{pred.awayTeam}</span>
                                </div>
                                {pred.status !== 'NS' && pred.scoreHome !== null ? (
                                  <span className="font-mono text-zinc-400 font-extrabold bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-850 text-xxs">
                                    {pred.scoreHome} - {pred.scoreAway}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-zinc-600 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-900 font-semibold uppercase tracking-wider">NS</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between border-t border-zinc-850/30 pt-1.5 text-xxs">
                                <span className="text-zinc-550">
                                  Aposta: <span className="text-indigo-400 font-bold">{pred.predictedOutcomeText}</span>
                                </span>
                                {pred.isCalculated ? (
                                  pred.pointsAwarded > 0 ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black">
                                      <CheckCircle className="w-2.5 h-2.5" />
                                      <span>+5 PTS</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-900 text-zinc-600 text-[10px] font-bold">
                                      <span>0 PTS</span>
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[10px] font-black animate-pulse">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>Pendente</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="py-20 text-center text-red-400 text-xs">
                    Erro ao carregar detalhes públicos. Tenta novamente.
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      )}
    </>
  )
}
