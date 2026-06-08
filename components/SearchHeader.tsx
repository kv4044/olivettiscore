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
import { getFlagUrl } from '@/utils/flags'

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
  name?: string
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
    name?: string
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

  const [history, setHistory] = useState<string[]>([])

  // Carregar histórico do localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('olivettiscore_search_history')
      if (saved) {
        try {
          setHistory(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to parse search history', e)
        }
      }
    }
  }, [])

  const addToHistory = (term: string) => {
    const trimmed = term.trim()
    if (trimmed.length < 2) return
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())
      const newHistory = [trimmed, ...filtered].slice(0, 10)
      if (typeof window !== 'undefined') {
        localStorage.setItem('olivettiscore_search_history', JSON.stringify(newHistory))
      }
      return newHistory
    })
  }

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
    } else {
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
    if (query.trim()) {
      addToHistory(query)
    }
    setIsOpen(false)
    startTransition(() => {
      if (type === 'league') {
        router.push(`/liga/${id}`)
      } else if (type === 'team') {
        router.push(`/equipa/${id}`)
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
    <div ref={searchContainerRef} className="relative flex-1 max-w-md mx-4">
      {/* Barra de Pesquisa Integrada no Cabeçalho */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim().length >= 2) {
              addToHistory(query)
            }
          }}
          placeholder="Pesquisar ligas, equipas ou jogadores..."
          className="w-full h-10 pl-10 pr-16 rounded-xl border border-zinc-800/85 bg-zinc-950/20 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:bg-zinc-900/60 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all font-semibold text-xs"
        />
        <div className="absolute right-3.5 flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          ) : (
            <>

              {isOpen && (
                <button 
                  onClick={() => {
                    setIsOpen(false)
                    inputRef.current?.blur()
                  }}
                  className="p-1 rounded hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-850 bg-zinc-950/80"
                  title="Fechar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* OVERLAY DE PESQUISA (MODAL BACKDROP) */}
      {isOpen && (
        <div 
          onClick={() => {
            setIsOpen(false)
            inputRef.current?.blur()
          }}
          className="fixed top-16 bottom-0 left-0 right-0 z-40 bg-black/90 animate-in fade-in duration-200 cursor-default"
        />
      )}

      {/* PAINEL DE RESULTADOS (DROPDOWN FLUTUANTE) */}
      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
        >
          {/* Abas dos Separadores (Filtro Interno) */}
          <div className="flex border-b border-zinc-800/50 bg-zinc-950 p-1.5 gap-1 shrink-0">
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
              <div className="space-y-4">
                {history.length > 0 && (
                  <div className="space-y-2 border-b border-zinc-800/40 pb-4">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-2">
                      <span>Pesquisas Recentes</span>
                      <button
                        onClick={() => {
                          setHistory([])
                          if (typeof window !== 'undefined') {
                            localStorage.removeItem('olivettiscore_search_history')
                          }
                        }}
                        className="text-[9px] hover:text-white transition-colors cursor-pointer bg-transparent border-none outline-none"
                      >
                        Limpar tudo
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-1">
                      {history.map((item, index) => (
                        <div
                          key={index}
                          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/40 border border-zinc-850 hover:bg-zinc-800/40 hover:border-zinc-800 transition-all text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
                          onClick={() => setQuery(item)}
                        >
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{item}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const newHistory = history.filter((_, i) => i !== index)
                              setHistory(newHistory)
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('olivettiscore_search_history', JSON.stringify(newHistory))
                              }
                            }}
                            className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-center py-8 text-zinc-500 space-y-2">
                  <Sparkles className="w-8 h-8 text-indigo-500/30 mx-auto animate-pulse" />
                  <p className="text-xs font-bold">Pesquisa Instantânea Olivetti Score</p>
                  <p className="text-xxs text-zinc-650 max-w-xs mx-auto">
                    Digita pelo menos 2 letras para pesquisar campeonatos, equipas ou outros utilizadores da plataforma.
                  </p>
                </div>
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
                            {getFlagUrl(league.country) ? (
                              <img 
                                src={getFlagUrl(league.country)!} 
                                alt={league.country} 
                                className="w-7 h-5 object-cover rounded-sm shadow-sm"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center text-xxs font-mono font-bold text-zinc-500">
                                {league.country?.substring(0, 2).toUpperCase() || 'L'}
                              </div>
                            )}
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
                            <div className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-0.5">
                              {team.logo_url && team.logo_url !== 'no_logo' ? (
                                <img src={team.logo_url} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-[10px] font-black text-purple-400">
                                  {team.short_name || team.name.substring(0, 2).toUpperCase()}
                                </span>
                              )}
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
                          onClick={() => {
                            if (query.trim()) {
                              addToHistory(query)
                            }
                            setSelectedPlayerId(player.id)
                          }}
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/20 border border-zinc-850 hover:bg-indigo-500/5 hover:border-indigo-950 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-center text-xxs font-mono font-bold text-zinc-500">
                              #{player.rank}
                            </div>
                            <div>
                              <p className="text-xs font-extrabold text-zinc-200 group-hover:text-indigo-300">
                                {player.name || player.email}
                              </p>
                              <p className="text-[9px] text-zinc-550 font-semibold mt-0.5">Pontuação: <span className="text-indigo-400 font-bold">{player.points} PTS</span></p>
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
        </div>
      )}

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
                  <h4 className="text-sm font-extrabold text-zinc-100">
                    {playerDetails ? (playerDetails.profile.name || playerDetails.profile.email) : 'Perfil de Olivetti Score'}
                  </h4>
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
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-900 text-zinc-650 text-[10px] font-bold">
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
  )
}
