import Link from 'next/link'
import { bzzoiroService, BzzoiroEvent } from '@/services/bzzoiro'
import { AlertTriangle, Code, Play, CheckCircle, Clock } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function TestApiPage({ searchParams }: PageProps) {
  const { filter = 'today' } = await searchParams
  const isLiveFilter = filter === 'live'

  let events: BzzoiroEvent[] = []
  let rawJson: any = null
  let errorMsg: string | null = null

  try {
    if (isLiveFilter) {
      events = await bzzoiroService.getLiveEvents()
    } else {
      // Get today's events
      const todayStr = new Date().toISOString().split('T')[0]
      events = await bzzoiroService.getEvents({
        date_from: todayStr,
        date_to: todayStr,
      })
    }
    rawJson = events;
  } catch (error: any) {
    errorMsg = error.message || 'Erro desconhecido ao obter dados.'
  }

  // Helper to render match status badges
  const getStatusBadge = (event: BzzoiroEvent) => {
    const { status, minute, date } = event
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-pulse">
            <Play className="w-3 h-3 fill-red-400" />
            <span>{minute != null ? `${minute}'` : 'AO VIVO'}</span>
          </span>
        )
      case 'HT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold animate-pulse">
            <Clock className="w-3 h-3" />
            <span>Intervalo</span>
          </span>
        )
      case 'FT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            <span>Terminado</span>
          </span>
        )
      default: {
        // Mostra data e hora do jogo para jogos agendados
        const matchDate = new Date(date)
        const dataHora = `${matchDate.toLocaleDateString('pt-PT', {
          day: '2-digit',
          month: '2-digit',
          timeZone: 'Europe/Lisbon'
        })}, ${matchDate.toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Lisbon'
        })}`
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
            <Clock className="w-3 h-3" />
            <span>{dataHora}</span>
          </span>
        )
      }
    }
  }

  return (
    <div className="relative min-h-screen bg-radial from-zinc-900 to-black text-zinc-100 flex flex-col justify-start">
      
      {/* Background abstract glowing shapes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />


      {/* Main Container */}
      <main className="z-10 flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        
        {/* Toggle Filters */}
        <div className="flex p-1 bg-zinc-950 border border-zinc-800 rounded-xl max-w-xs">
          <Link
            href="/dashboard/test-api?filter=today"
            className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
              !isLiveFilter 
                ? 'bg-zinc-800 text-white shadow' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Jogos de Hoje
          </Link>
          <Link
            href="/dashboard/test-api?filter=live"
            className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
              isLiveFilter 
                ? 'bg-zinc-800 text-white shadow' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Ao Vivo (Live)
          </Link>
        </div>

        {/* Error Handling */}
        {errorMsg ? (
          <div className="backdrop-blur-xl bg-red-950/20 border border-red-900/30 rounded-3xl p-8 shadow-xl flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-12 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 shadow">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-red-400">Falha ao Ligar à API Bzzoiro</h3>
            <p className="text-zinc-400 mt-2 text-sm max-w-md">
              Verificámos um problema ao tentar obter os dados reais de futebol. Isto acontece geralmente se o token estiver em falta ou inválido.
            </p>
            <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 text-left w-full mt-6 text-xs font-mono text-zinc-300 overflow-x-auto">
              <span className="text-red-400">Erro retornado:</span> {errorMsg}
            </div>
            <div className="text-zinc-500 text-xs mt-6">
              Certifica-te de que criaste o ficheiro <span className="font-mono text-zinc-400">.env.local</span> com a chave <span className="font-mono text-indigo-400">BZZOIRO_API_KEY</span>.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Visual matches list (Left panel) */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow flex flex-col h-full">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                  <Play className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                  <span>Listagem Visual (Equivalente Flashscore)</span>
                </h3>

                {events.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-zinc-500">
                    <p className="text-sm font-semibold">Nenhum jogo encontrado</p>
                    <p className="text-xs mt-1">Não existem eventos agendados para este filtro no momento.</p>
                  </div>
                ) : (
                  <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
                    {events.map((event) => (
                      <div key={event.id} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-850 hover:border-zinc-700 transition-all flex flex-col gap-3 group">
                        
                        {/* League Header */}
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-2 text-xs text-zinc-400 font-medium">
                          <span className="flex items-center gap-1.5">
                            <span>{event.league?.name ?? `Liga #${event.league?.id}`}</span>
                            {event.league?.country && (
                              <span className="text-zinc-600">· {event.league.country}</span>
                            )}
                          </span>
                          {getStatusBadge(event)}
                        </div>

                        {/* Match Teams & Score */}
                        <div className="flex items-center justify-between gap-4 py-2">
                          <div className="flex flex-col gap-3 flex-1 text-sm font-semibold">
                            <div className="flex items-center gap-3 text-zinc-200">
                              {event.home_team?.logo && (
                                <img src={event.home_team.logo} alt="" className="w-5 h-5 object-contain" />
                              )}
                              <span>{event.home_team?.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-zinc-200">
                              {event.away_team?.logo && (
                                <img src={event.away_team.logo} alt="" className="w-5 h-5 object-contain" />
                              )}
                              <span>{event.away_team?.name}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 text-right font-black text-lg text-indigo-400 select-none">
                            <div>{event.score?.home ?? '-'}</div>
                            <div>{event.score?.away ?? '-'}</div>
                          </div>
                        </div>

                        {/* Prediction probabilities (ML) if available */}
                        {event.predictions && (
                          <div className="mt-2 pt-2 border-t border-zinc-900 flex items-center justify-between text-xxs text-zinc-500 font-medium bg-zinc-900/10 p-2 rounded-lg">
                            <span>Previsões ML (CatBoost):</span>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-emerald-400">1: {Math.round((event.predictions.home_win_prob || 0) * 100)}%</span>
                              <span className="text-zinc-400">X: {Math.round((event.predictions.draw_prob || 0) * 100)}%</span>
                              <span className="text-purple-400">2: {Math.round((event.predictions.away_win_prob || 0) * 100)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RAW JSON inspection panel (Right panel) */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow flex flex-col h-full">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                  <Code className="w-4 h-4 text-purple-400" />
                  <span>Dados Brutos (Raw JSON da API Bzzoiro)</span>
                </h3>
                
                <div className="flex-1 min-h-0 bg-zinc-950 rounded-xl p-4 border border-zinc-850 font-mono text-xs overflow-auto max-h-[70vh] text-indigo-400 scrollbar-thin select-all">
                  <pre>{JSON.stringify(rawJson, null, 2)}</pre>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-800/40 text-center z-10">
        <p className="text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} Olivetti Score. Inspetor Bzzoiro Sports Data.
        </p>
      </footer>

    </div>
  )
}
