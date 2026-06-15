'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Info,
  BarChart3,
  Users,
  Award,
  ShieldAlert,
  Sun,
  Wind,
  CloudRain,
  Trophy,
  MapPin,
  Gavel,
  Building2,
  TrendingUp,
} from 'lucide-react'
import PredictionWidget from './PredictionWidget'
import BetWidget from './BetWidget'

interface MatchTabsProps {
  event: any
  userPrediction: any
  isUserLoggedIn: boolean
  matchId: number
  venue: any | null
  referee: any | null
  stats: any | null
  lineups: any | null
  standings: any | null
  incidents?: any | null
  odds?: any
  userPoints?: number
}

export default function MatchTabs({
  event,
  userPrediction,
  isUserLoggedIn,
  matchId,
  venue,
  referee,
  stats,
  lineups,
  standings,
  incidents,
  odds,
  userPoints = 0,
}: MatchTabsProps) {
  const [activeTab, setActiveTab] = useState<
    'info' | 'prediction' | 'bet' | 'stats' | 'lineups' | 'standings'
  >('info')

  // Descodificar prognóstico/aposta anterior
  let parsedPredictionOutcome: '1' | 'X' | '2' | null = null
  let parsedBetAmount: number = 0
  let parsedBetOdd: number = 1.0
  let isBetPrediction = false

  if (userPrediction && userPrediction.predicted_outcome) {
    if (userPrediction.predicted_outcome.includes(':bet=')) {
      isBetPrediction = true
      const parts = userPrediction.predicted_outcome.split(':')
      parsedPredictionOutcome = parts[0]
      const betPart = parts.find((p: string) => p.startsWith('bet='))
      if (betPart) parsedBetAmount = Number(betPart.split('=')[1]) || 0
      const oddPart = parts.find((p: string) => p.startsWith('odd='))
      if (oddPart) parsedBetOdd = Number(oddPart.split('=')[1]) || 1.0
    } else {
      parsedPredictionOutcome = userPrediction.predicted_outcome
    }
  }

  const isMatchStarted = event.status !== 'NS'

  // ── Helpers ────────────────────────────────────────────────────────────
  const getWeatherIcon = (description: string | null) => {
    const desc = description?.toLowerCase() || ''
    if (desc.includes('rain') || desc.includes('chuva'))
      return <CloudRain className="w-5 h-5 text-indigo-400" />
    if (desc.includes('wind') || desc.includes('vento'))
      return <Wind className="w-5 h-5 text-zinc-400" />
    return <Sun className="w-5 h-5 text-amber-400" />
  }

  // ML predictions
  const homeProb = event.predictions?.home_win_prob || 0
  const drawProb = event.predictions?.draw_prob || 0
  const awayProb = event.predictions?.away_win_prob || 0
  const hasPredictions = homeProb > 0 || drawProb > 0 || awayProb > 0

  // Stats helpers
  const homeStats = stats?.stats?.home
  const awayStats = stats?.stats?.away
  const hasStats = homeStats && awayStats

  // Lineups helpers
  const homeLineup = lineups?.lineups?.home
  const awayLineup = lineups?.lineups?.away
  const hasLineups = homeLineup && awayLineup

  // Standings helpers
  const standingsRows = standings?.standings || []
  const hasStandings = standingsRows.length > 0

  // Incidents helpers
  const incidentsList = incidents?.incidents || []
  const timelineEvents = incidentsList.filter((i: any) =>
    i.type === 'goal' ||
    i.type === 'card' ||
    i.type === 'substitution' ||
    i.type === 'varDecision'
  )
  const sortedEvents = [...timelineEvents].sort((a: any, b: any) => a.minute - b.minute)

  // ── Stat bar component ─────────────────────────────────────────────────
  const StatBar = ({
    label,
    homeVal,
    awayVal,
    suffix = '',
    isPercentage = false,
  }: {
    label: string
    homeVal: number
    awayVal: number
    suffix?: string
    isPercentage?: boolean
  }) => {
    const total = homeVal + awayVal || 1
    const homePct = isPercentage ? homeVal : (homeVal / total) * 100
    const awayPct = isPercentage ? awayVal : (awayVal / total) * 100
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-zinc-200">
            {homeVal}
            {suffix}
          </span>
          <span className="text-zinc-500 uppercase tracking-wider text-[10px]">
            {label}
          </span>
          <span className="text-zinc-200">
            {awayVal}
            {suffix}
          </span>
        </div>
        <div className="flex gap-1 h-2">
          <div className="flex-1 bg-zinc-900 rounded-full overflow-hidden flex justify-end">
            <div
              className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${homePct}%` }}
            />
          </div>
          <div className="flex-1 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-400 to-purple-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${awayPct}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Tab button helper ──────────────────────────────────────────────────
  const TabBtn = ({
    id,
    icon,
    label,
  }: {
    id: typeof activeTab
    icon: React.ReactNode
    label: string
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
        activeTab === id
          ? id === 'prediction'
            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-900/30 shadow'
            : 'bg-zinc-800 text-white shadow'
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ── Tab bar ────────────────────────────────────────────────── */}
      <div className="flex border-b border-zinc-800 bg-zinc-950/40 p-1.5 rounded-xl gap-1 overflow-x-auto">
        <TabBtn id="info" icon={<Info className="w-3.5 h-3.5" />} label="Ficha / ML" />
        <TabBtn
          id="prediction"
          icon={<Award className="w-3.5 h-3.5" />}
          label="Prognósticos"
        />
        <TabBtn
          id="bet"
          icon={<TrendingUp className="w-3.5 h-3.5 text-amber-500" />}
          label="Aposta de Pontos"
        />
        <TabBtn
          id="stats"
          icon={<BarChart3 className="w-3.5 h-3.5" />}
          label="Estatísticas"
        />
        <TabBtn id="lineups" icon={<Users className="w-3.5 h-3.5" />} label="Plantéis" />
        <TabBtn
          id="standings"
          icon={<Trophy className="w-3.5 h-3.5" />}
          label="Classificação"
        />
      </div>

      {/* ── Tab content ────────────────────────────────────────────── */}
      <div className="min-h-[300px]">
        {/* ═══════════════════════════════════════════════════════════
            ABA 1 — FICHA DE JOGO, ML, ESTÁDIO & ÁRBITRO
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'info' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* ── Previsões CatBoost ML ─────────────────────────── */}
            <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow">
              <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-6 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Previsões da Inteligência Artificial (CatBoost)</span>
              </h4>

              {hasPredictions ? (
                <div className="space-y-5">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Probabilidades calculadas pelo modelo de Machine Learning treinado
                    com os históricos de ambas as equipas.
                  </p>
                  <div className="space-y-3">
                    {/* Casa */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300">
                          Vitória de {event.home_team.name}
                        </span>
                        <span className="text-emerald-400">
                          {Math.round(homeProb * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-900">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${homeProb * 100}%` }}
                        />
                      </div>
                    </div>
                    {/* Empate */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300">Empate</span>
                        <span className="text-zinc-400">
                          {Math.round(drawProb * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-900">
                        <div
                          className="bg-zinc-700 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${drawProb * 100}%` }}
                        />
                      </div>
                    </div>
                    {/* Fora */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-300">
                          Vitória de {event.away_team.name}
                        </span>
                        <span className="text-purple-400">
                          {Math.round(awayProb * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-900">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-purple-400 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${awayProb * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  Sem previsões de Machine Learning disponíveis para este jogo.
                </div>
              )}
            </div>

            {/* ── Grid: Estádio · Árbitro · Clima · Campo ──────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estádio */}
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow">
                <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>Estádio</span>
                </h4>
                {venue ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs border-b border-zinc-850 pb-2">
                      <span className="text-zinc-500">Nome:</span>
                      <span className="font-bold text-zinc-200">{venue.name}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-zinc-850 pb-2">
                      <span className="text-zinc-500">Cidade:</span>
                      <span className="font-semibold text-zinc-300">
                        {venue.city}, {venue.country}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-zinc-850 pb-2">
                      <span className="text-zinc-500">Capacidade:</span>
                      <span className="font-bold text-indigo-400">
                        {venue.capacity
                          ? venue.capacity.toLocaleString('pt-PT')
                          : 'N/A'}{' '}
                        lugares
                      </span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-zinc-850 pb-2">
                      <span className="text-zinc-500">Dimensões do Relvado:</span>
                      <span className="font-semibold text-zinc-300">
                        {venue.pitch_length_m && venue.pitch_width_m
                          ? `${venue.pitch_length_m}m × ${venue.pitch_width_m}m`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Ano de Construção:</span>
                      <span className="font-semibold text-zinc-300">
                        {venue.built_year || 'N/A'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Dados do estádio não disponíveis.
                  </p>
                )}
              </div>

              {/* Árbitro */}
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow">
                <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-4 flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-amber-400" />
                  <span>Árbitro</span>
                </h4>
                {referee ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs border-b border-zinc-850 pb-2">
                      <span className="text-zinc-500">Nome:</span>
                      <span className="font-bold text-zinc-200">{referee.name}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-zinc-850 pb-2">
                      <span className="text-zinc-500">Nacionalidade:</span>
                      <span className="font-semibold text-zinc-300">
                        {referee.country || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-zinc-850 pb-2">
                      <span className="text-zinc-500">Jogos Dirigidos (Carreira):</span>
                      <span className="font-bold text-zinc-200">
                        {referee.career_games ?? 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-zinc-850 pb-2">
                      <span className="text-zinc-500">Méd. Amarelos / Jogo:</span>
                      <span className="font-bold text-amber-400">
                        {referee.avg_yellow_per_match ?? 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-zinc-850 pb-2">
                      <span className="text-zinc-500">Méd. Vermelhos / Jogo:</span>
                      <span className="font-bold text-red-400">
                        {referee.avg_red_per_match ?? 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Méd. Golos / Jogo:</span>
                      <span className="font-bold text-emerald-400">
                        {referee.avg_goals_per_match ?? 'N/A'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Dados do árbitro não disponíveis.
                  </p>
                )}
              </div>

              {/* Condições Atmosféricas */}
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow">
                <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-4 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Condições Atmosféricas</span>
                </h4>
                {event.weather ? (
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850">
                      {getWeatherIcon(event.weather.description)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-200 capitalize">
                        {event.weather.description || 'N/A'}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Temperatura:{' '}
                        <span className="font-semibold text-zinc-300">
                          {event.weather.temperature_c ?? 'N/A'}°C
                        </span>{' '}
                        · Vento:{' '}
                        <span className="font-semibold text-zinc-300">
                          {event.weather.wind_speed ?? 'N/A'} km/h
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Dados do tempo não disponíveis para esta partida.
                  </p>
                )}
              </div>

              {/* Informações de Campo */}
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow">
                <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Informações de Campo</span>
                </h4>
                <div className="space-y-3.5">
                  <div className="flex justify-between text-xs border-b border-zinc-850 pb-2">
                    <span className="text-zinc-500">Estado do Relvado:</span>
                    <span className="font-semibold text-zinc-300">
                      {event.pitch_condition === 1
                        ? 'Excelente'
                        : event.pitch_condition === 2
                          ? 'Bom'
                          : 'Regular/Indisponível'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-zinc-850 pb-2">
                    <span className="text-zinc-500">Espetadores:</span>
                    <span className="font-semibold text-zinc-300">
                      {event.attendance
                        ? event.attendance.toLocaleString('pt-PT')
                        : 'Não revelado'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Derby Local:</span>
                    <span className="font-semibold text-zinc-300">
                      {event.is_local_derby ? 'Sim' : 'Não'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            ABA 2 — SIMULADOR DE PROGNÓSTICOS
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'prediction' && (
          <div className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-300">
            {isUserLoggedIn ? (
              <PredictionWidget
                matchId={matchId}
                initialPrediction={parsedPredictionOutcome}
                isMatchStarted={isMatchStarted}
                homeTeamName={event.home_team.name}
                awayTeamName={event.away_team.name}
                isCalculated={
                  userPrediction ? userPrediction.is_calculated : false
                }
                pointsAwarded={
                  userPrediction ? userPrediction.points_awarded : 0
                }
                odds={odds}
              />
            ) : (
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 shadow-xl text-center max-w-md w-full">
                <ShieldAlert className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-zinc-200">
                  Sessão Necessária
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Precisas de estar autenticado para submeter prognósticos e
                  ganhar pontos Olivetti Score.
                </p>
                <div className="mt-6">
                  <Link
                    href="/login"
                    className="py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs block transition-all"
                  >
                    Fazer Login / Criar Conta
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            ABA 2.5 — APOSTA DE PONTOS
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'bet' && (
          <div className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-300">
            {isUserLoggedIn ? (
              <BetWidget
                matchId={matchId}
                homeTeamName={event.home_team.name}
                awayTeamName={event.away_team.name}
                isMatchStarted={isMatchStarted}
                odds={odds}
                userPoints={userPoints}
                initialOutcome={parsedPredictionOutcome}
                initialBetAmount={parsedBetAmount}
                initialBetOdd={parsedBetOdd}
                isCalculated={
                  userPrediction ? userPrediction.is_calculated : false
                }
                pointsAwarded={
                  userPrediction ? userPrediction.points_awarded : 0
                }
              />
            ) : (
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 shadow-xl text-center max-w-md w-full">
                <ShieldAlert className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-zinc-200">
                  Sessão Necessária
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Precisas de estar autenticado para realizar apostas de pontos
                  e multiplicar os teus ganhos.
                </p>
                <div className="mt-6">
                  <Link
                    href="/login"
                    className="py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs block transition-all"
                  >
                    Fazer Login / Criar Conta
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            ABA 3 — ESTATÍSTICAS DO JOGO
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Cronologia / Eventos do Jogo */}
            {sortedEvents.length > 0 && (
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow space-y-6">
                <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-300 border-b border-zinc-850 pb-3 flex items-center gap-2">
                  <span className="text-indigo-400">⏱</span>
                  <span>Cronologia do Jogo</span>
                </h4>
                
                <div className="relative border-l border-zinc-800 md:border-l-0 md:before:absolute md:before:left-1/2 md:before:top-0 md:before:bottom-0 md:before:w-[1px] md:before:bg-zinc-850 space-y-6 py-4">
                  {sortedEvents.map((evt: any, idx: number) => {
                    const isHome = evt.is_home
                    const eventTime = `${evt.minute}'${evt.added_time ? `+${evt.added_time}` : ''}`
                    
                    let icon = null
                    let content = null
                    
                    if (evt.type === 'goal') {
                      icon = <span className="text-xs">⚽</span>
                      content = (
                        <div>
                          <span className="font-extrabold text-zinc-100">{evt.player}</span>
                          {evt.goal_type === 'penalty' && <span className="text-[10px] text-emerald-400 font-bold ml-1.5">(Pen.)</span>}
                          {evt.goal_type === 'own' && <span className="text-[10px] text-red-400 font-bold ml-1.5">(P.B.)</span>}
                          {evt.assist && (
                            <span className="block text-[10px] text-zinc-500 font-medium mt-0.5">
                              Assistência: {evt.assist}
                            </span>
                          )}
                        </div>
                      )
                    } else if (evt.type === 'card') {
                      const isRed = evt.card_type === 'red' || evt.card_type === 'yellow_red'
                      icon = <div className={`w-2.5 h-3.5 rounded-[2px] ${isRed ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                      content = (
                        <div>
                          <span className="font-bold text-zinc-200">{evt.player}</span>
                          <span className={`block text-[10px] uppercase font-black mt-0.5 ${isRed ? 'text-red-400' : 'text-amber-400'}`}>
                            {evt.card_type === 'yellow_red' ? 'Duplo Amarelo' : isRed ? 'Cartão Vermelho' : 'Cartão Amarelo'}
                          </span>
                        </div>
                      )
                    } else if (evt.type === 'substitution') {
                      icon = <span className="text-zinc-400 text-xs">🔄</span>
                      content = (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                            <span>▲</span> <span>{evt.player_in}</span>
                          </div>
                          <div className="flex items-center gap-1 text-red-400/80 text-xs">
                            <span>▼</span> <span>{evt.player_out}</span>
                          </div>
                        </div>
                      )
                    } else if (evt.type === 'varDecision') {
                      icon = <span className="text-indigo-400 text-xs">🖥️</span>
                      content = (
                        <div>
                          <span className="font-semibold text-zinc-300">{evt.player || 'Decisão VAR'}</span>
                          <span className="block text-[10px] text-zinc-500 capitalize mt-0.5">
                            VAR: {evt.decision === 'cardUpgrade' ? 'Revisão de Cartão' : evt.decision || 'Análise'}
                          </span>
                        </div>
                      )
                    }

                    return (
                      <div key={idx} className="relative grid grid-cols-1 md:grid-cols-12 items-center gap-4 pl-6 md:pl-0">
                        
                        {/* Mobile Indicator / Dot */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800">
                          <span className="text-[10px] font-mono font-bold text-zinc-400">{eventTime}</span>
                        </div>

                        {/* Home Event Column (Desktop only) */}
                        <div className={`hidden md:block col-span-5 text-right ${isHome ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                          {isHome && (
                            <div className="inline-flex items-center justify-end gap-3 max-w-full">
                              <div className="text-right">{content}</div>
                              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-center shadow">
                                {icon}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Central Time Badge (Desktop only) */}
                        <div className="hidden md:flex col-span-2 justify-center z-10">
                          <div className="px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-850 text-[10px] font-black font-mono text-zinc-400 shadow">
                            {eventTime}
                          </div>
                        </div>

                        {/* Away Event Column (Desktop only) */}
                        <div className={`hidden md:block col-span-5 text-left ${!isHome ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                          {!isHome && (
                            <div className="inline-flex items-center justify-start gap-3 max-w-full">
                              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-center shadow">
                                {icon}
                              </div>
                              <div className="text-left">{content}</div>
                            </div>
                          )}
                        </div>

                        {/* Mobile Layout */}
                        <div className="md:hidden flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow">
                            {icon}
                          </div>
                          <div>
                            {content}
                            <span className="block text-[9px] uppercase font-bold text-zinc-600 mt-0.5">
                              {isHome ? event.home_team.name : event.away_team.name}
                            </span>
                          </div>
                        </div>

                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Estatísticas Detalhadas */}
            {hasStats ? (
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow space-y-6">
                {/* Cabeçalho equipas */}
                <div className="flex items-center justify-between text-xs font-extrabold text-zinc-300 border-b border-zinc-850 pb-3">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-indigo-500 to-indigo-400" />
                    {event.home_team.name}
                  </span>
                  <span className="text-zinc-500 uppercase tracking-widest text-[10px]">
                    Estatísticas
                  </span>
                  <span className="flex items-center gap-2">
                    {event.away_team.name}
                    <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-purple-400 to-purple-600" />
                  </span>
                </div>

                {/* Barras comparativas */}
                <div className="space-y-5">
                  {homeStats.possession != null && awayStats.possession != null && (
                    <StatBar
                      label="Posse de Bola"
                      homeVal={homeStats.possession}
                      awayVal={awayStats.possession}
                      suffix="%"
                      isPercentage
                    />
                  )}
                  {homeStats.total_shots != null && (
                    <StatBar
                      label="Remates Totais"
                      homeVal={homeStats.total_shots}
                      awayVal={awayStats.total_shots ?? 0}
                    />
                  )}
                  {homeStats.shots_on_target != null && (
                    <StatBar
                      label="Remates à Baliza"
                      homeVal={homeStats.shots_on_target}
                      awayVal={awayStats.shots_on_target ?? 0}
                    />
                  )}
                  {homeStats.corners != null && (
                    <StatBar
                      label="Cantos"
                      homeVal={homeStats.corners}
                      awayVal={awayStats.corners ?? 0}
                    />
                  )}
                  {homeStats.fouls != null && (
                    <StatBar
                      label="Faltas"
                      homeVal={homeStats.fouls}
                      awayVal={awayStats.fouls ?? 0}
                    />
                  )}
                  {homeStats.yellow_cards != null && (
                    <StatBar
                      label="Cartões Amarelos"
                      homeVal={homeStats.yellow_cards}
                      awayVal={awayStats.yellow_cards ?? 0}
                    />
                  )}
                  {homeStats.red_cards != null && (
                    <StatBar
                      label="Cartões Vermelhos"
                      homeVal={homeStats.red_cards}
                      awayVal={awayStats.red_cards ?? 0}
                    />
                  )}
                  {homeStats.offsides != null && (
                    <StatBar
                      label="Fora-de-Jogo"
                      homeVal={homeStats.offsides}
                      awayVal={awayStats.offsides ?? 0}
                    />
                  )}
                  {homeStats.passes != null && (
                    <StatBar
                      label="Passes"
                      homeVal={homeStats.passes}
                      awayVal={awayStats.passes ?? 0}
                    />
                  )}
                  {homeStats.tackles != null && (
                    <StatBar
                      label="Desarmes"
                      homeVal={homeStats.tackles}
                      awayVal={awayStats.tackles ?? 0}
                    />
                  )}
                  {homeStats.clearances != null && (
                    <StatBar
                      label="Cortes"
                      homeVal={homeStats.clearances}
                      awayVal={awayStats.clearances ?? 0}
                    />
                  )}
                </div>
              </div>
            ) : (
              sortedEvents.length === 0 && (
                <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 w-full">
                  <BarChart3 className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                  <h4 className="text-sm font-bold text-zinc-300">
                    Estatísticas Indisponíveis
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Posse de bola, remates, cantos e faltas serão carregados em
                    tempo real assim que o jogo começar e a API disponibilizar os
                    dados.
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            ABA 4 — PLANTÉIS (LINEUPS)
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'lineups' && (
          <div className="animate-in fade-in duration-300">
            {hasLineups ? (
              <div className="space-y-6">
                {/* Badge de estado */}
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full border ${
                      lineups.lineup_status === 'confirmed'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}
                  >
                    {lineups.lineup_status === 'confirmed'
                      ? '✓ Equipas Confirmadas'
                      : '⏳ Equipas Previstas (IA)'}
                  </span>
                </div>

                {/* Grid das duas equipas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Equipa da Casa */}
                  <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 shadow">
                    <div className="flex items-center justify-between mb-4 border-b border-zinc-850 pb-3">
                      <h4 className="text-xs font-extrabold text-zinc-200 uppercase tracking-wider">
                        {homeLineup.team_name}
                      </h4>
                      {homeLineup.formation && (
                        <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-950">
                          {homeLineup.formation}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {homeLineup.players?.map(
                        (player: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-900/40 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-900/30 flex items-center justify-center text-[10px] font-black text-indigo-400">
                                {player.jersey_number ?? '-'}
                              </span>
                              <span className="font-semibold text-zinc-200">
                                {player.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">
                              {player.position}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Equipa de Fora */}
                  <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 shadow">
                    <div className="flex items-center justify-between mb-4 border-b border-zinc-850 pb-3">
                      <h4 className="text-xs font-extrabold text-zinc-200 uppercase tracking-wider">
                        {awayLineup.team_name}
                      </h4>
                      {awayLineup.formation && (
                        <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-950">
                          {awayLineup.formation}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {awayLineup.players?.map(
                        (player: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-900/40 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-900/30 flex items-center justify-center text-[10px] font-black text-purple-400">
                                {player.jersey_number ?? '-'}
                              </span>
                              <span className="font-semibold text-zinc-200">
                                {player.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">
                              {player.position}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Jogadores indisponíveis */}
                {lineups.unavailable_players &&
                  (lineups.unavailable_players.home?.length > 0 ||
                    lineups.unavailable_players.away?.length > 0) && (
                    <div className="backdrop-blur-xl bg-red-950/10 border border-red-900/20 rounded-2xl p-5 shadow">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3">
                        Jogadores Indisponíveis / Lesionados
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-400">
                        <div>
                          <p className="font-bold text-zinc-300 mb-1.5">
                            {homeLineup.team_name}
                          </p>
                          {lineups.unavailable_players.home?.length > 0 ? (
                            <ul className="space-y-1">
                              {lineups.unavailable_players.home.map(
                                (p: any, i: number) => (
                                  <li
                                    key={i}
                                    className="flex items-center gap-1.5"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    {p.name}{' '}
                                    {p.reason && (
                                      <span className="text-zinc-600">
                                        ({p.reason})
                                      </span>
                                    )}
                                  </li>
                                )
                              )}
                            </ul>
                          ) : (
                            <p className="text-zinc-600">Sem informação</p>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-300 mb-1.5">
                            {awayLineup.team_name}
                          </p>
                          {lineups.unavailable_players.away?.length > 0 ? (
                            <ul className="space-y-1">
                              {lineups.unavailable_players.away.map(
                                (p: any, i: number) => (
                                  <li
                                    key={i}
                                    className="flex items-center gap-1.5"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    {p.name}{' '}
                                    {p.reason && (
                                      <span className="text-zinc-600">
                                        ({p.reason})
                                      </span>
                                    )}
                                  </li>
                                )
                              )}
                            </ul>
                          ) : (
                            <p className="text-zinc-600">Sem informação</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
                <Users className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                <h4 className="text-sm font-bold text-zinc-300">
                  Equipas Iniciais Indisponíveis
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  A listagem oficial dos convocados e disposição tática é
                  divulgada cerca de 1 hora antes do apito inicial.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            ABA 5 — CLASSIFICAÇÃO DA COMPETIÇÃO
           ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'standings' && (
          <div className="animate-in fade-in duration-300">
            {hasStandings ? (
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl shadow overflow-hidden">
                {/* Cabeçalho */}
                <div className="bg-zinc-900/60 border-b border-zinc-850 p-4 flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    {standings.season?.name || event.league.name}
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-semibold">
                    Época {standings.season?.year || ''}
                  </span>
                </div>

                {/* Tabela */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-850 text-zinc-500 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 text-left w-8">#</th>
                        <th className="py-2.5 px-3 text-left">Equipa</th>
                        <th className="py-2.5 px-2 text-center">J</th>
                        <th className="py-2.5 px-2 text-center">V</th>
                        <th className="py-2.5 px-2 text-center">E</th>
                        <th className="py-2.5 px-2 text-center">D</th>
                        <th className="py-2.5 px-2 text-center">GM</th>
                        <th className="py-2.5 px-2 text-center">GS</th>
                        <th className="py-2.5 px-2 text-center">DG</th>
                        <th className="py-2.5 px-3 text-center font-black">
                          PTS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {standingsRows.map((row: any) => {
                        const isHome =
                          row.team_id === event.home_team.id
                        const isAway =
                          row.team_id === event.away_team.id
                        const isHighlighted = isHome || isAway

                        return (
                          <tr
                            key={row.team_id}
                            className={`border-b border-zinc-900/60 transition-colors ${
                              isHighlighted
                                ? 'bg-indigo-500/5 border-l-2 border-l-indigo-500'
                                : 'hover:bg-zinc-900/20'
                            }`}
                          >
                            <td className="py-2 px-3 font-bold text-zinc-400">
                              {row.position}
                            </td>
                            <td
                              className={`py-2 px-3 font-bold ${
                                isHighlighted
                                  ? 'text-indigo-300'
                                  : 'text-zinc-200'
                              }`}
                            >
                              {row.team_name}
                            </td>
                            <td className="py-2 px-2 text-center text-zinc-400">
                              {row.played}
                            </td>
                            <td className="py-2 px-2 text-center text-zinc-400">
                              {row.won}
                            </td>
                            <td className="py-2 px-2 text-center text-zinc-400">
                              {row.drawn}
                            </td>
                            <td className="py-2 px-2 text-center text-zinc-400">
                              {row.lost}
                            </td>
                            <td className="py-2 px-2 text-center text-zinc-400">
                              {row.gf}
                            </td>
                            <td className="py-2 px-2 text-center text-zinc-400">
                              {row.ga}
                            </td>
                            <td
                              className={`py-2 px-2 text-center font-bold ${
                                row.gd > 0
                                  ? 'text-emerald-400'
                                  : row.gd < 0
                                    ? 'text-red-400'
                                    : 'text-zinc-500'
                              }`}
                            >
                              {row.gd > 0 ? '+' : ''}
                              {row.gd}
                            </td>
                            <td
                              className={`py-2 px-3 text-center font-black ${
                                isHighlighted
                                  ? 'text-indigo-400'
                                  : 'text-white'
                              }`}
                            >
                              {row.pts}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
                <Trophy className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                <h4 className="text-sm font-bold text-zinc-300">
                  Classificação Indisponível
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  A tabela classificativa desta competição não está disponível
                  no momento.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
