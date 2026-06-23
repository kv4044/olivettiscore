'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  Award,
  CircleDot,
  Goal,
  Shield,
  ShieldAlert,
  TrendingUp,
  Trophy,
  Users,
  Zap
} from 'lucide-react'
import type { LeagueStatsSummary } from '@/utils/statsGenerator'

export type TeamSquadPlayer = {
  id: number
  name: string
  position: string
  shirtNumber?: number | null
}

interface TeamTabsProps {
  squad: TeamSquadPlayer[]
  statsSummary: LeagueStatsSummary
  children: ReactNode
}

type TeamTab = 'geral' | 'plantel' | 'estatisticas'

const positionGroups = [
  { key: 'G', title: 'Guarda-redes', icon: Goal, color: 'text-emerald-400' },
  { key: 'D', title: 'Defesas', icon: Shield, color: 'text-blue-400' },
  { key: 'M', title: 'Medios', icon: CircleDot, color: 'text-amber-400' },
  { key: 'F', title: 'Avancados', icon: Zap, color: 'text-rose-400' }
]

function getPosAbbr(pos: string) {
  switch (pos) {
    case 'F': return 'AV'
    case 'M': return 'MC'
    case 'D': return 'DF'
    case 'G': return 'GR'
    default: return pos || 'N/A'
  }
}

function getPosColor(pos: string) {
  switch (pos) {
    case 'F': return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    case 'M': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'D': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'G': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

function StatLeaderboard({
  title,
  icon: Icon,
  players,
  metric,
  color,
  formatValue
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  players: LeagueStatsSummary[keyof LeagueStatsSummary]
  metric: 'goals' | 'assists' | 'passes'
  color: 'indigo' | 'purple' | 'amber'
  formatValue: (value: number) => string
}) {
  const textClass = color === 'indigo' ? 'text-indigo-400' : color === 'purple' ? 'text-purple-400' : 'text-amber-500'
  const pillClass = color === 'indigo'
    ? 'bg-indigo-500/10 border-indigo-500/20'
    : color === 'purple'
      ? 'bg-purple-500/10 border-purple-500/20'
      : 'bg-amber-500/10 border-amber-500/20'
  const barClass = color === 'indigo'
    ? 'from-indigo-600 to-indigo-400'
    : color === 'purple'
      ? 'from-purple-600 to-purple-400'
      : 'from-amber-600 to-amber-400'

  return (
    <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-6 shadow-lg space-y-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-350 flex items-center gap-2.5 border-b border-zinc-850 pb-3">
        <Icon className={`w-5 h-5 ${textClass}`} />
        <span>{title}</span>
      </h3>

      {players.length === 0 ? (
        <div className="p-8 text-center text-zinc-550 text-xs">Sem dados disponiveis.</div>
      ) : (
        <div className="space-y-4">
          {players.map((player, idx) => {
            const value = player[metric]
            const maxVal = players[0][metric] || 1
            const progressPct = Math.max(5, (value / maxVal) * 100)

            return (
              <div key={`${metric}-${player.id}`} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-zinc-600 font-mono w-5">#{idx + 1}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 border rounded shrink-0 ${getPosColor(player.position)}`}>
                      {getPosAbbr(player.position)}
                    </span>
                    <p className="text-zinc-200 font-bold truncate">{player.name}</p>
                  </div>
                  <span className={`font-mono text-zinc-200 font-black shrink-0 ml-2 px-2.5 py-0.5 border rounded-md ${pillClass}`}>
                    {formatValue(value)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                  <div
                    className={`h-full bg-gradient-to-r ${barClass} rounded-full transition-all duration-500`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function TeamTabs({ squad, statsSummary, children }: TeamTabsProps) {
  const [activeTab, setActiveTab] = useState<TeamTab>('geral')

  const groupedSquad = positionGroups.map((group) => ({
    ...group,
    players: squad.filter((player) => player.position === group.key)
  }))

  const unknownPlayers = squad.filter((player) => !positionGroups.some((group) => group.key === player.position))

  return (
    <div className="space-y-6">
      <div className="flex border-b border-zinc-900 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('geral')}
          className={`pb-3.5 border-b-2 transition-all px-1 flex items-center gap-2 ${
            activeTab === 'geral'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-zinc-450 hover:text-zinc-300'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Classificacao & Jogos</span>
        </button>
        <button
          onClick={() => setActiveTab('plantel')}
          className={`pb-3.5 border-b-2 transition-all px-1 flex items-center gap-2 ${
            activeTab === 'plantel'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-zinc-450 hover:text-zinc-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Plantel</span>
        </button>
        <button
          onClick={() => setActiveTab('estatisticas')}
          className={`pb-3.5 border-b-2 transition-all px-1 flex items-center gap-2 ${
            activeTab === 'estatisticas'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-zinc-450 hover:text-zinc-300'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Estatisticas de Jogadores</span>
        </button>
      </div>

      {activeTab === 'geral' ? (
        children
      ) : activeTab === 'plantel' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groupedSquad.map(({ key, title, icon: Icon, color, players }) => (
            <div key={key} className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-6 shadow-lg space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-350 flex items-center justify-between gap-2.5 border-b border-zinc-850 pb-3">
                <span className="flex items-center gap-2.5">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span>{title}</span>
                </span>
                <span className="font-mono text-[10px] text-zinc-500">{players.length}</span>
              </h3>

              {players.length === 0 ? (
                <div className="p-8 text-center text-zinc-550 text-xs">Sem jogadores nesta posicao.</div>
              ) : (
                <div className="space-y-2.5">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-zinc-950/30 px-3 py-2.5 text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 border rounded shrink-0 ${getPosColor(player.position)}`}>
                          {getPosAbbr(player.position)}
                        </span>
                        <span className="truncate text-zinc-200">{player.name}</span>
                      </div>
                      {player.shirtNumber ? (
                        <span className="font-mono text-[11px] text-zinc-500 shrink-0">#{player.shirtNumber}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {unknownPlayers.length > 0 && (
            <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-6 shadow-lg space-y-5 lg:col-span-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-350 flex items-center gap-2.5 border-b border-zinc-850 pb-3">
                <Users className="w-5 h-5 text-zinc-400" />
                <span>Outros</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {unknownPlayers.map((player) => (
                  <div key={player.id} className="rounded-xl border border-zinc-900 bg-zinc-950/30 px-3 py-2.5 text-xs font-semibold text-zinc-200">
                    {player.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <StatLeaderboard
            title="Melhores Marcadores"
            icon={Zap}
            players={statsSummary.topGoals}
            metric="goals"
            color="indigo"
            formatValue={(value) => `${value} Golo${value !== 1 ? 's' : ''}`}
          />
          <StatLeaderboard
            title="Lideres de Assistencias"
            icon={Activity}
            players={statsSummary.topAssists}
            metric="assists"
            color="purple"
            formatValue={(value) => `${value} Assist.`}
          />
          <StatLeaderboard
            title="Mais Passes Efetuados"
            icon={TrendingUp}
            players={statsSummary.topPasses}
            metric="passes"
            color="amber"
            formatValue={(value) => value.toLocaleString('pt-PT')}
          />

          <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-6 shadow-lg space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-350 flex items-center gap-2.5 border-b border-zinc-850 pb-3">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <span>Disciplina</span>
            </h3>

            {statsSummary.topYellowCards.length === 0 ? (
              <div className="p-8 text-center text-zinc-550 text-xs">Sem dados disponiveis.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1.5 pl-1">
                    <span className="w-2.5 h-3.5 bg-amber-400 rounded-sm inline-block shrink-0" />
                    <span>Cartoes Amarelos</span>
                  </h4>
                  <div className="space-y-3.5">
                    {statsSummary.topYellowCards.slice(0, 5).map((player, idx) => (
                      <div key={`yellow-${player.id}`} className="flex items-center justify-between text-xs font-semibold">
                        <span className="truncate text-zinc-200"><span className="text-zinc-600 font-mono mr-2">#{idx + 1}</span>{player.name}</span>
                        <span className="font-mono text-amber-400 font-black shrink-0 ml-1.5 bg-amber-500/5 px-2 py-0.5 border border-amber-500/20 rounded">
                          {player.yellowCards}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1.5 pl-1">
                    <span className="w-2.5 h-3.5 bg-red-500 rounded-sm inline-block shrink-0" />
                    <span>Cartoes Vermelhos</span>
                  </h4>
                  <div className="space-y-3.5">
                    {statsSummary.topRedCards.slice(0, 5).map((player, idx) => (
                      <div key={`red-${player.id}`} className="flex items-center justify-between text-xs font-semibold">
                        <span className="truncate text-zinc-200"><span className="text-zinc-600 font-mono mr-2">#{idx + 1}</span>{player.name}</span>
                        <span className="font-mono text-red-450 font-black shrink-0 ml-1.5 bg-red-500/5 px-2 py-0.5 border border-red-500/20 rounded">
                          {player.redCards}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
