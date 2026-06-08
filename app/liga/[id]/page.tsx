import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { bzzoiroService } from '@/services/bzzoiro'
import { getFlagUrl } from '@/utils/flags'
import LocalTime from '@/components/LocalTime'
import { 
  ArrowLeft, 
  Trophy, 
  Calendar, 
  Clock, 
  ChevronRight,
  TrendingUp,
  MapPin
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export const revalidate = 60 // Revalidar a cada minuto

export default async function LeagueDetailsPage({ params }: PageProps) {
  const { id } = await params
  const leagueId = Number(id)

  if (isNaN(leagueId)) {
    notFound()
  }

  // 1. Procurar detalhes da liga na base de dados (Supabase)
  const supabase = await createClient()
  const { data: leagueDetails } = await supabase
    .from('leagues')
    .select('id, name, country, logo_url')
    .eq('id', leagueId)
    .maybeSingle()

  if (!leagueDetails) {
    notFound()
  }

  // 2. Obter classificação da liga da API Bzzoiro
  let leagueStandings = null
  try {
    leagueStandings = await bzzoiroService.getLeagueStandings(leagueId)
  } catch (err) {
    console.error('Erro ao obter classificações da liga:', err)
  }

  // 3. Obter jogos recentes/futuros da liga da API Bzzoiro
  let events: any[] = []
  try {
    events = await bzzoiroService.getEvents({ league_id: String(leagueId) })
  } catch (err) {
    console.error('Erro ao obter jogos da liga:', err)
  }

  // Filtrar jogos terminados e agendados
  const completedMatches = events
    .filter((e: any) => e.status === 'FT')
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const upcomingMatches = events
    .filter((e: any) => e.status === 'NS')
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-950 to-black text-zinc-100 flex flex-col font-sans">
      
      {/* Background glowing shapes */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header/Navbar */}
      <header className="z-50 border-b border-zinc-900/60 bg-zinc-950/70 backdrop-blur-md sticky top-0">
        <div className="max-w-none px-6 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all bg-zinc-900">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 hidden sm:inline">
              Olivetti Score
            </span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao início</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="z-10 flex-1 max-w-none w-full px-6 md:px-8 py-8 space-y-6">
        
        {/* LEAGUE HERO BANNER */}
        <section className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/15 transition-all" />
          
          {/* Logo da Liga / Bandeira */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-zinc-950 border border-zinc-850 p-4 md:p-6 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
            {leagueDetails.logo_url && leagueDetails.logo_url !== 'no_logo' ? (
              <img src={leagueDetails.logo_url} alt={`${leagueDetails.name} Logo`} className="w-full h-full object-contain" />
            ) : getFlagUrl(leagueDetails.country) ? (
              <img src={getFlagUrl(leagueDetails.country)!} alt={leagueDetails.country} className="w-16 md:w-20 object-contain rounded-md" />
            ) : (
              <span className="text-3xl md:text-5xl font-black text-zinc-700">
                {leagueDetails.name.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Nome e País */}
          <div className="text-center md:text-left space-y-2.5">
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-none">
              {leagueDetails.name}
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-bold text-zinc-400">
              {getFlagUrl(leagueDetails.country) && (
                <img 
                  src={getFlagUrl(leagueDetails.country)!} 
                  alt="" 
                  className="w-4 h-2.5 object-cover rounded-sm"
                />
              )}
              <span>{leagueDetails.country || 'Internacional'}</span>
            </div>
          </div>
        </section>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUNA ESQUERDA: Classificações (5/12) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* LEAGUE STANDINGS CARD */}
            <div className="backdrop-blur-md bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-5 shadow-lg space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Tabela Classificativa</span>
              </h3>

              {leagueStandings && leagueStandings.standings ? (
                <div className="border border-zinc-850 rounded-2xl overflow-hidden max-h-[600px] overflow-y-auto pr-0.5">
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

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-900/60 bg-zinc-950/30 text-center z-10 text-xs text-zinc-600">
        <p>&copy; {new Date().getFullYear()} Olivetti Score. Criado no âmbito de Projeto Integrado I.</p>
        <p className="mt-1 text-xxs text-zinc-700">Dados fornecidos em tempo real pela API Bzzoiro Sports.</p>
      </footer>
    </div>
  )
}
