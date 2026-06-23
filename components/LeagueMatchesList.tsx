import Link from 'next/link'
import { Calendar, Clock, Trophy } from 'lucide-react'
import LocalTime from '@/components/LocalTime'
import type { BzzoiroEvent } from '@/services/bzzoiro'

interface LeagueMatchesListProps {
  matches: BzzoiroEvent[]
  kind: 'completed' | 'upcoming'
}

export default function LeagueMatchesList({ matches, kind }: LeagueMatchesListProps) {
  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-850 bg-zinc-950/30 p-10 text-center text-sm font-semibold text-zinc-500">
        {kind === 'upcoming' ? 'Não existem futuros jogos.' : 'Não existem jogos realizados.'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {matches.map((event) => (
        <Link
          key={event.id}
          href={`/jogo/${event.id}`}
          className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-850 bg-zinc-950/30 p-4 transition-all hover:border-indigo-500/35 hover:bg-zinc-900/30 md:grid-cols-[1fr_auto_1fr]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-850 bg-black/30 p-2">
              {event.home_team.logo ? (
                <img src={event.home_team.logo} alt="" className="h-full w-full object-contain" />
              ) : (
                <Trophy className="h-4 w-4 text-zinc-600" />
              )}
            </span>
            <span className="truncate text-sm font-black text-zinc-200">{event.home_team.name}</span>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-900 bg-black/20 px-4 py-2 md:min-w-44 md:justify-center">
            <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500">
              {kind === 'completed' ? <Calendar className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              <LocalTime utcDateString={event.date} />
            </span>
            {kind === 'completed' ? (
              <span className="font-mono text-lg font-black text-indigo-300">
                {event.score.home ?? '-'}-{event.score.away ?? '-'}
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">Agendado</span>
            )}
          </div>

          <div className="flex items-center gap-3 min-w-0 md:justify-end">
            <span className="truncate text-sm font-black text-zinc-200 md:text-right">{event.away_team.name}</span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-850 bg-black/30 p-2">
              {event.away_team.logo ? (
                <img src={event.away_team.logo} alt="" className="h-full w-full object-contain" />
              ) : (
                <Trophy className="h-4 w-4 text-zinc-600" />
              )}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

