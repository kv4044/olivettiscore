import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import LeagueMatchesList from '@/components/LeagueMatchesList'
import { bzzoiroService } from '@/services/bzzoiro'
import { getTeamsLogos } from '@/services/logoService'
import { getFlagUrl } from '@/utils/flags'
import { getTeamMatches } from '@/utils/teamMatches'

interface PageProps {
  params: Promise<{ id: string }>
}

export const revalidate = 60

export default async function TeamUpcomingMatchesPage({ params }: PageProps) {
  const { id } = await params
  const teamId = Number(id)

  if (isNaN(teamId)) {
    notFound()
  }

  let teamDetails
  try {
    teamDetails = await bzzoiroService.getTeamDetails(teamId)
  } catch {
    notFound()
  }

  if (!teamDetails?.name) {
    notFound()
  }

  const matches = await getTeamMatches(teamId, 'upcoming').catch(() => [])
  const logos: Record<number, string> = await getTeamsLogos([{ id: teamId, name: teamDetails.name }])
    .catch(() => ({}))
  const teamLogo = logos[teamId] || null
  const initials = teamDetails.short_name?.substring(0, 2).toUpperCase() || teamDetails.name.substring(0, 2).toUpperCase()

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 to-black px-6 py-8 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href={`/equipa/${teamId}`} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-purple-300">
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar a equipa</span>
        </Link>

        <section className="flex flex-col gap-5 rounded-3xl border border-zinc-800 bg-zinc-900/35 p-6 shadow-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-zinc-850 bg-zinc-950 p-3">
              {teamLogo && teamLogo !== 'no_logo' ? (
                <img src={teamLogo} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-lg font-black text-zinc-700">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black tracking-tight text-white">Jogos Futuros</h1>
              <div className="mt-2 flex items-center gap-2 text-xs font-bold text-zinc-400">
                {getFlagUrl(teamDetails.country) && <img src={getFlagUrl(teamDetails.country)!} alt="" className="h-2.5 w-4 rounded-sm object-cover" />}
                <span>{teamDetails.name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-purple-300">
            <Clock className="h-4 w-4" />
            <span>{matches.length} jogos</span>
          </div>
        </section>

        <LeagueMatchesList matches={matches} kind="upcoming" />
      </div>
    </main>
  )
}
