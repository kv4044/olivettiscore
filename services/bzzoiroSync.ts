import { bzzoiroService } from './bzzoiro'
import { createAdminClient } from '@/utils/supabase/admin'

export const bzzoiroSyncService = {
  /**
   * Obtém jogos num intervalo de tempo (7 dias atrás até 7 dias no futuro),
   * extrai equipas e ligas únicas e atualiza-as na base de dados do Supabase.
   */
  async syncLeaguesAndTeams(): Promise<{
    leaguesSynced: number
    teamsSynced: number
  }> {
    // 1. Calcular intervalo de datas: -7 dias a +7 dias
    const now = new Date()
    const fromDateObj = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const toDateObj = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const date_from = fromDateObj.toISOString().split('T')[0]
    const date_to = toDateObj.toISOString().split('T')[0]

    // 2. Procurar eventos na API Bzzoiro
    const events = await bzzoiroService.getEvents({ date_from, date_to })

    // 3. Extrair Ligas e Equipas únicas
    const leaguesMap = new Map<number, { id: number; name: string; country: string | null }>()
    const teamsMap = new Map<number, { id: number; name: string }>()

    events.forEach((event) => {
      // Extrair Liga
      if (event.league && event.league.id) {
        leaguesMap.set(event.league.id, {
          id: event.league.id,
          name: event.league.name,
          country: event.league.country || null,
        })
      }

      // Extrair Equipa de Casa
      if (event.home_team && event.home_team.id) {
        teamsMap.set(event.home_team.id, {
          id: event.home_team.id,
          name: event.home_team.name,
        })
      }

      // Extrair Equipa de Fora
      if (event.away_team && event.away_team.id) {
        teamsMap.set(event.away_team.id, {
          id: event.away_team.id,
          name: event.away_team.name,
        })
      }
    })

    const leaguesToUpsert = Array.from(leaguesMap.values()).map((l) => ({
      id: l.id,
      name: l.name,
      country: l.country,
      updated_at: new Date().toISOString(),
    }))

    const teamsToUpsert = Array.from(teamsMap.values()).map((t) => ({
      id: t.id,
      name: t.name,
      updated_at: new Date().toISOString(),
    }))

    if (leaguesToUpsert.length === 0 && teamsToUpsert.length === 0) {
      return { leaguesSynced: 0, teamsSynced: 0 }
    }

    // 4. Inicializar o cliente Supabase administrativo (ignora o RLS para escrita)
    const supabase = createAdminClient()

    // 5. Inserir/Atualizar Ligas
    let leaguesSynced = 0
    if (leaguesToUpsert.length > 0) {
      const { error: leagueError } = await supabase
        .from('leagues')
        .upsert(leaguesToUpsert, { onConflict: 'id' })

      if (leagueError) {
        throw new Error(`Erro ao sincronizar ligas no Supabase: ${leagueError.message}`)
      }
      leaguesSynced = leaguesToUpsert.length
    }

    // 6. Inserir/Atualizar Equipas
    let teamsSynced = 0
    if (teamsToUpsert.length > 0) {
      const { error: teamError } = await supabase
        .from('teams')
        .upsert(teamsToUpsert, { onConflict: 'id' })

      if (teamError) {
        throw new Error(`Erro ao sincronizar equipas no Supabase: ${teamError.message}`)
      }
      teamsSynced = teamsToUpsert.length
    }

    return { leaguesSynced, teamsSynced }
  }
}
