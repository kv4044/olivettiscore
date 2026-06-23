'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, ChevronRight, Clock, TrendingUp } from 'lucide-react'
import LocalTime from '@/components/LocalTime'
import type { BzzoiroEvent } from '@/services/bzzoiro'

interface TeamMatchesTabsProps {
  teamId: number
  completedMatches: BzzoiroEvent[]
  upcomingMatches: BzzoiroEvent[]
}

function getMatchResult(event: BzzoiroEvent, teamId: number) {
  const isHome = event.home_team.id === teamId
  const scoreHome = event.score.home
  const scoreAway = event.score.away

  if (scoreHome === null || scoreAway === null) return null

  if (scoreHome === scoreAway) {
    return { label: 'E', color: 'bg-zinc-800 text-zinc-400 border border-zinc-700' }
  }

  const won = isHome ? scoreHome > scoreAway : scoreAway > scoreHome
  return won
    ? { label: 'V', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black' }
    : { label: 'D', color: 'bg-red-500/10 text-red-400 border border-red-500/20 font-black' }
}

export default function TeamMatchesTabs({
  teamId,
  completedMatches,
  upcomingMatches
}: TeamMatchesTabsProps) {
  const [activeMatchesTab, setActiveMatchesTab] = useState<'completed' | 'upcoming'>('completed')

  return (
    <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-6 shadow-lg space-y-6">
      <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2 border-b border-zinc-850 pb-3">
        <Calendar className="w-5 h-5 text-purple-400" />
        <span>Jogos da Equipa</span>
      </h3>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-850 bg-zinc-950/30 p-1.5">
        <button
          onClick={() => setActiveMatchesTab('completed')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
            activeMatchesTab === 'completed'
              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
              : 'text-zinc-500 border border-transparent hover:text-zinc-300'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Ultimos Resultados</span>
        </button>
        <button
          onClick={() => setActiveMatchesTab('upcoming')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
            activeMatchesTab === 'upcoming'
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
              : 'text-zinc-500 border border-transparent hover:text-zinc-300'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Jogos Futuros</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className={activeMatchesTab === 'completed' ? 'space-y-4' : 'hidden'}>
          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 pl-1">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
            <span>Ultimos Resultados</span>
          </h4>

          {completedMatches.length === 0 ? (
            <div className="p-8 text-center text-zinc-550 border border-zinc-900 rounded-2xl text-xs">
              Nenhum jogo terminado.
            </div>
          ) : (
            <div className="space-y-2.5">
              {completedMatches.map((event) => {
                const res = getMatchResult(event, teamId)
                const isHome = event.home_team.id === teamId

                return (
                  <div
                    key={event.id}
                    className="p-3 bg-zinc-950/30 border border-zinc-900 rounded-xl flex flex-col gap-1.5 hover:bg-zinc-900/20 transition-all text-xxs font-semibold"
                  >
                    <Link href={`/jogo/${event.id}`} className="space-y-1 block">
                      <p className={`truncate hover:text-indigo-400 ${isHome ? 'text-zinc-200 font-bold' : 'text-zinc-450'}`}>
                        {event.home_team.name}
                      </p>
                      <p className={`truncate hover:text-indigo-400 ${!isHome ? 'text-zinc-200 font-bold' : 'text-zinc-450'}`}>
                        {event.away_team.name}
                      </p>
                    </Link>

                    <div className="flex items-center justify-between border-t border-zinc-850/40 pt-1.5">
                      <span className="text-zinc-500 font-mono text-[9px]">
                        <LocalTime utcDateString={event.date} />
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono font-black text-[10px] text-indigo-400 bg-indigo-500/5 px-2 py-0.5 border border-indigo-950 rounded select-none text-center">
                          {event.score.home}-{event.score.away}
                        </span>
                        {res && (
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${res.color}`}>
                            {res.label}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
              <Link
                href={`/equipa/${teamId}/jogos/ultimos-resultados`}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-indigo-300 transition-all hover:border-indigo-400/50 hover:bg-indigo-500/15"
              >
                <span>Ver todos os resultados</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <div className={activeMatchesTab === 'upcoming' ? 'space-y-4' : 'hidden'}>
          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 pl-1">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Proximos Jogos</span>
          </h4>

          {upcomingMatches.length === 0 ? (
            <div className="p-8 text-center text-zinc-550 border border-zinc-900 rounded-2xl text-xs">
              Nenhum jogo agendado.
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingMatches.map((event) => {
                const isHome = event.home_team.id === teamId

                return (
                  <div
                    key={event.id}
                    className="p-3 bg-zinc-950/30 border border-zinc-900 rounded-xl flex flex-col gap-1.5 hover:bg-zinc-900/20 transition-all text-xxs font-semibold"
                  >
                    <Link href={`/jogo/${event.id}`} className="space-y-1 block">
                      <p className={`truncate hover:text-indigo-400 ${isHome ? 'text-zinc-200 font-bold' : 'text-zinc-450'}`}>
                        {event.home_team.name}
                      </p>
                      <p className={`truncate hover:text-indigo-400 ${!isHome ? 'text-zinc-200 font-bold' : 'text-zinc-450'}`}>
                        {event.away_team.name}
                      </p>
                    </Link>

                    <div className="flex items-center justify-between border-t border-zinc-850/40 pt-1.5">
                      <span className="text-zinc-550">
                        <LocalTime utcDateString={event.date} />
                      </span>
                      <Link
                        href={`/jogo/${event.id}`}
                        className="text-[9px] uppercase font-extrabold tracking-wider text-indigo-400 hover:text-indigo-300"
                      >
                        Apostar
                      </Link>
                    </div>
                  </div>
                )
              })}
              <Link
                href={`/equipa/${teamId}/jogos/futuros`}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-purple-500/25 bg-purple-500/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-purple-300 transition-all hover:border-purple-400/50 hover:bg-purple-500/15"
              >
                <span>Ver todos os jogos futuros</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
