import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Award,
  ChevronRight,
  Search,
  Shield,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react'
import { searchSite, type SearchResults } from '@/services/search'
import { getLeagueLogoUrl } from '@/utils/leagueLogo'

interface PageProps {
  searchParams: Promise<{
    q?: string | string[]
  }>
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q
  const query = (rawQuery || '').trim()
  const results = query.length >= 2 ? await searchSite(query, { fullResults: true }) : emptyResults()
  const totalResults =
    results.leagues.length +
    results.teams.length +
    results.footballPlayers.length +
    results.players.length

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-950 to-black text-zinc-100 font-sans">
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <main className="relative z-10 max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-8">
        <header className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Voltar ao inicio</span>
          </Link>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-widest">
              <Search className="w-4 h-4" />
              <span>Pesquisa</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {query.length >= 2 ? `Resultados para "${query}"` : 'Pesquisa Olivetti Score'}
            </h1>
            <p className="text-sm text-zinc-500 font-semibold">
              {query.length >= 2
                ? `${totalResults} resultado${totalResults === 1 ? '' : 's'} encontrado${totalResults === 1 ? '' : 's'} entre competicoes, equipas, jogadores e utilizadores.`
                : 'Escreve pelo menos 2 letras na barra de pesquisa e carrega Enter para veres todos os resultados.'}
            </p>
          </div>
        </header>

        {query.length >= 2 && totalResults === 0 && (
          <div className="py-20 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
            <Search className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
            <p className="text-sm font-bold text-zinc-300">Nenhum resultado encontrado</p>
            <p className="text-xs text-zinc-600 mt-1">Experimenta pesquisar por outro nome, pais, equipa ou jogador.</p>
          </div>
        )}

        {query.length >= 2 && totalResults > 0 && (
          <div className="space-y-10">
            <ResultSection
              title="Competicoes"
              count={results.leagues.length}
              icon={<Trophy className="w-4 h-4 text-indigo-400" />}
            >
              {results.leagues.map((league) => (
                <Link
                  key={league.id}
                  href={`/liga/${league.id}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-zinc-800/70 bg-zinc-900/25 p-4 hover:bg-zinc-900/55 hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden p-1 shrink-0">
                      <img
                        src={getLeagueLogoUrl({ id: league.id, name: league.name, country: league.country, logoUrl: league.logo_url })}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-zinc-100 truncate group-hover:text-indigo-300">{league.name}</p>
                      {league.country && <p className="text-xs text-zinc-500 font-semibold truncate">{league.country}</p>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-300 shrink-0" />
                </Link>
              ))}
            </ResultSection>

            <ResultSection
              title="Equipas"
              count={results.teams.length}
              icon={<Shield className="w-4 h-4 text-purple-400" />}
            >
              {results.teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/equipa/${team.id}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-zinc-800/70 bg-zinc-900/25 p-4 hover:bg-zinc-900/55 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden p-1 shrink-0">
                      {team.logo_url && team.logo_url !== 'no_logo' ? (
                        <img src={team.logo_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs font-black text-purple-400">
                          {(team.short_name || team.name.substring(0, 2)).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-zinc-100 truncate group-hover:text-purple-300">{team.name}</p>
                      {team.short_name && <p className="text-xs text-zinc-500 font-semibold truncate">{team.short_name}</p>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-300 shrink-0" />
                </Link>
              ))}
            </ResultSection>

            <ResultSection
              title="Jogadores"
              count={results.footballPlayers.length}
              icon={<Award className="w-4 h-4 text-indigo-400" />}
            >
              {results.footballPlayers.map((player) => (
                <Link
                  key={player.id}
                  href={`/jogador/${player.id}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-zinc-800/70 bg-zinc-900/25 p-4 hover:bg-zinc-900/55 hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden p-1 shrink-0">
                      <img
                        src={`https://sports.bzzoiro.com/img/player/${player.id}/`}
                        alt=""
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-zinc-100 truncate group-hover:text-indigo-300">{player.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold min-w-0">
                        {player.team_logo && <img src={player.team_logo} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />}
                        <span className="truncate">{player.team_name}</span>
                        <span className="text-zinc-700">/</span>
                        <span className="font-mono uppercase">{player.position}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-300 shrink-0" />
                </Link>
              ))}
            </ResultSection>

            <ResultSection
              title="Utilizadores"
              count={results.players.length}
              icon={<Users className="w-4 h-4 text-amber-400" />}
            >
              {results.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800/70 bg-zinc-900/25 p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-xs font-black text-amber-400 shrink-0">
                      #{player.rank}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-zinc-100 truncate">{player.name || player.email}</p>
                      <p className="text-xs text-zinc-500 font-semibold truncate">{player.points} PTS</p>
                    </div>
                  </div>
                  <UserRound className="w-4 h-4 text-zinc-600 shrink-0" />
                </div>
              ))}
            </ResultSection>
          </div>
        )}
      </main>
    </div>
  )
}

function ResultSection({
  title,
  count,
  icon,
  children,
}: {
  title: string
  count: number
  icon: ReactNode
  children: ReactNode
}) {
  if (count === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">
          {title} ({count})
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {children}
      </div>
    </section>
  )
}

function emptyResults(): SearchResults {
  return {
    leagues: [],
    teams: [],
    players: [],
    footballPlayers: [],
  }
}
