import { createAdminClient } from '@/utils/supabase/admin'
import { bzzoiroService } from './bzzoiro'
import { generateLeagueStats, type PlayerStats } from '@/utils/statsGenerator'

type TeamEntry = {
  team_id: number
  team_name: string
  position?: number
}

type PlayerProfile = {
  name: string
  position: string
  teamId: number | null
  teamName: string
}

type StandingRow = {
  team_id?: number
  team_name?: string
  position?: number
}

type StandingsResponse = {
  grouped?: boolean
  groups?: Record<string, StandingRow[]>
  standings?: StandingRow[]
} | null

type EventTeam = {
  id?: number
  name: string
}

type FinishedEvent = {
  id: number
  home_team?: EventTeam
  away_team?: EventTeam
}

type SquadPlayer = {
  player_id?: number
  id?: number
  name: string
  position?: string
}

type EventPlayerStat = {
  player_id?: number
  goals?: number
  goal_assist?: number
  accurate_pass?: number
  yellow_card?: number
  red_card?: number
}

type UpsertPlayerStatRow = {
  league_id: number
  team_id: number | null
  player_id: number
  player_name: string
  position: string
  goals: number
  assists: number
  passes: number
  yellow_cards: number
  red_cards: number
  updated_at: string
}

function addStandingsTeams(standings: StandingsResponse, teamsMap: Map<number, TeamEntry>) {
  const addRows = (rows: StandingRow[]) => {
    rows.forEach((row) => {
      if (!row.team_id || !row.team_name) return

      teamsMap.set(row.team_id, {
        team_id: row.team_id,
        team_name: row.team_name,
        position: row.position
      })
    })
  }

  if (standings?.grouped && standings.groups) {
    Object.values(standings.groups).forEach((rows) => addRows(rows))
  } else if (standings?.standings) {
    addRows(standings.standings)
  }
}

function getFallbackSeasonStart() {
  const fallbackDate = new Date()
  fallbackDate.setFullYear(fallbackDate.getFullYear() - 1)
  return fallbackDate.toISOString().split('T')[0]
}

function flattenGeneratedStats(summary: ReturnType<typeof generateLeagueStats>) {
  const players = new Map<number, PlayerStats>()

  ;[
    summary.topGoals,
    summary.topAssists,
    summary.topPasses,
    summary.topYellowCards,
    summary.topRedCards
  ].forEach((list) => {
    list.forEach((player) => players.set(player.id, player))
  })

  return Array.from(players.values())
}

export const statsSyncService = {
  /**
   * Sincroniza estatísticas de jogadores para todas as ligas ou uma liga específica.
   */
  async syncPlayerStats(targetLeagueId?: number): Promise<{
    leaguesProcessed: number
    playersSynced: number
  }> {
    console.log('[StatsSync] A iniciar sincronização de estatísticas...')
    const supabase = createAdminClient()

    // 1. Obter ligas ativas
    let query = supabase.from('leagues').select('id, name')
    if (targetLeagueId) {
      query = query.eq('id', targetLeagueId)
    }
    const { data: leagues, error: leaguesErr } = await query
    if (leaguesErr || !leagues) {
      throw new Error(`Erro ao obter ligas: ${leaguesErr?.message || 'Nenhuma liga encontrada'}`)
    }

    let leaguesProcessed = 0
    let totalPlayersSynced = 0

    for (const league of leagues) {
      console.log(`[StatsSync] A processar liga: "${league.name}" (ID: ${league.id})...`)
      
      // 2. Obter a classificação quando existir. Competições a eliminar
      // podem não ter tabela, pelo que as equipas também são obtidas dos jogos.
      let standings: StandingsResponse = null
      try {
        standings = await bzzoiroService.getLeagueStandings(league.id)
      } catch {
        console.warn(`[StatsSync] Sem classificação para a liga ${league.id}; a usar as equipas dos jogos.`)
      }

      const teamsMap = new Map<number, TeamEntry>()
      addStandingsTeams(standings, teamsMap)

      // 3. Buscar todos os jogos terminados da competição na época atual.
      console.log(`[StatsSync] A obter jogos da liga...`)
      let events: FinishedEvent[] = []
      try {
        const today = new Date().toISOString().split('T')[0]
        const seasonData = await bzzoiroService.getLeagueCurrentSeason(league.id)
        const seasonStart = seasonData?.season?.start_date || getFallbackSeasonStart()

        if (seasonStart.length === 0) {
          console.error(`[StatsSync] A API não devolveu a data inicial da época da liga ${league.id}.`)
          continue
        }

        events = await bzzoiroService.getEvents(
          {
            league_id: String(league.id),
            date_from: seasonStart,
            date_to: today,
            // A API usa o estado bruto "finished"; "FT" é apenas o valor
            // normalizado internamente pelo frontend.
            status: 'finished'
          },
          { fetchAll: true, enrich: false }
        )
      } catch (err) {
        console.error(`[StatsSync] Erro ao obter jogos da liga ${league.id}:`, err)
      }

      console.log(`[StatsSync] Encontrados ${events.length} jogos terminados para a época atual.`)

      events.forEach((event) => {
        if (event.home_team?.id) {
          teamsMap.set(event.home_team.id, {
            team_id: event.home_team.id,
            team_name: event.home_team.name,
            position: teamsMap.get(event.home_team.id)?.position
          })
        }
        if (event.away_team?.id) {
          teamsMap.set(event.away_team.id, {
            team_id: event.away_team.id,
            team_name: event.away_team.name,
            position: teamsMap.get(event.away_team.id)?.position
          })
        }
      })

      const teamsList = Array.from(teamsMap.values())
      if (teamsList.length === 0) continue

      const teamRows = teamsList
        .filter((team) => team.team_id && team.team_name)
        .map((team) => ({
          id: team.team_id,
          name: team.team_name,
          updated_at: new Date().toISOString()
        }))

      if (teamRows.length > 0) {
        const { error: teamsUpsertErr } = await supabase
          .from('teams')
          .upsert(teamRows, { onConflict: 'id' })

        if (teamsUpsertErr) {
          console.error(`[StatsSync] Erro ao garantir equipas da liga ${league.id}:`, teamsUpsertErr.message)
        }
      }

      // 4. Buscar os plantéis para construir o mapa ID -> jogador.
      console.log(`[StatsSync] A buscar plantéis para ${teamsList.length} equipas...`)
      const playerMap = new Map<number, PlayerProfile>()
      const squads: Parameters<typeof generateLeagueStats>[0] = []

      await Promise.all(teamsList.map(async (team) => {
        try {
          const squadData = await bzzoiroService.getTeamSquad(team.team_id)
          const players: SquadPlayer[] = squadData.players || []
          squads.push({
            teamId: team.team_id,
            teamName: team.team_name,
            players
          })

          players.forEach((player) => {
            const playerId = player.player_id || player.id
            if (playerId) {
              playerMap.set(playerId, {
                name: player.name,
                position: player.position || 'M',
                teamId: team.team_id,
                teamName: team.team_name
              })
            }
          })
        } catch (err) {
          console.error(`[StatsSync] Erro ao buscar plantel da equipa ${team.team_id}:`, err)
        }
      }))

      console.log(`[StatsSync] Mapa de jogadores construído com ${playerMap.size} registos.`)

      // 5. Agregar as estatísticas dos jogadores a partir dos jogos terminados
      // Fazemos pedidos em paralelo controlando a concorrência por lotes
      const playerStatsAcc = new Map<number, {
        goals: number
        assists: number
        passes: number
        yellowCards: number
        redCards: number
      }>()

      const chunkSize = 15
      console.log(`[StatsSync] A processar estatísticas dos jogadores por lotes de ${chunkSize}...`)
      
      for (let i = 0; i < events.length; i += chunkSize) {
        const chunk = events.slice(i, i + chunkSize)
        const chunkPromises = chunk.map(async (match) => {
          try {
            const statsData = await bzzoiroService.getEventPlayerStats(match.id)
            const playerStats: EventPlayerStat[] = statsData?.player_stats || []
            playerStats.forEach((ps) => {
              const playerId = ps.player_id
              if (!playerId) return

              const existing = playerStatsAcc.get(playerId) || {
                goals: 0,
                assists: 0,
                passes: 0,
                yellowCards: 0,
                redCards: 0
              }

              playerStatsAcc.set(playerId, {
                goals: existing.goals + (ps.goals || 0),
                assists: existing.assists + (ps.goal_assist || 0),
                passes: existing.passes + (ps.accurate_pass || 0), // ou total_pass se preferir
                yellowCards: existing.yellowCards + (ps.yellow_card || 0),
                redCards: existing.redCards + (ps.red_card || 0)
              })
            })
          } catch (err) {
            console.error(`[StatsSync] Erro ao processar estatísticas do jogo ${match.id}:`, err)
          }
        })

        await Promise.all(chunkPromises)
      }

      console.log(`[StatsSync] Estatísticas agregadas para ${playerStatsAcc.size} jogadores. A preparar gravação...`)

      // 6. Preparar os dados para upsert no Supabase
      // Identificar jogadores em falta no playerMap que possuem estatísticas relevantes
      const missingPlayerIds: number[] = []
      playerStatsAcc.forEach((stats, playerId) => {
        const playerProfile = playerMap.get(playerId)
        if (
          !playerProfile &&
          (stats.goals > 0 || stats.assists > 0 || stats.passes > 50 || stats.yellowCards > 0 || stats.redCards > 0)
        ) {
          missingPlayerIds.push(playerId)
        }
      })

      if (missingPlayerIds.length > 0) {
        console.log(`[StatsSync] A obter perfis de ${missingPlayerIds.length} jogadores em falta na API...`)
        const batchSize = 10
        for (let i = 0; i < missingPlayerIds.length; i += batchSize) {
          const batch = missingPlayerIds.slice(i, i + batchSize)
          const batchPromises = batch.map(async (playerId) => {
            try {
              const p = await bzzoiroService.getPlayerDetails(playerId)
              if (p && p.name) {
                playerMap.set(playerId, {
                  name: p.name,
                  position: p.position || 'M',
                  teamId: p.current_team_id || null,
                  teamName: 'Equipa Desconhecida'
                })
              }
            } catch (err) {
              console.error(`[StatsSync] Erro ao obter detalhes do jogador ${playerId}:`, err)
            }
          })
          await Promise.all(batchPromises)
        }
      }

      const upsertRows: UpsertPlayerStatRow[] = []
      playerStatsAcc.forEach((stats, playerId) => {
        const playerProfile = playerMap.get(playerId)
        
        // Se o jogador estiver no mapa do plantel ou se tiver estatísticas acumuladas relevantes
        if (playerProfile || stats.goals > 0 || stats.assists > 0) {
          upsertRows.push({
            league_id: league.id,
            team_id: playerProfile?.teamId || null,
            player_id: playerId,
            player_name: playerProfile?.name || `Jogador #${playerId}`,
            position: playerProfile?.position || 'M',
            goals: stats.goals,
            assists: stats.assists,
            passes: stats.passes,
            yellow_cards: stats.yellowCards,
            red_cards: stats.redCards,
            updated_at: new Date().toISOString()
          })
        }
      })

      if (upsertRows.length === 0 && squads.length > 0) {
        console.log(`[StatsSync] Sem estatisticas reais para a liga ${league.id}; a gerar fallback a partir dos planteis.`)
        const teamRankMap = teamsList.reduce<Record<number, number>>((acc, team, index) => {
          acc[team.team_id] = team.position || index + 1
          return acc
        }, {})
        const generatedPlayers = flattenGeneratedStats(generateLeagueStats(squads, teamRankMap, league.id))

        generatedPlayers.forEach((player) => {
          const team = teamsList.find((item) => item.team_name === player.teamName)

          upsertRows.push({
            league_id: league.id,
            team_id: team?.team_id || null,
            player_id: player.id,
            player_name: player.name,
            position: player.position,
            goals: player.goals,
            assists: player.assists,
            passes: player.passes,
            yellow_cards: player.yellowCards,
            red_cards: player.redCards,
            updated_at: new Date().toISOString()
          })
        })
      }

      // 7. Upsert em lotes de 200 no Supabase
      if (upsertRows.length > 0) {
        console.log(`[StatsSync] A gravar ${upsertRows.length} estatísticas no Supabase...`)
        for (let i = 0; i < upsertRows.length; i += 200) {
          const batch = upsertRows.slice(i, i + 200)
          const { error: upsertErr } = await supabase
            .from('player_stats')
            .upsert(batch, { onConflict: 'league_id,player_id' })

          if (upsertErr) {
            console.error(`[StatsSync] Erro ao fazer upsert no Supabase (lote ${i}):`, upsertErr.message)
          }
        }
        totalPlayersSynced += upsertRows.length
      }

      leaguesProcessed++
    }

    console.log(`[StatsSync] Concluído! Ligas processadas: ${leaguesProcessed}, Registos gravados: ${totalPlayersSynced}`)
    return { leaguesProcessed, playersSynced: totalPlayersSynced }
  }
}
