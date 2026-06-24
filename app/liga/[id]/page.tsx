import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { bzzoiroService } from '@/services/bzzoiro'
import { getFlagUrl } from '@/utils/flags'
import { getLeagueLogoUrl } from '@/utils/leagueLogo'
import { getTeamsLogos } from '@/services/logoService'
import LeagueTabs from '@/components/LeagueTabs'
import StarButton from '@/components/favorites/StarButton'
import { statsSyncService } from '@/services/statsSync'
import { getLeagueMatches, getLeagueSeasonMatches } from '@/utils/leagueMatches'
import type { LeagueStatsSummary, PlayerStats } from '@/utils/statsGenerator'

interface PageProps {
  params: Promise<{ id: string }>
}

export const revalidate = 60 // Revalidar a cada minuto

const emptyStatsSummary = (): LeagueStatsSummary => ({
  topGoals: [],
  topAssists: [],
  topPasses: [],
  topYellowCards: [],
  topRedCards: []
})

function summarizePlayerStats(dbStats: any[] | null): LeagueStatsSummary {
  if (!dbStats?.length) return emptyStatsSummary()

  const mappedStats: PlayerStats[] = dbStats.map((stat: any) => ({
    id: Number(stat.player_id),
    name: stat.player_name,
    position: stat.position || 'M',
    teamName: stat.teams?.name || 'Equipa Desconhecida',
    goals: stat.goals,
    assists: stat.assists,
    passes: stat.passes,
    yellowCards: stat.yellow_cards,
    redCards: stat.red_cards
  }))

  return {
    topGoals: [...mappedStats].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)).slice(0, 10),
    topAssists: [...mappedStats].sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name)).slice(0, 10),
    topPasses: [...mappedStats].sort((a, b) => b.passes - a.passes || a.name.localeCompare(b.name)).slice(0, 10),
    topYellowCards: [...mappedStats].sort((a, b) => b.yellowCards - a.yellowCards || a.name.localeCompare(b.name)).slice(0, 10),
    topRedCards: [...mappedStats].sort((a, b) => b.redCards - a.redCards || b.yellowCards - a.yellowCards || a.name.localeCompare(b.name)).slice(0, 10)
  }
}

async function enrichStandingsWithLogos(standings: any) {
  if (!standings) return standings

  const rows: any[] = standings.grouped && standings.groups
    ? Object.values(standings.groups).flatMap((groupRows: any) => Array.isArray(groupRows) ? groupRows : [])
    : Array.isArray(standings.standings)
      ? standings.standings
      : []

  const teams = rows
    .filter((row) => row.team_id && row.team_name)
    .map((row) => ({ id: Number(row.team_id), name: row.team_name }))

  if (teams.length === 0) return standings

  try {
    const logoMap = await getTeamsLogos(teams)
    const addLogo = (row: any) => ({
      ...row,
      team_logo: logoMap[Number(row.team_id)]
    })

    if (standings.grouped && standings.groups) {
      return {
        ...standings,
        groups: Object.fromEntries(
          Object.entries(standings.groups).map(([groupName, groupRows]: [string, any]) => [
            groupName,
            Array.isArray(groupRows) ? groupRows.map(addLogo) : groupRows
          ])
        )
      }
    }

    if (Array.isArray(standings.standings)) {
      return {
        ...standings,
        standings: standings.standings.map(addLogo)
      }
    }
  } catch (err) {
    console.error('Erro ao obter logos das equipas da classificação:', err)
  }

  return standings
}

export default async function LeagueDetailsPage({ params }: PageProps) {
  const { id } = await params
  const leagueId = Number(id)

  if (isNaN(leagueId)) {
    notFound()
  }

  // 1. Procurar detalhes da liga na base de dados (Supabase)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: leagueDetails } = await supabase
    .from('leagues')
    .select('id, name, country, logo_url')
    .eq('id', leagueId)
    .maybeSingle()

  if (!leagueDetails) {
    notFound()
  }

  let isLeagueFav = false
  if (user) {
    const { data: favData } = await supabase
      .from('favorite_leagues')
      .select('id')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .maybeSingle()
    isLeagueFav = !!favData
  }

  const leagueLogoUrl = getLeagueLogoUrl({
    id: leagueId,
    name: leagueDetails.name,
    country: leagueDetails.country,
    logoUrl: leagueDetails.logo_url
  })

  // 2. Obter classificação da liga da API Bzzoiro
  let leagueStandings = null
  try {
    leagueStandings = await enrichStandingsWithLogos(await bzzoiroService.getLeagueStandings(leagueId))
  } catch (err) {
    console.error('Erro ao obter classificações da liga:', err)
  }

  // 3. Obter jogos realizados e futuros da liga na época atual.
  let completedMatches: any[] = []
  let upcomingMatches: any[] = []
  let seasonMatches: any[] = []
  try {
    const [allCompletedMatches, allUpcomingMatches, allSeasonMatches] = await Promise.all([
      getLeagueMatches(leagueId, 'completed').catch(() => []),
      getLeagueMatches(leagueId, 'upcoming').catch(() => []),
      getLeagueSeasonMatches(leagueId).catch(() => [])
    ])

    completedMatches = allCompletedMatches.slice(0, 5)
    upcomingMatches = allUpcomingMatches.slice(0, 5)
    seasonMatches = allSeasonMatches
  } catch (err) {
    console.error('Erro ao obter jogos da liga:', err)
  }

  // 4. Obter as estatísticas reais de jogadores da base de dados (Supabase)
  let statsSummary = emptyStatsSummary()

  try {
    let { data: dbStats, error: statsError } = await supabase
      .from('player_stats')
      .select('*, teams(name)')
      .eq('league_id', leagueId)

    if (statsError) throw statsError

    // Uma liga ainda não sincronizada deixa a aba vazia. Nesse caso, obtém
    // os dados reais da Bzzoiro, persiste-os e volta a ler o resumo.
    if (!dbStats?.length) {
      await statsSyncService.syncPlayerStats(leagueId)

      const refreshed = await supabase
        .from('player_stats')
        .select('*, teams(name)')
        .eq('league_id', leagueId)

      if (refreshed.error) throw refreshed.error
      dbStats = refreshed.data
    }

    statsSummary = summarizePlayerStats(dbStats)
  } catch (err) {
    console.error('Erro ao obter ou sincronizar estatísticas de jogadores:', err)
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-950 to-black text-zinc-100 flex flex-col font-sans">
      
      {/* Background glowing shapes */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <main className="z-10 flex-1 max-w-none w-full px-6 md:px-8 py-8 space-y-6">
        
        {/* LEAGUE HERO BANNER */}
        <section className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/15 transition-all" />
          
          {/* Logo da Liga / Bandeira */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-zinc-950 border border-zinc-850 p-4 md:p-6 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
            <img src={leagueLogoUrl} alt={`${leagueDetails.name} Logo`} className="w-full h-full object-contain" />
          </div>

          {/* Nome e País */}
          <div className="text-center md:text-left space-y-2.5">
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-none">
                {leagueDetails.name}
              </h1>
              {user && (
                <StarButton
                  type="league"
                  id={leagueId}
                  name={leagueDetails.name}
                  country={leagueDetails.country}
                  isFavorited={isLeagueFav}
                  className="bg-zinc-950/60 border border-zinc-850 hover:bg-zinc-900"
                />
              )}
            </div>
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

        <LeagueTabs
          leagueId={leagueId}
          leagueStandings={leagueStandings}
          completedMatches={completedMatches}
          upcomingMatches={upcomingMatches}
          seasonMatches={seasonMatches}
          statsSummary={statsSummary}
        />

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-zinc-900/60 bg-zinc-950/30 text-center z-10 text-xs text-zinc-600">
        <p>&copy; {new Date().getFullYear()} Olivetti Score. Criado no âmbito de Projeto Integrado I.</p>
        <p className="mt-1 text-xxs text-zinc-700">Dados fornecidos em tempo real pela API Bzzoiro Sports.</p>
      </footer>
    </div>
  )
}
