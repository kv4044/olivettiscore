'use client'

import { useState } from 'react'
import Link from 'next/link'
import LocalTime from '@/components/LocalTime'
import { LeagueStatsSummary, PlayerStats } from '@/utils/statsGenerator'
import {
  Trophy,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Zap,
  Activity,
  ShieldAlert
} from 'lucide-react'

interface LeagueTabsProps {
  leagueStandings: any
  completedMatches: any[]
  upcomingMatches: any[]
  statsSummary: LeagueStatsSummary
}

export default function LeagueTabs({
  leagueStandings,
  completedMatches,
  upcomingMatches,
  statsSummary
}: LeagueTabsProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'estatisticas'>('geral')

  // Helper for position abbreviations in Portuguese
  const getPosAbbr = (pos: string) => {
    switch (pos) {
      case 'F': return 'AV' // Avançado
      case 'M': return 'MC' // Médio
      case 'D': return 'DF' // Defesa
      case 'G': return 'GR' // Guarda-Redes
      default: return pos
    }
  }

  // Helper for position colors
  const getPosColor = (pos: string) => {
    switch (pos) {
      case 'F': return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      case 'M': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'D': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'G': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* TABS NAVIGATOR */}
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
          <span>Classificação & Jogos</span>
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
          <span>Estatísticas de Jogadores</span>
        </button>
      </div>

      {/* TAB CONTENTS */}
      {activeTab === 'geral' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUNA ESQUERDA: Classificações (5/12) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* LEAGUE STANDINGS CARD */}
            <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-5 shadow-lg space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Tabela Classificativa</span>
              </h3>

              {leagueStandings && (leagueStandings.standings || leagueStandings.groups) ? (
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {leagueStandings.grouped && leagueStandings.groups ? (
                    Object.entries(leagueStandings.groups)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([groupName, rows]: [string, any]) => (
                        <div key={groupName} className="space-y-2">
                          <div className="bg-indigo-500/10 border border-indigo-950/30 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
                            <span>{groupName}</span>
                            <span className="text-[9px] text-zinc-500 font-normal normal-case">Grupo</span>
                          </div>
                          <div className="border border-zinc-850 rounded-2xl overflow-hidden bg-zinc-950/20">
                            <table className="w-full text-left text-[11px] border-collapse">
                              <thead>
                                <tr className="bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-850">
                                  <th className="py-2 px-3 text-center w-8">#</th>
                                  <th className="py-2 px-2">Equipa</th>
                                  <th className="py-2 px-2 text-center">J</th>
                                  <th className="py-2 px-2 text-center">Forma</th>
                                  <th className="py-2 px-3 text-right">Pts</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-900/50">
                                {rows.map((row: any) => (
                                  <tr 
                                    key={row.team_id}
                                    className="transition-colors text-zinc-400 hover:bg-zinc-900/20"
                                  >
                                    <td className="py-2 px-3 text-center font-bold">
                                      {row.position}
                                    </td>
                                    <td className="py-2 px-2 truncate max-w-[150px] font-bold">
                                      <Link href={`/equipa/${row.team_id}`} className="hover:text-indigo-400 hover:underline">
                                        {row.team_name}
                                      </Link>
                                    </td>
                                    <td className="py-2 px-2 text-center font-medium">
                                      {row.played}
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                      <span className="font-mono text-[9px] tracking-wide text-zinc-500">
                                        {row.form || '-'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-black text-zinc-200">
                                      {row.pts}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                  ) : leagueStandings.standings ? (
                    <div className="border border-zinc-850 rounded-2xl overflow-hidden bg-zinc-950/20">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider text-[9px] border-b border-zinc-850">
                            <th className="py-2.5 px-3 text-center w-8">#</th>
                            <th className="py-2.5 px-2">Clube</th>
                            <th className="py-2.5 px-2 text-center">J</th>
                            <th className="py-2.5 px-2 text-center">Forma</th>
                            <th className="py-2.5 px-3 text-right">Pts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/50">
                          {leagueStandings.standings.map((row: any) => (
                            <tr 
                              key={row.team_id}
                              className="transition-colors text-zinc-400 hover:bg-zinc-900/20"
                            >
                              <td className="py-2.5 px-3 text-center font-bold">
                                {row.position}
                              </td>
                              <td className="py-2.5 px-2 truncate max-w-[150px] font-bold">
                                <Link href={`/equipa/${row.team_id}`} className="hover:text-indigo-400 hover:underline">
                                  {row.team_name}
                                </Link>
                              </td>
                              <td className="py-2.5 px-2 text-center font-medium">
                                {row.played}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span className="font-mono text-[9px] tracking-wide text-zinc-500">
                                  {row.form || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-zinc-200">
                                {row.pts}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-zinc-550 text-xs">
                      Sem classificação disponível no momento.
                    </div>
                  )}
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
                      Nenhum jogo terminado recente.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {completedMatches.map((event: any) => (
                        <div 
                          key={event.id}
                          className="p-3 bg-zinc-950/30 border border-zinc-900 rounded-xl flex flex-col gap-1.5 hover:bg-zinc-900/20 transition-all text-xxs font-semibold"
                        >
                          <Link href={`/jogo/${event.id}`} className="space-y-1 block">
                            <p className="truncate text-zinc-300 hover:text-indigo-400">
                              {event.home_team.name}
                            </p>
                            <p className="truncate text-zinc-300 hover:text-indigo-400">
                              {event.away_team.name}
                            </p>
                          </Link>

                          <div className="flex items-center justify-between border-t border-zinc-850/40 pt-1.5">
                            <span className="text-zinc-500 font-mono text-[9px]">
                              <LocalTime utcDateString={event.date} />
                            </span>
                            <span className="font-mono font-black text-[10px] text-indigo-400 bg-indigo-500/5 px-2 py-0.5 border border-indigo-950 rounded select-none text-center">
                              {event.score.home}-{event.score.away}
                            </span>
                          </div>
                        </div>
                      ))}
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
                      {upcomingMatches.map((event: any) => (
                        <div 
                          key={event.id}
                          className="p-3 bg-zinc-950/30 border border-zinc-900 rounded-xl flex flex-col gap-1.5 hover:bg-zinc-900/20 transition-all text-xxs font-semibold"
                        >
                          <Link href={`/jogo/${event.id}`} className="space-y-1 block">
                            <p className="truncate text-zinc-300 hover:text-indigo-400">
                              {event.home_team.name}
                            </p>
                            <p className="truncate text-zinc-300 hover:text-indigo-400">
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
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>
      ) : (
        /* STATISTICS TAB VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* MELHORES MARCADORES */}
          <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-6 shadow-lg space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-350 flex items-center gap-2.5 border-b border-zinc-850 pb-3">
              <Zap className="w-5 h-5 text-indigo-400" />
              <span>Melhores Marcadores</span>
            </h3>
            
            {statsSummary.topGoals.length === 0 ? (
              <div className="p-8 text-center text-zinc-550 text-xs">Sem dados disponíveis.</div>
            ) : (
              <div className="space-y-4">
                {statsSummary.topGoals.map((player, idx) => {
                  const maxVal = statsSummary.topGoals[0].goals || 1;
                  const progressPct = Math.max(5, (player.goals / maxVal) * 100);
                  
                  return (
                    <div key={player.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-zinc-600 font-mono w-5">#{idx + 1}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 border rounded shrink-0 ${getPosColor(player.position)}`}>
                            {getPosAbbr(player.position)}
                          </span>
                          <div className="truncate min-w-0">
                            <p className="text-zinc-200 font-bold hover:text-indigo-400 truncate">{player.name}</p>
                            <p className="text-[10px] text-zinc-500 font-medium truncate">{player.teamName}</p>
                          </div>
                        </div>
                        <span className="font-mono text-zinc-200 font-black shrink-0 ml-2 bg-indigo-500/10 px-2.5 py-0.5 border border-indigo-500/20 rounded-md">
                          {player.goals} Golo{player.goals !== 1 && 's'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LÍDERES DE ASSISTÊNCIAS */}
          <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-6 shadow-lg space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-350 flex items-center gap-2.5 border-b border-zinc-850 pb-3">
              <Activity className="w-5 h-5 text-purple-400" />
              <span>Líderes de Assistências</span>
            </h3>

            {statsSummary.topAssists.length === 0 ? (
              <div className="p-8 text-center text-zinc-550 text-xs">Sem dados disponíveis.</div>
            ) : (
              <div className="space-y-4">
                {statsSummary.topAssists.map((player, idx) => {
                  const maxVal = statsSummary.topAssists[0].assists || 1;
                  const progressPct = Math.max(5, (player.assists / maxVal) * 100);

                  return (
                    <div key={player.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-zinc-600 font-mono w-5">#{idx + 1}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 border rounded shrink-0 ${getPosColor(player.position)}`}>
                            {getPosAbbr(player.position)}
                          </span>
                          <div className="truncate min-w-0">
                            <p className="text-zinc-200 font-bold hover:text-purple-400 truncate">{player.name}</p>
                            <p className="text-[10px] text-zinc-500 font-medium truncate">{player.teamName}</p>
                          </div>
                        </div>
                        <span className="font-mono text-zinc-200 font-black shrink-0 ml-2 bg-purple-500/10 px-2.5 py-0.5 border border-purple-500/20 rounded-md">
                          {player.assists} Assist.
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LÍDERES DE PASSES */}
          <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-6 shadow-lg space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-350 flex items-center gap-2.5 border-b border-zinc-850 pb-3">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <span>Mais Passes Efetuados</span>
            </h3>

            {statsSummary.topPasses.length === 0 ? (
              <div className="p-8 text-center text-zinc-550 text-xs">Sem dados disponíveis.</div>
            ) : (
              <div className="space-y-4">
                {statsSummary.topPasses.map((player, idx) => {
                  const maxVal = statsSummary.topPasses[0].passes || 1;
                  const progressPct = Math.max(5, (player.passes / maxVal) * 100);

                  return (
                    <div key={player.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-zinc-600 font-mono w-5">#{idx + 1}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 border rounded shrink-0 ${getPosColor(player.position)}`}>
                            {getPosAbbr(player.position)}
                          </span>
                          <div className="truncate min-w-0">
                            <p className="text-zinc-200 font-bold hover:text-amber-400 truncate">{player.name}</p>
                            <p className="text-[10px] text-zinc-500 font-medium truncate">{player.teamName}</p>
                          </div>
                        </div>
                        <span className="font-mono text-zinc-200 font-black shrink-0 ml-2 bg-amber-500/10 px-2.5 py-0.5 border border-amber-500/20 rounded-md">
                          {player.passes.toLocaleString('pt-PT')}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DISCIPLINA */}
          <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-6 shadow-lg space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-350 flex items-center gap-2.5 border-b border-zinc-850 pb-3">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <span>Disciplina (Cartões)</span>
            </h3>

            {statsSummary.topYellowCards.length === 0 ? (
              <div className="p-8 text-center text-zinc-550 text-xs">Sem dados disponíveis.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Yellow Cards Sub-list */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1.5 pl-1">
                    <span className="w-2.5 h-3.5 bg-amber-400 rounded-sm inline-block shrink-0" />
                    <span>Cartões Amarelos</span>
                  </h4>
                  <div className="space-y-3.5">
                    {statsSummary.topYellowCards.slice(0, 5).map((player, idx) => (
                      <div key={player.id} className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-zinc-600 font-mono w-4">#{idx + 1}</span>
                          <div className="truncate min-w-0">
                            <p className="text-zinc-200 font-bold hover:text-indigo-400 truncate">{player.name}</p>
                            <p className="text-[9px] text-zinc-550 truncate">{player.teamName}</p>
                          </div>
                        </div>
                        <span className="font-mono text-amber-400 font-black shrink-0 ml-1.5 bg-amber-500/5 px-2 py-0.5 border border-amber-500/20 rounded">
                          {player.yellowCards}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Red Cards Sub-list */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1.5 pl-1">
                    <span className="w-2.5 h-3.5 bg-red-500 rounded-sm inline-block shrink-0" />
                    <span>Cartões Vermelhos</span>
                  </h4>
                  <div className="space-y-3.5">
                    {statsSummary.topRedCards.slice(0, 5).map((player, idx) => (
                      <div key={player.id} className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-zinc-600 font-mono w-4">#{idx + 1}</span>
                          <div className="truncate min-w-0">
                            <p className="text-zinc-200 font-bold hover:text-indigo-400 truncate">{player.name}</p>
                            <p className="text-[9px] text-zinc-550 truncate">{player.teamName}</p>
                          </div>
                        </div>
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
