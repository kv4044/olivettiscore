import { createAdminClient } from '@/utils/supabase/admin'
import { bzzoiroService } from './bzzoiro'

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
      let standings = null
      try {
        standings = await bzzoiroService.getLeagueStandings(league.id)
      } catch (err) {
        console.warn(`[StatsSync] Sem classificação para a liga ${league.id}; a usar as equipas dos jogos.`)
      }

      const teamsMap = new Map<number, string>()
      if (standings?.grouped && standings.groups) {
        Object.entries(standings.groups).forEach(([_, rows]: [string, any]) => {
          rows.forEach((row: any) => {
            teamsMap.set(row.team_id, row.team_name)
          })
        })
      } else if (standings?.standings) {
        standings.standings.forEach((row: any) => {
          teamsMap.set(row.team_id, row.team_name)
        })
      }

      // 3. Buscar todos os jogos terminados da competição na época atual.
      console.log(`[StatsSync] A obter jogos da liga...`)
      let events: any[] = []
      try {
        const today = new Date().toISOString().split('T')[0]
        const seasonData = await bzzoiroService.getLeagueCurrentSeason(league.id)
        const seasonStart = seasonData?.season?.start_date

        if (!seasonStart) {
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
        continue
      }

      console.log(`[StatsSync] Encontrados ${events.length} jogos terminados para a época atual.`)

      if (events.length === 0) continue

      events.forEach((event) => {
        if (event.home_team?.id) teamsMap.set(event.home_team.id, event.home_team.name)
        if (event.away_team?.id) teamsMap.set(event.away_team.id, event.away_team.name)
      })

      const teamsList = Array.from(teamsMap, ([team_id, team_name]) => ({ team_id, team_name }))
      if (teamsList.length === 0) continue

      // 4. Buscar os plantéis para construir o mapa ID -> jogador.
      console.log(`[StatsSync] A buscar plantéis para ${teamsList.length} equipas...`)
      const playerMap = new Map<number, { name: string; position: string; teamId: number; teamName: string }>()

      await Promise.all(teamsList.map(async (team) => {
        try {
          const squadData = await bzzoiroService.getTeamSquad(team.team_id)
          const players = squadData.players || []
          players.forEach((player: any) => {
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
            const playerStats = statsData?.player_stats || []
            playerStats.forEach((ps: any) => {
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

      const upsertRows: any[] = []
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
